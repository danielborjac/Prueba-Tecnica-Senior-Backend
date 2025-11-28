# Senior Backend Test - Order Management System

Sistema de gestión de pedidos B2B compuesto por dos microservicios (Customers API y Orders API) un Proxy api y un Lambda orquestador.

## 📁 Estructura del Proyecto

```
senior-backend-test/
├── customers-api/       # API de gestión de clientes
│   ├── src/
│   ├── openapi.yaml     # Documentación OpenAPI 3.0
│   ├── Dockerfile
│   ├── package.json
│   ├── tests            # Test de integración
│   └── .env.example
├── orders-api/          # API de gestión de productos y órdenes
│   ├── src/
│   ├── openapi.yaml     # Documentación OpenAPI 3.0
│   ├── Dockerfile
│   ├── package.json
│   ├── tests           # Test de integración
│   └── .env.example
├── lambda-orchestrator/ # Lambda para orquestar creación y confirmación
│   ├── handler.js
│   ├── serverless.yml
│   ├── openapi.yaml     # Documentación OpenAPI 3.0
│   ├── package.json
│   └── .env.example
├── db/                  # Scripts SQL
│   ├── schema.sql       # Definición de tablas
│   └── seed.sql         # Datos de ejemplo
│   └── migrate.js       # migración de base
│   └── seed.js          # ejecutar seeding
│   ├── package.json
│   └── .env.example
├── postman/                  
│   └── Senior-Backend-Test.postman_collection.json       # Collección de postman para pruebas
├── proxy-api/          #  Proxy inverso para exponer ambas APIs
│   ├── proxy.js/
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml   # Orquestación de servicios
└── README.md
```

## 🚀 Inicio Rápido con Docker Compose

### Prerrequisitos

- Docker Desktop instalado y corriendo
- Docker Compose v3.8 o superior
- Node.js 22.x (para Lambda local)

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd senior-backend-test
```

### 2. Configurar variables de entorno

```bash
# Customers API
cd customers-api
cp .env.example .env
cd ..

# Orders API
cd orders-api
cp .env.example .env
cd ..

# Lambda Orchestrator
cd lambda-orchestrator
cp .env.example .env
cd ..

# db
cd db
cp .env.example .env
cd ..

# Lambda Orchestrator
cd proxy-api
cp .env.example .env
cd ..
```

**⚠️ IMPORTANTE:** Asegúrate de que `SERVICE_TOKEN` sea el mismo en `customers-api/.env`, `orders-api/.env` y `lambda-orchestrator/.env`.

### 3. Construir y levantar los servicios

```bash
# Construir imágenes
docker-compose build

# Levantar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### 4. Verificar que todo está corriendo

```bash
# Health checks
curl http://localhost:3001/health
curl http://localhost:3002/health

# O en PowerShell
Invoke-WebRequest http://localhost:3001/health
Invoke-WebRequest http://localhost:3002/health
```

Respuesta esperada:
```json
{
  "success": true,
  "service": "customers-api",
  "timestamp": "2024-11-26T..."
}
```

## 🔧 Variables de Entorno

### Customers API (.env)
```env
PORT=3001
NODE_ENV=development
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASS=root
DB_NAME=appdb
SERVICE_TOKEN=svc_token_very_secret
```

### Orders API (.env)
```env
PORT=3002
NODE_ENV=development
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASS=root
DB_NAME=appdb
SERVICE_TOKEN=svc_token_very_secret
CUSTOMERS_API_URL=http://customers-api:3001
```

### Lambda Orchestrator (.env)
```env
CUSTOMERS_API_URL=http://localhost:3001
ORDERS_API_URL=http://localhost:3002
SERVICE_TOKEN=svc_token_very_secret
```

### DB (.env)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=root
DB_NAME=appdb
```

### Proxy API (.env)
```env
PORT=3000
CUSTOMERS_API_URL=http://customers-api:3001
ORDERS_API_URL=http://orders-api:3002
```

## 📡 APIs Disponibles

### Customers API (Puerto 3001)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/customers` | Crear cliente |
| GET | `/customers/:id` | Obtener cliente |
| GET | `/customers?search=&limit=` | Buscar clientes |
| PUT | `/customers/:id` | Actualizar cliente |
| DELETE | `/customers/:id` | Eliminar cliente (soft delete) |
| GET | `/internal/customers/:id` | Endpoint interno (requiere SERVICE_TOKEN) |

