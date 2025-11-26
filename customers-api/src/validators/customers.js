const { z } = require('zod');

// Schema para crear cliente
const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  phone: z.string().max(50, 'Phone too long').optional()
});

// Schema para actualizar cliente (todos los campos opcionales)
const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(255, 'Name too long').optional(),
  email: z.string().email('Invalid email format').max(255, 'Email too long').optional(),
  phone: z.string().max(50, 'Phone too long').optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

// Schema para query params de búsqueda
const searchQuerySchema = z.object({
  search: z.string().optional(),
  cursor: z.string().regex(/^\d+$/, 'Cursor must be a number').optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional()
});

// Schema para validar ID en params
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a valid number')
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
  validateCreateCustomer: validate(createCustomerSchema, 'body'),
  validateUpdateCustomer: validate(updateCustomerSchema, 'body'),
  validateSearchQuery: validate(searchQuerySchema, 'query'),
  validateIdParam: validate(idParamSchema, 'params')
};