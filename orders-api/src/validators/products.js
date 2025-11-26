const { z } = require('zod');

// Schema para crear producto
const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU too long').optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  price_cents: z.number().int().min(0, 'Price must be non-negative'),
  stock: z.number().int().min(0, 'Stock must be non-negative').optional()
});

// Schema para actualizar producto
const updateProductSchema = z.object({
  price_cents: z.number().int().min(0, 'Price must be non-negative').optional(),
  stock: z.number().int().min(0, 'Stock must be non-negative').optional()
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
  validateCreateProduct: validate(createProductSchema, 'body'),
  validateUpdateProduct: validate(updateProductSchema, 'body'),
  validateSearchQuery: validate(searchQuerySchema, 'query'),
  validateIdParam: validate(idParamSchema, 'params')
};