### Orders API (Puerto 3002)

**Productos:**
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/products` | Crear producto |
| GET | `/products/:id` | Obtener producto |
| GET | `/products?search=&limit=` | Buscar productos |
| PATCH | `/products/:id` | Actualizar precio/stock |

**Órdenes:**
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/orders` | Crear orden |
| GET | `/orders/:id` | Obtener orden |
| GET | `/orders?status=&from=&to=` | Listar órdenes |
| POST | `/orders/:id/confirm` | Confirmar orden (idempotente) |
| POST | `/orders/:id/cancel` | Cancelar orden |

## 📝 Ejemplos con cURL

### **Customers API**

#### Crear un cliente
```bash
curl -X POST http://localhost:3001/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "La Favorita",
    "email": "la@favorita.com",
    "phone": "+1-555-0500"
  }'
```

#### Obtener cliente por ID
```bash
curl http://localhost:3001/customers/1
```

#### Buscar clientes
```bash
curl "http://localhost:3001/customers?search=ACME&limit=10"
```

#### Actualizar cliente
```bash
curl -X PUT http://localhost:3001/customers/1 \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1-555-0800"
  }'
```

#### Eliminar cliente (soft delete)
```bash
curl -X DELETE http://localhost:3001/customers/1
```

#### Endpoint interno (con token)
```bash
curl http://localhost:3001/customers/internal/1 \
  -H "Authorization: Bearer svc_token_very_secret"
```

---

### **Orders API - Productos**

#### Crear producto
```bash
curl -X POST http://localhost:3002/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "SSD-001",
    "name": "kingston ssd 1TB",
    "price_cents": 95000,
    "stock": 12
  }'
```

#### Obtener producto
```bash
curl http://localhost:3002/products/1
```

#### Buscar productos
```bash
curl "http://localhost:3002/products?search=Laptop&limit=10"
```

#### Actualizar precio y stock
```bash
curl -X PATCH http://localhost:3002/products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "price_cents": 119900,
    "stock": 20
  }'
```

---

### **Orders API - Órdenes**

#### Crear orden
```bash
curl -X POST http://localhost:3002/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {
        "product_id": 1,
        "qty": 2
      },
      {
        "product_id": 2,
        "qty": 1
      }
    ],
    "correlation_id": "req-create-order-001"
  }'
```

**Respuesta esperada (201):**
```json
{
  "success": true,
  "correlationId": "req-create-order-001",
  "data": {
    "customer": {
      "id": 1,
      "name": "ACME Corporation",
      "email": "ops@acme.com",
      "phone": "+1-555-0100"
    },
    "order": {
      "id": 1,
      "status": "CREATED",
      "total_cents": 268790,
      "created_at": "2024-11-26T...",
      "items": [...]
    }
  }
}
```

#### Obtener orden
```bash
curl http://localhost:3002/orders/1
```

#### Listar órdenes
```bash
# Todas las órdenes
curl "http://localhost:3002/orders?limit=10"

# Filtrar por estado
curl "http://localhost:3002/orders?status=CREATED&limit=10"

# Filtrar por fecha
curl "http://localhost:3002/orders?from=2024-11-01T00:00:00.000Z&to=2024-11-30T23:59:59.999Z"
```

#### Confirmar orden (idempotente)
```bash
curl -X POST http://localhost:3002/orders/1/confirm \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: confirm-order-1-abc123" \
  -d '{
    "correlation_id": "req-confirm-001"
  }'
```

**Nota:** Si repites esta petición con el **mismo** `X-Idempotency-Key`, obtendrás la misma respuesta sin re-procesar.

#### Cancelar orden
```bash
curl -X POST http://localhost:3002/orders/1/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "correlation_id": "req-cancel-001"
  }'
```

**Reglas de cancelación:**
- Órdenes `CREATED`: Siempre se pueden cancelar
- Órdenes `CONFIRMED`: Solo dentro de 10 minutos de su creación
- Al cancelar, el stock se restaura automáticamente

---

## 🔧 Lambda Orchestrator

### Ejecutar localmente

```bash
cd lambda-orchestrator
npm install
npm run offline
```

El Lambda estará disponible en: `http://localhost:3003`

### Endpoint del Lambda

**POST** `/orchestrator/create-and-confirm-order`

Orquesta el proceso completo:
1. Valida que el cliente existe (Customers API)
2. Crea la orden (Orders API)
3. Confirma la orden de forma idempotente (Orders API)

