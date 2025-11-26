const db = require('../db');

// POST /customers
async function createCustomer(req, res) {
  const { name, email, phone } = req.body;
  
  try {
    const [result] = await db.query(
      'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone]
    );
    
    const id = result.insertId;
    const [rows] = await db.query(
      'SELECT id, name, email, phone, created_at FROM customers WHERE id = ?',
      [id]
    );
    
    res.status(201).json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Email already exists'
      });
    }
    console.error('Error creating customer:', err);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
}

// GET /customers/:id
async function getCustomer(req, res) {
  const { id } = req.params;
  
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, phone, created_at FROM customers WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
}

// GET /customers (búsqueda con paginación)
async function searchCustomers(req, res) {
  const { search = '', cursor = '0', limit = '10' } = req.query;
  const parsedCursor = parseInt(cursor, 10) || 0;
  const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100);
  
  try {
    let query = `
      SELECT id, name, email, phone, created_at 
      FROM customers 
      WHERE deleted_at IS NULL AND id > ?
    `;
    const params = [parsedCursor];
    
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    query += ' ORDER BY id ASC LIMIT ?';
    params.push(parsedLimit + 1); // +1 para saber si hay más
    
    const [rows] = await db.query(query, params);
    
    const hasMore = rows.length > parsedLimit;
    const data = hasMore ? rows.slice(0, parsedLimit) : rows;
    const nextCursor = hasMore ? data[data.length - 1].id : null;
    
    res.json({
      success: true,
      data,
      pagination: {
        cursor: parsedCursor,
        limit: parsedLimit,
        nextCursor,
        hasMore
      }
    });
  } catch (err) {
    console.error('Error searching customers:', err);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
}

// PUT /customers/:id
async function updateCustomer(req, res) {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  
  try {
    // Verificar que el cliente existe
    const [existing] = await db.query(
      'SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (!existing.length) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    // Actualizar solo los campos proporcionados
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    params.push(id);
    
    await db.query(
      `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    // Obtener el cliente actualizado
    const [rows] = await db.query(
      'SELECT id, name, email, phone, created_at FROM customers WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Email already exists'
      });
    }
    console.error('Error updating customer:', err);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
}

// DELETE /customers/:id (soft delete)
async function deleteCustomer(req, res) {
  const { id } = req.params;
  
  try {
    const [result] = await db.query(
      'UPDATE customers SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
}

// GET /internal/customers/:id (para Orders API)
async function getCustomerInternal(req, res) {
  const { id } = req.params;
  
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, phone FROM customers WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    console.error('Error fetching customer (internal):', err);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
}

module.exports = {
  createCustomer,
  getCustomer,
  searchCustomers,
  updateCustomer,
  deleteCustomer,
  getCustomerInternal
};