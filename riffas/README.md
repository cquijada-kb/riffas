# Rifas API (NestJS + MongoDB/Mongoose)

Backend completo en NestJS para la plataforma de rifas, usando MongoDB con Mongoose.

## Características principales

- Listado público de rifas activas.
- Detalle público de una rifa.
- Proceso de compra:
  - El usuario indica cuántos números quiere.
  - El sistema asigna números disponibles al azar.
  - Se devuelve el monto total y una URL de pago *mock* (preparado para integrar Flow).
- Panel admin (endpoints):
  - Crear rifa.
  - Listar rifas.
  - Editar rifa.
  - Cerrar rifa.
  - Ejecutar sorteo (elige un ticket pagado al azar y guarda el resultado).
- Autenticación JWT básica (login).

## Requisitos

- Node.js >= 18
- MongoDB en ejecución (local o Atlas)

## Configuración

1. Copiar `.env.example` a `.env` y ajustar `MONGO_URI` si es necesario.

2. Instalar dependencias:

```bash
npm install
```

3. Ejecutar en modo desarrollo:

```bash
npm run start:dev
```

## Endpoints principales

Públicos:
- `GET /api/public/raffles` — Listado rifas activas.
- `GET /api/public/raffles/:id` — Detalle rifa.
- `POST /api/public/raffles/:raffleId/purchase` — Comprar números.

Admin (falta aplicar guard JWT + rol ADMIN):
- `GET /api/admin/raffles` — Lista para admin.
- `POST /api/admin/raffles` — Crear rifa.
- `PUT /api/admin/raffles/:id` — Editar rifa.
- `PATCH /api/admin/raffles/:id/cerrar` — Cerrar rifa.
- `PATCH /api/admin/raffles/:id/sortear` — Ejecutar sorteo.

Flow (callback de pago, stub):
- `POST /api/flow/callback`

> Para proteger los endpoints de admin puedes crear un guard con `AuthGuard('jwt')` y validar que `req.user.rol === 'ADMIN'`.