#### Ejemplo con cURL
```bash
curl -X POST http://localhost:3003/orchestrator/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {
        "product_id": 1,
        "qty": 2
      }
    ],
    "idempotency_key": "orchestrator-test-001",
    "correlation_id": "req-orchestrator-001"
  }'
```

**Respuesta esperada (201):**
```json
{
  "success": true,
  "correlationId": "req-orchestrator-001",
  "data": {
    "customer": {
      "id": 1,
      "name": "ACME Corporation",
      "email": "ops@acme.com",
      "phone": "+1-555-0100"
    },
    "order": {
      "id": 1,
      "status": "CONFIRMED",
      "total_cents": 259800,
      "created_at": "2024-11-26T...",
      "items": [
        {
          "product_id": 1,
          "qty": 2,
          "unit_price_cents": 129900,
          "subtotal_cents": 259800
        }
      ]
    }
  }
}
```

---

### Exponer APIs locales con ngrok (para testing con Lambda en AWS)

Si quieres que tu Lambda en AWS se comunique con tus APIs locales:

```bash
# Terminal 1: Exponer Customers API
ngrok http 3001

# Terminal 2: Exponer Orders API
ngrok http 3002
```

Ngrok te dará URLs públicas como:
- `https://abc123.ngrok.io` → localhost:3001
- `https://xyz789.ngrok.io` → localhost:3002

Usa estas URLs en las variables de entorno del Lambda en AWS.

## 🌐 Proxy Inverso para ngrok

### ¿Por qué un proxy?

El plan gratuito de ngrok solo permite exponer **un puerto a la vez**. Como tenemos dos APIs (Customers en 3001 y Orders en 3002), necesitamos un proxy inverso que:

1. Escuche en **un solo puerto** (3000)
2. Redirija las peticiones a la API correcta según la ruta

### Arquitectura del Proxy
```
ngrok (puerto único) → Proxy (3000) → Customers API (3001)
                                    → Orders API (3002)
```
**Ejemplo:**
- Request: `https://tu-url.ngrok-free.dev/customers-api/customers/1`
- Proxy redirige a: `http://customers-api:3001/customers/1`
- El proxy **remueve** `/customers-api` del path automáticamente

# Terminal: Exponer proxy API
ngrok http 3000

Ngrok te dará URL pública como:
- `https://abc123.ngrok.io` → localhost:3001 y localhost:3002

---

### Desplegar Lambda en AWS

#### Prerequisitos
- AWS CLI configurado: `aws configure`
- Permisos IAM para Lambda, API Gateway y CloudWatch

#### Paso 1: Actualizar variables de entorno

Edita `lambda-orchestrator/.env` con URLs públicas:

```env
CUSTOMERS_API_URL=https://your-customers-api-url.com
ORDERS_API_URL=https://your-orders-api-url.com
SERVICE_TOKEN=svc_token_very_secret
```

#### Paso 2: Desplegar

```bash
cd lambda-orchestrator
npm run deploy
```

#### Paso 3: Usar el endpoint de AWS

Después del deploy, verás:

```
✔ Service deployed to stack order-orchestrator-dev

endpoints:
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/orchestrator/create-and-confirm-order
```

Prueba con cURL:

```bash
curl -X POST https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/orchestrator/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [{"product_id": 1, "qty": 2}],
    "idempotency_key": "test-aws-001",
    "correlation_id": "req-aws-001"
  }'
```

#### Ver logs del Lambda en AWS

```bash
npm run logs
```

#### Eliminar el Lambda de AWS

```bash
npm run remove
```

## 📬 Postman Collection

Una colección completa de Postman está incluida para facilitar las pruebas.

### Importar la Collection

1. Abrir Postman
2. Click en **Import**
3. Seleccionar `postman/Senior-Backend-Test.postman_collection.json`
4. ✅ Collection importada con todos los endpoints

### Configurar Variables

La collection usa variables que debes configurar:

1. Click en la collection "Senior Backend Test"
2. Tab **Variables**
3. Configurar:

| Variable | Valor Local | Valor Producción |
|----------|-------------|------------------|
| `customers_base_url` | `http://localhost:3001` | URL pública |
| `orders_base_url` | `http://localhost:3002` | URL pública |
| `lambda_base_url` | `http://localhost:3003` | URL de AWS Lambda |
| `service_token` | `your-secret-service-token-here` | Token real |

