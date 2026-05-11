# Rifas Backend App (Angular Material)

Panel de administración para organizadores de rifas, construido en Angular 17 + Angular Material.

## Requisitos

- Node.js 18+ recomendado
- npm 9+ recomendado
- Angular CLI (opcional)

```bash
npm install -g @angular/cli
```

## Instalación

1. Descomprime este proyecto.
2. En la raíz del proyecto:

```bash
npm install
```

## Ejecutar en local

```bash
npm start
# o
npx ng serve
```

La aplicación quedará disponible en:

- `http://localhost:4200/`

## Login de prueba

- Usuario: cualquiera
- Contraseña: cualquiera

El login actual es **mock**: guarda un token dummy en `localStorage`.  
Puedes conectar `AuthService` a tu API NestJS de autenticación.

## API de rifas

El servicio `RifasService` actualmente tiene datos **mock** para que puedas ver el diseño
aunque no tengas el backend listo.

- Ajusta `baseUrl` en `src/app/rifas/services/rifas.service.ts` a tu endpoint real NestJS.
- Cambia los métodos `getRifas`, `getRifaById`, etc. para usar `this.http` en vez de datos mock.

## Estructura principal

- Layout con `mat-sidenav` + `mat-toolbar` moderno.
- Módulo `auth`: login con Angular Material.
- Módulo `rifas`:
  - Lista de rifas con tabla Material, chips de estado y barra de progreso.
  - Formulario para crear / editar rifa.
  - Detalle de rifa con acciones de cerrar y ejecutar sorteo.
