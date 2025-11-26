
const express = require('express');
const router = express.Router();
const {
  createCustomer,
  getCustomer,
  searchCustomers,
  updateCustomer,
  deleteCustomer,
  getCustomerInternal
} = require('../controllers/customers');
const {
  validateCreateCustomer,
  validateUpdateCustomer,
  validateSearchQuery,
  validateIdParam
} = require('../validators/customers');
const { requireServiceToken } = require('../middleware/auth');

// Rutas públicas de la API
router.post('/', validateCreateCustomer, createCustomer);
router.get('/', validateSearchQuery, searchCustomers);
router.get('/:id', validateIdParam, getCustomer);
router.put('/:id', validateIdParam, validateUpdateCustomer, updateCustomer);
router.delete('/:id', validateIdParam, deleteCustomer);

// Ruta interna para comunicación entre servicios
router.get('/internal/:id', requireServiceToken, validateIdParam, getCustomerInternal);

module.exports = router;