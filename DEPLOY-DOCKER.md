# Despliegue Docker

## Estado actual

El stack ya fue probado localmente con Docker y el flujo de compra con Flow quedo funcionando de punta a punta.

## Servicios

- mongo
- backend NestJS
- frontend publico Angular
- frontend admin Angular
- gateway Nginx

## URLs locales

- Publico: http://localhost/
- Admin: http://localhost/admin/
- API: http://localhost/api/
- API directa: http://localhost:3000/api/
- Mongo: mongodb://localhost:27017/rifas_db

## Archivos clave

- docker-compose.yml
- infra/nginx/gateway.conf
- riffas/Dockerfile
- rifas-publico/Dockerfile
- rifas-backend-app/Dockerfile
- riffas/.env
- riffas/.env.example

## Levantar stack

```bash
docker compose up -d --build
```

## Ver estado

```bash
docker compose ps
```

## Ver logs

```bash
docker compose logs -f backend
docker compose logs -f gateway
```

## Detener

```bash
docker compose down
```

## Detener y borrar volumen Mongo

```bash
docker compose down -v
```

## Importante para Flow

En local con tuneles o dominio publico, revisa siempre estas variables en `riffas/.env`:

- FLOW_RETURN_URL
- FLOW_CONFIRM_URL
- PUBLIC_FRONTEND_URL

Si cambias esas variables y el backend corre en Docker Compose, debes recrear el contenedor para que tome el nuevo env:

```bash
docker compose up -d --force-recreate backend gateway
```

## Recomendaciones de seguridad

- rota las credenciales reales compartidas durante pruebas
- no subas `.env` a git
- usa `.env.example` como plantilla
- usa un dominio real con HTTPS para produccion
- respalda el volumen de Mongo o migra Mongo a un servicio administrado
