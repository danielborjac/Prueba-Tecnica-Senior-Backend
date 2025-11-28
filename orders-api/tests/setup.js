// Cargar variables de entorno para tests
require('dotenv').config({ path: '.env.test' });

// Configurar timeout global para tests
jest.setTimeout(30000);

// Silenciar logs durante tests (opcional)
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}