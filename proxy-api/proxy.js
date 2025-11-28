
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check del proxy
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'proxy-api',
    timestamp: new Date().toISOString(),
    upstreams: {
      customers: process.env.CUSTOMERS_API_URL || 'http://customers-api:3001',
      orders: process.env.ORDERS_API_URL || 'http://orders-api:3002'
    }
  });
});

// Proxy para Customers API
app.use('/customers-api', createProxyMiddleware({
  target: process.env.CUSTOMERS_API_URL || 'http://customers-api:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/customers-api': '' // Remueve /customers-api del path
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`→ Proxying to Customers API: ${req.method} ${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error (Customers API):', err.message);
    res.status(503).json({
      success: false,
      error: 'Customers API unavailable',
      details: err.message
    });
  }
}));

// Proxy para Orders API
app.use('/orders-api', createProxyMiddleware({
  target: process.env.ORDERS_API_URL || 'http://orders-api:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/orders-api': '' // Remueve /orders-api del path
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`→ Proxying to Orders API: ${req.method} ${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error (Orders API):', err.message);
    res.status(503).json({
      success: false,
      error: 'Orders API unavailable',
      details: err.message
    });
  }
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    availableRoutes: [
      '/health',
      '/customers-api/*',
      '/orders-api/*'
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy API running on port ${PORT}`);
  console.log(`Customers API: ${process.env.CUSTOMERS_API_URL || 'http://customers-api:3001'}`);
  console.log(`Orders API: ${process.env.ORDERS_API_URL || 'http://orders-api:3002'}`);
});