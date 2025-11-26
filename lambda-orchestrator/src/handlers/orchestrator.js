const axios = require('axios');

const CUSTOMERS_API_URL = process.env.CUSTOMERS_API_URL || 'http://localhost:3001';
const ORDERS_API_URL = process.env.ORDERS_API_URL || 'http://localhost:3002';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN;

/**
 * Lambda handler para crear y confirmar una orden en un solo flujo
 * @param {Object} event - Evento de API Gateway con el body del request
 * @returns {Object} - Respuesta HTTP con el resultado de la orquestación
 */
exports.createAndConfirmOrder = async (event) => {
  console.log('📥 Received event:', JSON.stringify(event, null, 2));

  try {
    // 1. Parsear el body del request
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (err) {
      return buildResponse(400, {
        success: false,
        error: 'Invalid JSON in request body'
      });
    }

    const { customer_id, items, idempotency_key, correlation_id } = body;

    // 2. Validar campos requeridos
    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return buildResponse(400, {
        success: false,
        error: 'customer_id and items[] are required',
        correlationId: correlation_id
      });
    }

    if (!idempotency_key) {
      return buildResponse(400, {
        success: false,
        error: 'idempotency_key is required',
        correlationId: correlation_id
      });
    }

    console.log('✅ Validation passed');
    console.log('📋 Processing order for customer:', customer_id);
    console.log('🔑 Idempotency key:', idempotency_key);
    console.log('🔗 Correlation ID:', correlation_id);

    // 3. Validar que el cliente existe (llamada interna a Customers API)
    console.log('🔍 Step 1: Validating customer...');
    let customer;
    try {
      const customerResponse = await axios.get(
        `${CUSTOMERS_API_URL}/customers/internal/${customer_id}`,
        {
          headers: {
            'Authorization': `Bearer ${SERVICE_TOKEN}`
          },
          timeout: 5000
        }
      );

      if (!customerResponse.data.success || !customerResponse.data.data) {
        throw new Error('Invalid customer response');
      }

      customer = customerResponse.data.data;
      console.log('✅ Customer validated:', customer.name);
    } catch (err) {
      console.error('❌ Customer validation failed:', err.message);
      
      if (err.response?.status === 404) {
        return buildResponse(400, {
          success: false,
          error: 'Customer not found',
          customerId: customer_id,
          correlationId: correlation_id
        });
      }

      return buildResponse(503, {
        success: false,
        error: 'Customers service unavailable',
        details: err.message,
        correlationId: correlation_id
      });
    }

    // 4. Crear la orden (Orders API)
    console.log('🔍 Step 2: Creating order...');
    let order;
    try {
      const createOrderResponse = await axios.post(
        `${ORDERS_API_URL}/orders`,
        {
          customer_id,
          items,
          correlation_id: correlation_id || `orchestrator-${Date.now()}`
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (!createOrderResponse.data.success) {
        throw new Error('Order creation failed');
      }

      order = createOrderResponse.data.data;
      console.log('✅ Order created:', order.order.id);
    } catch (err) {
      console.error('❌ Order creation failed:', err.message);

      if (err.response?.data) {
        return buildResponse(err.response.status, {
          success: false,
          error: err.response.data.error || 'Order creation failed',
          details: err.response.data,
          correlationId: correlation_id
        });
      }

      return buildResponse(503, {
        success: false,
        error: 'Orders service unavailable',
        details: err.message,
        correlationId: correlation_id
      });
    }

    // 5. Confirmar la orden (Orders API con idempotencia)
    console.log('🔍 Step 3: Confirming order...');
    let confirmedOrder;
    try {
      const confirmOrderResponse = await axios.post(
        `${ORDERS_API_URL}/orders/${order.order.id}/confirm`,
        {
          correlation_id: correlation_id || `orchestrator-confirm-${Date.now()}`
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotency_key
          },
          timeout: 10000
        }
      );

      if (!confirmOrderResponse.data.success) {
        throw new Error('Order confirmation failed');
      }

      confirmedOrder = confirmOrderResponse.data.data;
      console.log('✅ Order confirmed:', confirmedOrder.id);
    } catch (err) {
      console.error('❌ Order confirmation failed:', err.message);

      if (err.response?.data) {
        return buildResponse(err.response.status, {
          success: false,
          error: err.response.data.error || 'Order confirmation failed',
          details: err.response.data,
          orderId: order.order.id,
          correlationId: correlation_id
        });
      }

      return buildResponse(503, {
        success: false,
        error: 'Orders service unavailable during confirmation',
        details: err.message,
        orderId: order.order.id,
        correlationId: correlation_id
      });
    }

    // 6. Construir respuesta consolidada
    console.log('✅ Orchestration completed successfully');
    
    const response = {
      success: true,
      correlationId: correlation_id,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone
        },
        order: {
          id: confirmedOrder.id,
          status: confirmedOrder.status,
          total_cents: confirmedOrder.total_cents,
          created_at: confirmedOrder.created_at,
          items: confirmedOrder.items
        }
      }
    };

    return buildResponse(201, response);

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return buildResponse(500, {
      success: false,
      error: 'Internal orchestrator error',
      details: err.message
    });
  }
};

/**
 * Helper para construir respuestas HTTP consistentes
 * @param {number} statusCode - Código de estado HTTP
 * @param {Object} body - Cuerpo de la respuesta
 * @returns {Object} - Respuesta formateada para API Gateway
 */
function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(body)
  };
}