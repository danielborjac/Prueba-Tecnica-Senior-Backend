const axios = require('axios');

const CUSTOMERS_API_URL = process.env.CUSTOMERS_API_URL || 'http://localhost:3001';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN;

/**
 * Valida que un cliente existe llamando al endpoint interno de Customers API
 * @param {number} customerId - ID del cliente a validar
 * @returns {Promise<Object>} - Datos del cliente
 * @throws {Error} - Si el cliente no existe o hay error de comunicación
 */
async function validateCustomer(customerId) {
  try {
    const response = await axios.get(
      `${CUSTOMERS_API_URL}/customers/internal/${customerId}`,
      {
        headers: {
          'Authorization': `Bearer ${SERVICE_TOKEN}`
        },
        timeout: 5000
      }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Invalid customer response format');
  } catch (error) {
    if (error.response) {
      // El servidor respondió con un status code fuera del rango 2xx
      if (error.response.status === 404) {
        throw {
          status: 400,
          message: 'Customer not found',
          customerId
        };
      }
      if (error.response.status === 401) {
        throw {
          status: 500,
          message: 'Service authentication failed'
        };
      }
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      console.error('Customers API unreachable:', error.message);
      throw {
        status: 503,
        message: 'Customers service unavailable'
      };
    }
    
    throw {
      status: 500,
      message: 'Error validating customer',
      details: error.message
    };
  }
}

module.exports = {
  validateCustomer
};