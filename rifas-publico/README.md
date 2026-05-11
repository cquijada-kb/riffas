# Sitio Publico (Especificacion 2.1 a 2.4)

Incluye exactamente:
- 2.1 Home: listado de rifas activas como tarjetas (nombre, imagen, precio, avance, ver mas/participar).
- 2.2 Detalle: imagen, descripcion, precio, total numeros, vendidos, max por persona, comprar numeros.
- 2.3 Compra: cantidad -> reserva aleatoria -> resumen -> redireccion a Flow -> confirmacion.
- 2.4 Ganador: numero ganador, nombre (opcional), fecha/hora sorteo, mensaje finalizada.

## Ejecutar
Requisitos: Node 18+ y Angular CLI 15
```bash
npm install
npm start
```

## Integrar backend real
En `src/environments/environment.ts`:
- useMock: false
- apiBaseUrl: 'https://tu-api.cl'

Endpoints sugeridos:
- GET  /public/raffles
- GET  /public/raffles/:id
- POST /public/raffles/:id/reserve   body: { quantity, buyerEmail }
- POST /public/payments/flow/create  body: { reserveId } -> { paymentUrl }
- GET  /public/payments/flow/result?reserveId=...
- GET  /public/raffles/:id/winner