### Estructura de la Collection

La collection incluye 6 carpetas organizadas:

#### 1. **Health Checks**
- Verificar que todos los servicios están corriendo
- Útil para troubleshooting

#### 2. **Customers API**
- Create Customer (guarda automáticamente el `customer_id`)
- Get Customer
- Search Customers (con paginación)
- Update Customer
- Delete Customer (soft delete)
- Get Customer Internal (con SERVICE_TOKEN)

#### 3. **Orders API - Products**
- Create Product (guarda automáticamente el `product_id`)
- Get Product
- Search Products
- Update Product (precio y stock)

#### 4. **Orders API - Orders**
- Create Order (guarda automáticamente el `order_id`)
- Get Order (con items)
- List Orders (con filtros)
- List Orders by Status
- Confirm Order (con idempotency key automática)
- Cancel Order

#### 5. **Lambda Orchestrator**
- Create and Confirm Order (Local) - Para serverless-offline
- Create and Confirm Order (AWS) - Para Lambda desplegado

#### 6. **Flujo Completo**
Secuencia automática que demuestra todo el flujo:
1. Crear Customer
2. Crear Product
3. Crear Order
4. Confirmar Order
5. Verificar Order Status

**Tip:** Ejecuta toda esta carpeta con **Run folder** para probar el flujo completo de una vez.

### Scripts Automáticos

Los requests incluyen scripts que:
- ✅ Guardan IDs automáticamente en variables
- ✅ Generan idempotency keys únicos con `{{$timestamp}}`
- ✅ Facilitan el testing secuencial

### Ejemplo de Uso

```bash
# 1. Levantar servicios
docker-compose up -d

# 2. Abrir Postman e importar collection

# 3. Ejecutar "Health Checks" folder
# Verifica: ✓ Customers API, ✓ Orders API

# 4. Ejecutar "Flujo Completo" folder
# Crea: Customer → Product → Order → Confirm

# 5. Probar Lambda
# Ejecutar: "Lambda Orchestrator" → "Create and Confirm Order"
```

---

## 📖 Documentación OpenAPI

Cada servicio incluye su especificación OpenAPI 3.0 completa con ejemplos y schemas.

### Archivos

- **Customers API**: `customers-api/openapi.yaml`
- **Orders API**: `orders-api/openapi.yaml`
- **Lambda Orchestrator**: `lambda-orchestrator/openapi.yaml`

### Visualizar la Documentación

#### **Opción 1: Swagger Editor Online (Más fácil)**

1. Ir a https://editor.swagger.io/
2. File → Import file
3. Seleccionar cualquier `openapi.yaml`
4. ✅ Documentación interactiva visible

#### **Opción 2: Importar en Postman**

1. Postman → Import
2. Seleccionar `openapi.yaml`
3. ✅ Postman genera automáticamente toda la collection

#### **Opción 3: Importar en Insomnia**

1. Insomnia → Create → Import from → File
2. Seleccionar `openapi.yaml`
3. ✅ Insomnia genera la workspace completa

#### **Opción 4: Visualizar Localmente**

```bash
# Instalar swagger-ui-serve globalmente
npm install -g swagger-ui-serve

# Visualizar Customers API
swagger-ui-serve customers-api/openapi.yaml
# Abre en: http://localhost:8080

# O con npx (sin instalar)
npx swagger-ui-serve orders-api/openapi.yaml
```

### Características de las Specs

- ✅ OpenAPI 3.0.3 compliant
- ✅ Todos los endpoints documentados
- ✅ Request/response schemas con ejemplos
- ✅ Validation rules (Zod) reflejadas
- ✅ Authentication schemes documentados
- ✅ Error responses con códigos HTTP correctos
- ✅ Query parameters con tipos y validaciones

---

## 🔐 Seguridad

### Implementado

- ✅ **Autenticación entre servicios**: `SERVICE_TOKEN` en header Authorization
- ✅ **SQL parametrizado**: Todas las queries usan placeholders `?` para prevenir SQL injection
- ✅ **Validación de entrada**: Zod valida todos los requests antes de procesarlos
- ✅ **Soft delete**: Los clientes eliminados no se borran físicamente
- ✅ **CORS configurado**: Headers apropiados en Lambda
- ✅ **Transacciones ACID**: Operaciones críticas envueltas en transacciones
- ✅ **Idempotencia**: X-Idempotency-Key previene operaciones duplicadas

