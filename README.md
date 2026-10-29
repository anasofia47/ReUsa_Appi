# Proyecto ReUsa · Campus TdeA

Plataforma de economía circular y reutilización de útiles, libros y tecnología para estudiantes del Tecnológico de Antioquia.

## Estructura del Proyecto

El proyecto está organizado según las guías de desarrollo de la asignatura:

1. **`reusa_api/` (Guía 1: API REST y Sitio Web)**
   - API REST construida con Next.js 16 (App Router), Firebase Admin SDK, TypeScript y Zod.
   - Sitio Web interactivo con Server Components y Server Actions en Tailwind CSS 4.
   - Soporte para roles: **Estudiante**, **Supervisor** y **Administrador**.
   - Flujo de aprobación previa de publicaciones por supervisores.
   - Peticiones de objetos entre estudiantes con notificación al publicador e historial de entregas.
   - Módulo de reportes administrativos por usuario, categoría y rango de fechas.
   - Documentación OpenAPI 3.1 y Swagger UI en `/api/docs`.
   - Pruebas unitarias con Vitest y verificación completa (`pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`).

2. **`ReUsaApp/` (Guía 2: Aplicación Móvil)**
   - Aplicación móvil React Native con Expo para consumir la API de `reusa_api`.
