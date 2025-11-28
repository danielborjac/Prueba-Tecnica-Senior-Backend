const request = require('supertest');
const app = require('../../src/index');
const db = require('../../src/db');

// Variables globales para el test
let createdCustomerId;
const testEmail = `test-${Date.now()}@example.com`;

describe('Customers API - Integration Tests', () => {
  
  // Cerrar conexión a DB después de todos los tests
  afterAll(async () => {
    await db.end();
  });

  describe('POST /customers', () => {
    it('should create a new customer', async () => {
      const response = await request(app)
        .post('/customers')
        .send({
          name: 'Test Customer',
          email: testEmail,
          phone: '+1-555-9999'
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Test Customer');
      expect(response.body.data.email).toBe(testEmail);
      expect(response.body.data.phone).toBe('+1-555-9999');

      // Guardar ID para otros tests
      createdCustomerId = response.body.data.id;
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/customers')
        .send({
          email: 'test@example.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 409 when email already exists', async () => {
      await request(app)
        .post('/customers')
        .send({
          name: 'Duplicate Test',
          email: testEmail
        })
        .expect(409);
    });
  });

  describe('GET /customers/:id', () => {
    it('should get customer by id', async () => {
      const response = await request(app)
        .get(`/customers/${createdCustomerId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdCustomerId);
      expect(response.body.data.email).toBe(testEmail);
    });

    it('should return 404 for non-existent customer', async () => {
      await request(app)
        .get('/customers/999999')
        .expect(404);
    });
  });

  describe('GET /customers (search)', () => {
    it('should list customers with pagination', async () => {
      const response = await request(app)
        .get('/customers?limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('hasMore');
    });

    it('should search customers by name', async () => {
      const response = await request(app)
        .get(`/customers?search=Test&limit=5`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('PUT /customers/:id', () => {
    it('should update customer', async () => {
      const response = await request(app)
        .put(`/customers/${createdCustomerId}`)
        .send({
          phone: '+1-555-8888'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe('+1-555-8888');
    });

    it('should return 404 for non-existent customer', async () => {
      await request(app)
        .put('/customers/999999')
        .send({
          phone: '+1-555-7777'
        })
        .expect(404);
    });
  });

  describe('DELETE /customers/:id', () => {
    it('should soft delete customer', async () => {
      const response = await request(app)
        .delete(`/customers/${createdCustomerId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Customer deleted successfully');

      // Verificar que ya no se puede obtener
      await request(app)
        .get(`/customers/${createdCustomerId}`)
        .expect(404);
    });
  });

  describe('GET /internal/customers/:id', () => {
    it('should return 401 without token', async () => {
      await request(app)
        .get('/customers/internal/1')
        .expect(401);
    });

    it('should get customer with valid service token', async () => {
      const response = await request(app)
        .get('/customers/internal/1')
        .set('Authorization', `Bearer ${process.env.SERVICE_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });
  });
});