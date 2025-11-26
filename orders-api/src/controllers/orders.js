const db = require('../db');
const { validateCustomer } = require('../services/customersService');

// POST /orders - Crear orden
async function createOrder(req, res) {
  const { customer_id, items, correlation_id } = req.body;
  
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Validar cliente llamando a Customers API
    let customer;
    try {
      customer = await validateCustomer(customer_id);
    } catch (err) {
      await conn.rollback();
      return res.status(err.status || 400).json({
        success: false,
        error: err.message,
        correlationId: correlation_id
      });
    }

    // 2) Verificar stock y calcular totales
    let total = BigInt(0);
    const validatedItems = [];

    for (const item of items) {
      const [rows] = await conn.query(
        'SELECT * FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );

      if (rows.length === 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          error: 'Product not found',
          product_id: item.product_id,
          correlationId: correlation_id
        });
      }

      const product = rows[0];
      
      if (product.stock < item.qty) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          error: 'Insufficient stock',
          product_id: item.product_id,
          available: product.stock,
          requested: item.qty,
          correlationId: correlation_id
        });
      }

      const unit_price = BigInt(product.price_cents);
      const subtotal = unit_price * BigInt(item.qty);
      total += subtotal;

      validatedItems.push({
        product_id: item.product_id,
        qty: item.qty,
        unit_price_cents: unit_price.toString(),
        subtotal_cents: subtotal.toString(),
        name: product.name
      });
    }

    // 3) Crear orden
    const [orderRes] = await conn.query(
      'INSERT INTO orders (customer_id, status, total_cents) VALUES (?, ?, ?)',
      [customer_id, 'CREATED', total.toString()]
    );
    const orderId = orderRes.insertId;

    // 4) Insertar items y descontar stock
    for (const item of validatedItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.qty, item.unit_price_cents, item.subtotal_cents]
      );
      
      await conn.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.qty, item.product_id]
      );
    }

    await conn.commit();

    // 5) Obtener orden completa con items
    const [orderRows] = await db.query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );
    
    const [itemsRows] = await db.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );

    res.status(201).json({
      success: true,
      correlationId: correlation_id,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone
        },
        order: {
          id: orderRows[0].id,
          status: orderRows[0].status,
          total_cents: parseInt(orderRows[0].total_cents),
          created_at: orderRows[0].created_at,
          items: itemsRows.map(it => ({
            product_id: it.product_id,
            qty: it.qty,
            unit_price_cents: parseInt(it.unit_price_cents),
            subtotal_cents: parseInt(it.subtotal_cents)
          }))
        }
      }
    });

  } catch (err) {
    await conn.rollback();
    console.error('Error creating order:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      correlationId: correlation_id
    });
  } finally {
    conn.release();
  }
}

