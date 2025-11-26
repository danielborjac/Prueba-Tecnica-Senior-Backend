const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrder,
  listOrders,
  confirmOrder,
  cancelOrder
} = require('../controllers/orders');
const {
  validateCreateOrder,
  validateListOrdersQuery,
  validateIdParam,
  validateConfirmOrder,
  validateCancelOrder
} = require('../validators/orders');

// Rutas de órdenes
router.post('/', validateCreateOrder, createOrder);
router.get('/', validateListOrdersQuery, listOrders);
router.get('/:id', validateIdParam, getOrder);
router.post('/:id/confirm', validateIdParam, validateConfirmOrder, confirmOrder);
router.post('/:id/cancel', validateIdParam, validateCancelOrder, cancelOrder);

module.exports = router;