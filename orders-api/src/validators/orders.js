const { z } = require('zod');

// Schema para items de una orden
const orderItemSchema = z.object({
  product_id: z.number().int().positive('Product ID must be positive'),
  qty: z.number().int().positive('Quantity must be positive')
});

// Schema para crear orden
const createOrderSchema = z.object({
  customer_id: z.number().int().positive('Customer ID must be positive'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  correlation_id: z.string().optional()
});

// Schema para query params de listado de órdenes
const listOrdersQuerySchema = z.object({
  status: z.enum(['CREATED', 'CONFIRMED', 'CANCELED'], {
    errorMap: () => ({ message: 'Status must be CREATED, CONFIRMED, or CANCELED' })
  }).optional(),
  from: z.string().datetime({ message: 'Invalid datetime format for from' }).optional(),
  to: z.string().datetime({ message: 'Invalid datetime format for to' }).optional(),
  cursor: z.string().regex(/^\d+$/, 'Cursor must be a number').optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional()
});

// Schema para validar ID en params
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a valid number')
});

// Schema para confirmar orden
const confirmOrderSchema = z.object({
  correlation_id: z.string().optional()
});

// Schema para cancelar orden
const cancelOrderSchema = z.object({
  correlation_id: z.string().optional()
});

// Middleware genérico de validación
function validate(schema, property = 'body') {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req[property]);
      req[property] = validated;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(err);
    }
  };
}

module.exports = {
  validateCreateOrder: validate(createOrderSchema, 'body'),
  validateListOrdersQuery: validate(listOrdersQuerySchema, 'query'),
  validateIdParam: validate(idParamSchema, 'params'),
  validateConfirmOrder: validate(confirmOrderSchema, 'body'),
  validateCancelOrder: validate(cancelOrderSchema, 'body')
};