// GET /orders/:id - Obtener orden con items
async function getOrder(req, res) {
  const { id } = req.params;

  try {
    const [orderRows] = await db.query(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    if (!orderRows.length) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const [itemsRows] = await db.query(
      'SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [id]
    );

    const order = orderRows[0];
    
    res.json({
      success: true,
      data: {
        id: order.id,
        customer_id: order.customer_id,
        status: order.status,
        total_cents: parseInt(order.total_cents),
        created_at: order.created_at,
        items: itemsRows.map(it => ({
          id: it.id,
          product_id: it.product_id,
          product_name: it.product_name,
          qty: it.qty,
          unit_price_cents: parseInt(it.unit_price_cents),
          subtotal_cents: parseInt(it.subtotal_cents)
        }))
      }
    });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
}

// GET /orders - Listar órdenes con filtros
async function listOrders(req, res) {
  const { status, from, to, cursor = '0', limit = '10' } = req.query;
  const parsedCursor = parseInt(cursor, 10) || 0;
  const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100);

  try {
    let query = `
      SELECT id, customer_id, status, total_cents, created_at 
      FROM orders 
      WHERE id > ?
    `;
    const params = [parsedCursor];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (from) {
      query += ' AND created_at >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND created_at <= ?';
      params.push(to);
    }

    query += ' ORDER BY id ASC LIMIT ?';
    params.push(parsedLimit + 1);

    const [rows] = await db.query(query, params);

    const hasMore = rows.length > parsedLimit;
    const data = hasMore ? rows.slice(0, parsedLimit) : rows;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    res.json({
      success: true,
      data: data.map(row => ({
        ...row,
        total_cents: parseInt(row.total_cents)
      })),
      pagination: {
        cursor: parsedCursor,
        limit: parsedLimit,
        nextCursor,
        hasMore
      }
    });
  } catch (err) {
    console.error('Error listing orders:', err);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
}

// POST /orders/:id/confirm - Confirmar orden (idempotente)
async function confirmOrder(req, res) {
  const orderId = req.params.id;
  const idempotencyKey = req.headers['x-idempotency-key'];
  const correlationId = req.body.correlation_id;

  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      error: 'X-Idempotency-Key header required',
      correlationId
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Verificar idempotencia
    const [ikRows] = await conn.query(
      'SELECT * FROM idempotency_keys WHERE `key` = ? FOR UPDATE',
      [idempotencyKey]
    );

    if (ikRows.length) {
      const existing = ikRows[0];
      if (existing.status === 'COMPLETED') {
        await conn.commit();
        const savedResponse = JSON.parse(existing.response_body);
        return res.status(200).json({
          ...savedResponse,
          correlationId
        });
      } else if (existing.status === 'IN_PROGRESS') {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          error: 'Request already in progress',
          correlationId
        });
      }
    }

    // 2) Registrar idempotency key como IN_PROGRESS
    await conn.query(
      'INSERT INTO idempotency_keys (`key`, target_type, target_id, status) VALUES (?, ?, ?, ?)',
      [idempotencyKey, 'order_confirm', orderId, 'IN_PROGRESS']
    );

    // 3) Cargar orden
    const [orderRows] = await conn.query(
      'SELECT * FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    );

    if (orderRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        correlationId
      });
    }

    const order = orderRows[0];

    // Si ya está confirmada, devolver éxito
    if (order.status === 'CONFIRMED') {
      const response = {
        success: true,
        message: 'Order already confirmed',
        data: {
          id: order.id,
          status: order.status,
          total_cents: parseInt(order.total_cents),
          created_at: order.created_at
        }
      };

      await conn.query(
        'UPDATE idempotency_keys SET status = ?, response_body = ? WHERE `key` = ?',
        ['COMPLETED', JSON.stringify(response), idempotencyKey]
      );

      await conn.commit();
      return res.json({
        ...response,
        correlationId
      });
    }

    // Si está cancelada, error
    if (order.status === 'CANCELED') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: 'Order is canceled',
        correlationId
      });
    }

    // 4) Confirmar orden
    await conn.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['CONFIRMED', orderId]
    );

    // 5) Obtener orden actualizada con items
    const [updatedOrder] = await conn.query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    const [items] = await conn.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );

    const response = {
      success: true,
      message: 'Order confirmed successfully',
      data: {
        id: updatedOrder[0].id,
        customer_id: updatedOrder[0].customer_id,
        status: updatedOrder[0].status,
        total_cents: parseInt(updatedOrder[0].total_cents),
        created_at: updatedOrder[0].created_at,
        items: items.map(it => ({
          product_id: it.product_id,
          qty: it.qty,
          unit_price_cents: parseInt(it.unit_price_cents),
          subtotal_cents: parseInt(it.subtotal_cents)
        }))
      }
    };

    // 6) Guardar respuesta en idempotency_keys
    await conn.query(
      'UPDATE idempotency_keys SET status = ?, response_body = ? WHERE `key` = ?',
      ['COMPLETED', JSON.stringify(response), idempotencyKey]
    );

    await conn.commit();
    return res.status(200).json({
      ...response,
      correlationId
    });

  } catch (err) {
    await conn.rollback();
    console.error('Error confirming order:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      correlationId
    });
  } finally {
    conn.release();
  }
}

// POST /orders/:id/cancel - Cancelar orden
async function cancelOrder(req, res) {
  const orderId = req.params.id;
  const correlationId = req.body.correlation_id;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Cargar orden
    const [orderRows] = await conn.query(
      'SELECT * FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    );

    if (orderRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        correlationId
      });
    }

    const order = orderRows[0];

    // Si ya está cancelada
    if (order.status === 'CANCELED') {
      await conn.commit();
      return res.json({
        success: true,
        message: 'Order already canceled',
        data: { id: order.id, status: order.status },
        correlationId
      });
    }

    // Regla: CONFIRMED solo se puede cancelar dentro de 10 minutos
    if (order.status === 'CONFIRMED') {
      const createdAt = new Date(order.created_at);
      const now = new Date();
      const diffMinutes = (now - createdAt) / 1000 / 60;

      if (diffMinutes > 10) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          error: 'Cannot cancel confirmed order after 10 minutes',
          correlationId
        });
      }
    }

    // 2) Restaurar stock
    const [items] = await conn.query(
      'SELECT product_id, qty FROM order_items WHERE order_id = ?',
      [orderId]
    );

    for (const item of items) {
      await conn.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.qty, item.product_id]
      );
    }

    // 3) Cancelar orden
    await conn.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['CANCELED', orderId]
    );

    await conn.commit();

    res.json({
      success: true,
      message: 'Order canceled successfully',
      data: {
        id: orderId,
        status: 'CANCELED'
      },
      correlationId
    });

  } catch (err) {
    await conn.rollback();
    console.error('Error canceling order:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      correlationId
    });
  } finally {
    conn.release();
  }
}

module.exports = {
  createOrder,
  getOrder,
  listOrders,
  confirmOrder,
  cancelOrder
};