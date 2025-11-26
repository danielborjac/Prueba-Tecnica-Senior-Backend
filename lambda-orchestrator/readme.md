# Lambda Orchestrator

Lambda function que orquesta la creación y confirmación de órdenes en un solo flujo.

## 📁 Estructura

```
lambda-orchestrator/
├── src/
│   └── handlers/
│       └── orchestrator.js    # Handler principal del Lambda
├── serverless.yml             # Configuración de Serverless Framework
├── package.json
├── .env.example
└── README.md
```

## 🚀 Instalación

```bash
cd lambda-orchestrator
npm install
```

## 🔧 Configuración

1. Copiar el archivo de variables de entorno:
```bash
cp .env.example .env
```

2. Editar `.env` con tus valores:
```env
CUSTOMERS_API_URL=http://localhost:3001
ORDERS_API_URL=http://localhost:3002
SERVICE_TOKEN=tu-token-secreto-compartido
```

## 🧪 Ejecución Local

### Con serverless-offline (Recomendado)

```bash
npm run offline
```

El Lambda estará disponible en:
```
http://localhost:3003/orchestrator/create-and-confirm-order
```

### Probar con curl

```bash
curl -X POST http://localhost:3003/orchestrator/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {"product_id": 1, "qty": 2},
      {"product_id": 2, "qty": 1}
    ],
    "idempotency_key": "test-key-123",
    "correlation_id": "req-orchestrator-001"
  }'
```

## 📤 Despliegue a AWS

### Requisitos previos

1. Tener AWS CLI configurado:
```bash
aws configure
# Ingresa tu Access Key ID, Secret Access Key, región
```

2. Tener permisos IAM para:
   - Lambda
   - API Gateway
   - CloudWatch Logs

### Desplegar

```bash
npm run deploy
```

Después del despliegue, verás algo como:
```
✔ Service deployed to stack order-orchestrator-dev

endpoints:
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/orchestrator/create-and-confirm-order
```

### Ver logs

```bash
npm run logs
```

### Eliminar el Lambda de AWS

```bash
npm run remove
```

## 🔍 ¿Qué hace el Lambda?

El Lambda orquesta estos pasos:

1. **Valida el cliente** → Llama a `GET /customers/internal/:id` (Customers API)
2. **Crea la orden** → Llama a `POST /orders` (Orders API)
3. **Confirma la orden** → Llama a `POST /orders/:id/confirm` con `X-Idempotency-Key`
4. **Devuelve respuesta consolidada** → JSON con cliente + orden confirmada

## 📊 Ejemplo de Request

```json
{
  "customer_id": 1,
  "items": [
    {
      "product_id": 2,
      "qty": 3
    }
  ],
  "idempotency_key": "abc-123",
  "correlation_id": "req-789"
}
```

## 📊 Ejemplo de Response (201)

```json
{
  "success": true,
  "correlationId": "req-789",
  "data": {
    "customer": {
      "id": 1,
      "name": "ACME",
      "email": "ops@acme.com",
      "phone": "123456789"
    },
    "order": {
      "id": 101,
      "status": "CONFIRMED",
      "total_cents": 389700,
      "created_at": "2024-11-26T...",
      "items": [
        {
          "product_id": 2,
          "qty": 3,
          "unit_price_cents": 129900,
          "subtotal_cents": 389700
        }
      ]
    }
  }
}
```

## 🔒 Variables de entorno requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `CUSTOMERS_API_URL` | URL de la API de clientes | `http://localhost:3001` |
| `ORDERS_API_URL` | URL de la API de pedidos | `http://localhost:3002` |
| `SERVICE_TOKEN` | Token para autenticación entre servicios | `secret-token-123` |

## 🐛 Troubleshooting

### Error: "Customers service unavailable"
- Verifica que Customers API esté corriendo en el puerto 3001
- Verifica que `CUSTOMERS_API_URL` esté configurada correctamente

### Error: "Unauthorized"
- Verifica que `SERVICE_TOKEN` sea el mismo en todas las APIs y el Lambda

### Lambda funciona local pero no en AWS
- Las URLs deben ser públicas (no localhost)
- Usa IPs públicas o dominios para las APIs cuando despliegues en AWS
- Considera usar VPC si las APIs están en EC2 privadas