## 🚀 Deployment

### Local (Docker Compose)

```bash
# Setup inicial
docker-compose build
docker-compose up -d

# Verificar
docker-compose ps
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3000/health  # Proxy
```

### Lambda en AWS

```bash
# Prerequisites
aws configure  # Configurar credenciales

# Deploy
cd lambda-orchestrator
npm run deploy

# Logs en tiempo real
npm run logs

# Eliminar (cleanup)
npm run remove
```

### Tests Implementados

✅ **Integration Tests** (Jest + Supertest)
- Customers API: 12 tests
- Orders API: 17 tests
- Coverage: ~75%

### Tests Recomendados para Producción

#### **Unit Tests**
```javascript
// Ejemplo: validators/customers.test.js
describe('Customer Validator', () => {
  it('should validate correct customer data', () => {
    const result = validateCreateCustomer({
      name: 'Test',
      email: 'test@test.com'
    });
    expect(result.success).toBe(true);
  });
});
```

#### **E2E Tests**
```javascript
// Ejemplo: Playwright, Cypress
test('Complete order flow', async () => {
  await createCustomer();
  await createProduct();
  const order = await createOrder();
  const confirmed = await confirmOrder(order.id);
  expect(confirmed.status).toBe('CONFIRMED');
});
```

#### **Load Tests**
```javascript
// Ejemplo: k6, Artillery
import http from 'k6/http';
export default function() {
  http.post('http://api/orders', payload);
}
```

#### **Contract Tests**
- Pact para validar contratos entre servicios
- Asegurar que cambios en Orders no rompan Lambda

---

## 🐛 Troubleshooting Guide

### Problema: Docker no inicia

**Síntomas:**
```
Error: Cannot connect to the Docker daemon
```

**Solución:**
```bash
# Windows: Abrir Docker Desktop
# Mac: Abrir Docker.app
# Linux:
sudo systemctl start docker
```

### Problema: Puerto MySQL ocupado

**Síntomas:**
```
Error: bind: address already in use (port 3306)
```

**Solución:**
```bash
# Opción 1: Detener MySQL local
# Windows (como admin)
net stop MySQL80

# Opción 2: Cambiar puerto en docker-compose.yml
ports:
  - "33060:3306"  # Usa 33060 externamente
```

### Problema: Tests fallan con "Cannot connect to database"

**Síntomas:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solución:**
```bash
# 1. Verificar que MySQL está corriendo
docker-compose ps mysql

# 2. Verificar .env.test
cat customers-api/.env.test
# Debe tener: DB_HOST=localhost

# 3. Reiniciar MySQL
docker-compose restart mysql

# 4. Esperar a que esté healthy
docker-compose logs -f mysql | grep "ready for connections"
```

### Problema: Lambda no puede conectarse a APIs

**Síntomas:**
```
Error: Customers service unavailable
```

**Solución:**
```bash
# 1. Verificar que ngrok está corriendo
# Terminal debe mostrar: Session Status: online

# 2. Verificar URLs en lambda .env
cat lambda-orchestrator/.env
# Deben coincidir con ngrok

# 3. Probar manualmente
curl https://tu-url.ngrok-free.dev/customers-api/health

# 4. Verificar SERVICE_TOKEN
# Debe ser el mismo en .env de customers-api, orders-api y lambda
```

### Problema: Idempotency key en progreso

**Síntomas:**
```json
{
  "error": "Request already in progress"
}
```

**Solución:**
```bash
# Opción 1: Usar otra idempotency key
X-Idempotency-Key: confirm-order-1-NEW-KEY

# Opción 2: Limpiar la tabla (solo desarrollo)
docker-compose exec mysql mysql -uroot -proot appdb
DELETE FROM idempotency_keys WHERE `key` = 'tu-key-aqui';
```

### Problema: CORS error en Lambda

**Síntomas:**
```
Access to fetch has been blocked by CORS policy
```

**Solución:**
El Lambda ya tiene headers CORS. Si persiste:
```javascript
// Verificar en handler.js:
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true
}
```

---

## 👨‍💻 Autor

Daniel Andrés Borja Cárdenas

**Contacto:**
- GitHub: (https://github.com/danielborjac)
- LinkedIn: (https://www.linkedin.com/in/daniel-andr%C3%A9s-borja-c%C3%A1rdenas-7bb49bba/)
- Email: danielborjac@hotmail.es
