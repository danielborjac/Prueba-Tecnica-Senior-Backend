const db = require('../db');

// POST /products
async function createProduct(req, res) {
  const { sku, name, price_cents, stock } = req.body;

  try {
    const [result] = await db.query(
      'INSERT INTO products (sku, name, price_cents, stock) VALUES (?, ?, ?, ?)',
      [sku, name, price_cents, stock || 0]
    );

    const id = result.insertId;
    const [rows] = await db.query(
      'SELECT id, sku, name, price_cents, stock, created_at FROM products WHERE id = ?',
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
        error: 'SKU already exists'
      });
    }
    console.error('Error creating product:', err);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
}

// GET /products/:id
async function getProduct(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT id, sku, name, price_cents, stock, created_at FROM products WHERE id = ?',
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
}

// GET /products (búsqueda con paginación)
async function searchProducts(req, res) {
  const { search = '', cursor = '0', limit = '10' } = req.query;
  const parsedCursor = parseInt(cursor, 10) || 0;
  const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100);

  try {
    let query = `
      SELECT id, sku, name, price_cents, stock, created_at 
      FROM products 
      WHERE id > ?
    `;
    const params = [parsedCursor];

    if (search) {
      query += ' AND (name LIKE ? OR sku LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY id ASC LIMIT ?';
    params.push(parsedLimit + 1);

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
    console.error('Error searching products:', err);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
}

// PATCH /products/:id
async function updateProduct(req, res) {
  const { id } = req.params;
  const { price_cents, stock } = req.body;

  try {
    // Verificar que el producto existe
    const [existing] = await db.query(
      'SELECT id FROM products WHERE id = ?',
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Actualizar solo los campos proporcionados
    const updates = [];
    const params = [];

    if (price_cents !== undefined) {
      updates.push('price_cents = ?');
      params.push(price_cents);
    }
    if (stock !== undefined) {
      updates.push('stock = ?');
      params.push(stock);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    params.push(id);

    await db.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Obtener el producto actualizado
    const [rows] = await db.query(
      'SELECT id, sku, name, price_cents, stock, created_at FROM products WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
}

module.exports = {
  createProduct,
  getProduct,
  searchProducts,
  updateProduct
};