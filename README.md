<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Payments Microservice

Microservicio de pagos construido con NestJS y Stripe para gestionar sesiones de pago y webhooks en una arquitectura de microservicios.

## Descripción

Este microservicio proporciona una API REST para:
- Crear sesiones de pago con Stripe
- Procesar webhooks de Stripe para eventos de pago
- Gestionar el ciclo de vida de pagos (éxito, cancelación)
- Validar y procesar transacciones

## Características

- 🔐 **Integración con Stripe**: Procesamiento seguro de pagos
- 🔔 **Webhooks**: Manejo de eventos de Stripe en tiempo real
- ✅ **Validación**: DTOs con class-validator para validación de datos
- 🛡️ **Seguridad**: Verificación de firmas de webhooks
- 🔄 **Transformación**: class-transformer para serialización de datos
- ⚙️ **Configuración**: Variables de entorno con validación usando Joi

## Requisitos Previos

- Node.js >= 18
- npm o yarn
- Cuenta de [Stripe](https://stripe.com)
- Stripe CLI (para testing local de webhooks)

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
PORT=3003
STRIPE_SECRET=sk_test_tu_clave_secreta_de_stripe
STRIPE_WEBHOOK_SECRET=whsec_tu_clave_de_webhook
```

### Obtener las claves de Stripe

1. **STRIPE_SECRET**: Ve a [Dashboard de Stripe](https://dashboard.stripe.com/test/apikeys)
2. **STRIPE_WEBHOOK_SECRET**: 
   - Para desarrollo local con Stripe CLI: `stripe listen --forward-to localhost:3003/payments/webhook`
   - Para producción: Crea un endpoint en el [Dashboard de Webhooks](https://dashboard.stripe.com/webhooks)

## Instalación

```bash
# Instalar dependencias
$ npm install
```

## Ejecutar la Aplicación

```bash
# Modo desarrollo
$ npm run start:dev

# Modo producción
$ npm run build
$ npm run start:prod
```

La aplicación estará disponible en `http://localhost:3003`

## API Endpoints

### Crear Sesión de Pago

```http
POST /payments/create-payment-session
Content-Type: application/json

{
  "orderId": "order-123",
  "currency": "usd",
  "items": [
    {
      "name": "Producto 1",
      "price": 29.99,
      "quantity": 2
    },
    {
      "name": "Producto 2",
      "price": 15.50,
      "quantity": 1
    }
  ]
}
```

**Respuesta:**
```json
{
  "id": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/cs_test_...",
  "status": "open",
  "payment_status": "unpaid"
}
```

### Éxito del Pago

```http
GET /payments/success
```

**Respuesta:**
```json
{
  "ok": true,
  "message": "Payment successful"
}
```

### Cancelación del Pago

```http
GET /payments/cancel
```

**Respuesta:**
```json
{
  "ok": false,
  "message": "Payment cancel"
}
```

### Webhook de Stripe

```http
POST /payments/webhook
```

Este endpoint recibe notificaciones de Stripe sobre eventos de pago. Eventos manejados:
- `charge.succeeded`: Cuando un pago se completa exitosamente

## Testing con Stripe CLI

Para probar webhooks localmente:

```bash
# 1. Instalar Stripe CLI
$ brew install stripe/stripe-cli/stripe  # macOS
# O descarga desde https://stripe.com/docs/stripe-cli

# 2. Autenticarse
$ stripe login

# 3. Escuchar webhooks
$ stripe listen --forward-to localhost:3003/payments/webhook

# 4. Realizar un pago de prueba
$ stripe trigger payment_intent.succeeded
```

## Estructura del Proyecto

```
src/
├── config/              # Configuración y variables de entorno
│   ├── envs.ts         # Validación de variables con Joi
│   └── index.ts        # Exportaciones
├── payments/           # Módulo de pagos
│   ├── dtos/           # Data Transfer Objects
│   │   └── payment-session.dto.ts
│   ├── payments.controller.ts
│   ├── payments.module.ts
│   └── payments.service.ts
├── app.module.ts       # Módulo principal
└── main.ts            # Punto de entrada
```

## Tecnologías Utilizadas

- **NestJS**: Framework de Node.js
- **TypeScript**: Lenguaje de programación
- **Stripe**: Procesador de pagos
- **class-validator**: Validación de DTOs
- **class-transformer**: Transformación de datos
- **Joi**: Validación de variables de entorno
- **dotenv**: Gestión de variables de entorno

## Pruebas

```bash
# Tests unitarios
$ npm run test

# Tests e2e
$ npm run test:e2e

# Cobertura de tests
$ npm run test:cov
```

## Seguridad

⚠️ **Consideraciones importantes:**

1. **Nunca commits las claves de Stripe** en el control de versiones
2. **Usa variables de entorno** para todas las credenciales
3. **Valida las firmas de webhooks** para evitar solicitudes falsas
4. **Usa HTTPS** en producción
5. **Implementa rate limiting** para prevenir abuso
6. **Registra eventos críticos** para auditoría

## Despliegue

### Configuración de Producción

1. Configura las variables de entorno en tu servidor:
   ```bash
   PORT=3003
   STRIPE_SECRET=sk_live_tu_clave_de_produccion
   STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_de_produccion
   ```

2. Compila el proyecto:
   ```bash
   npm run build
   ```

3. Ejecuta en producción:
   ```bash
   npm run start:prod
   ```

### Webhook en Producción

1. Ve al [Dashboard de Webhooks de Stripe](https://dashboard.stripe.com/webhooks)
2. Crea un nuevo endpoint apuntando a `https://tu-dominio.com/payments/webhook`
3. Selecciona los eventos que quieres recibir
4. Copia el "Signing secret" y actualiza `STRIPE_WEBHOOK_SECRET`

## Arquitectura de Microservicios

Este microservicio está diseñado para integrarse con otros servicios:

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Orders MS  │─────▶│  Payments MS │─────▶│    Stripe    │
└──────────────┘      └──────────────┘      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  Webhooks    │
                      │  Handler     │
                      └──────────────┘
```

### Flujo de Pago

1. **Order MS** envía datos de la orden al Payments MS
2. **Payments MS** crea una sesión de pago en Stripe
3. Usuario completa el pago en Stripe Checkout
4. **Stripe** envía webhook al Payments MS
5. **Payments MS** procesa el evento y notifica al Order MS

## Solución de Problemas

### Error: "Missing stripe-signature header"

- Verifica que estás enviando la cabecera `stripe-signature` en el webhook
- Usa Stripe CLI para testing local

### Error: "Webhook signature verification failed"

- Verifica que `STRIPE_WEBHOOK_SECRET` sea correcto
- En desarrollo local, usa el secret proporcionado por `stripe listen`
- En producción, usa el secret del dashboard de Stripe

### Pagos no se procesan

- Verifica que las URLs de success/cancel sean correctas
- Revisa los logs de la aplicación
- Verifica en el Dashboard de Stripe el estado del pago

## Recursos Adicionales

- [Documentación de Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Webhooks de Stripe](https://stripe.com/docs/webhooks)
- [NestJS Documentation](https://docs.nestjs.com)
- [TypeScript](https://www.typescriptlang.org/)

## Licencia

[MIT licensed](LICENSE)

## Contacto

Para preguntas o sugerencias sobre este microservicio, por favor abre un issue en el repositorio.
