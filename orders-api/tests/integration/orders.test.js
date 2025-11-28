const request = require('supertest');
const app = require('../../src/index');
const db = require('../../src/db');

// Mock del servicio de customers
jest.mock('../../src/services/customersService', () => ({
  validateCustomer: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '+1-555-0100'
  })
}));

let createdOrderId;
let createdProductId;

describe('Orders API - Integration Tests', () => {
  
  // Cerrar conexión a DB después de todos los tests
  afterAll(async () => {
    await db.end();
  });

  // Crear un producto antes de los tests de órdenes
  beforeAll(async () => {
    const productResponse = await request(app)
      .post('/products')
      .send({
        sku: `TEST-${Date.now()}`,
        name: 'Test Product',
        price_cents: 10000,
        stock: 100
      });
    
    createdProductId = productResponse.body.data.id;
  });

  describe('POST /products', () => {
    it('should create a new product', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          sku: `PROD-${Date.now()}`,
          name: 'New Test Product',
          price_cents: 50000,
          stock: 25
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('New Test Product');
      expect(response.body.data.price_cents).toBe(50000);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app)
        .post('/products')
        .send({
          sku: 'INVALID'
        })
        .expect(400);
    });
  });

  describe('GET /products/:id', () => {
    it('should get product by id', async () => {
      const response = await request(app)
        .get(`/products/${createdProductId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdProductId);
    });

    it('should return 404 for non-existent product', async () => {
      await request(app)
        .get('/products/999999')
        .expect(404);
    });
  });

  describe('PATCH /products/:id', () => {
    it('should update product price and stock', async () => {
      const response = await request(app)
        .patch(`/products/${createdProductId}`)
        .send({
          price_cents: 12000,
          stock: 150
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.price_cents).toBe(12000);
      expect(response.body.data.stock).toBe(150);
    });
  });

  describe('POST /orders', () => {
    it('should create a new order', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          customer_id: 1,
          items: [
            {
              product_id: createdProductId,
              qty: 2
            }
          ],
          correlation_id: 'test-order-001'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order).toHaveProperty('id');
      expect(response.body.data.order.status).toBe('CREATED');
      expect(response.body.data.order.items).toHaveLength(1);

      createdOrderId = response.body.data.order.id;
    });

    it('should return 400 when customer_id is missing', async () => {
      await request(app)
        .post('/orders')
        .send({
          items: [{ product_id: 1, qty: 2 }]
        })
        .expect(400);
    });

    it('should return 400 when items array is empty', async () => {
      await request(app)
        .post('/orders')
        .send({
          customer_id: 1,
          items: []
        })
        .expect(400);
    });
  });

  describe('GET /orders/:id', () => {
    it('should get order by id with items', async () => {
      const response = await request(app)
        .get(`/orders/${createdOrderId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdOrderId);
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app)
        .get('/orders/999999')
        .expect(404);
    });
  });

  describe('GET /orders (list)', () => {
    it('should list orders with pagination', async () => {
      const response = await request(app)
        .get('/orders?limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('limit');
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/orders?status=CREATED&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Verificar que todos tienen status CREATED
      response.body.data.forEach(order => {
        expect(order.status).toBe('CREATED');
      });
    });
  });

  describe('POST /orders/:id/confirm', () => {
    it('should confirm order with idempotency key', async () => {
      const idempotencyKey = `test-confirm-${Date.now()}`;
      
      const response = await request(app)
        .post(`/orders/${createdOrderId}/confirm`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          correlation_id: 'test-confirm-001'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CONFIRMED');
    });

    it('should return same response for repeated idempotency key', async () => {
      const idempotencyKey = `test-repeat-${Date.now()}`;
      
      // Primera llamada
      const response1 = await request(app)
        .post(`/orders/${createdOrderId}/confirm`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({});

      // Segunda llamada con la misma key
      const response2 = await request(app)
        .post(`/orders/${createdOrderId}/confirm`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({});

      // Deben tener el mismo resultado
      expect(response1.body.data.id).toBe(response2.body.data.id);
      expect(response1.body.data.status).toBe(response2.body.data.status);
    });

    it('should return 400 when idempotency key is missing', async () => {
      await request(app)
        .post(`/orders/${createdOrderId}/confirm`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /orders/:id/cancel', () => {
    it('should cancel CREATED order', async () => {
      // Crear una nueva orden para cancelar
      const orderResponse = await request(app)
        .post('/orders')
        .send({
          customer_id: 1,
          items: [{ product_id: createdProductId, qty: 1 }]
        });

      const orderId = orderResponse.body.data.order.id;

      const response = await request(app)
        .post(`/orders/${orderId}/cancel`)
        .send({
          correlation_id: 'test-cancel-001'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CANCELED');
    });

    it('should return 404 for non-existent order', async () => {
      await request(app)
        .post('/orders/999999/cancel')
        .send({})
        .expect(404);
    });
  });
});