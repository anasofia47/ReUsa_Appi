# ReUsa · API REST y Plataforma Web (Guía 1)

Proyecto de Backend y Sitio Web para la plataforma **ReUsa** del Tecnológico de Antioquia (TdeA), construido siguiendo los lineamientos de la **Guía 1: API y Sitio Web**, con **Next.js 16**, **React 19**, **TypeScript**, **Firebase Admin SDK**, **Tailwind CSS 4**, **Zod** y **Vitest**.

---

## 🎯 Requerimientos y Funcionalidades Implementadas

### 1. Roles del Sistema
- **Estudiante (`student`)**:
  - Rol asignado automáticamente en el registro público.
  - Publica objetos para donar/reutilizar (quedan en estado `pending_approval`).
  - Explora el catálogo de objetos aprobados y disponibles en el campus.
  - Solicita objetos de interés mediante formulario (teléfono WhatsApp y motivo).
  - Recibe notificaciones y peticiones de interesados sobre sus objetos donados.
  - Acepta o rechaza a los interesados y confirma la entrega física del producto.
- **Supervisor (`supervisor`)**:
  - **Aprobación de publicaciones:** Recibe las solicitudes de publicación y las evalúa. Los objetos **no se publican ni aparecen en el catálogo hasta que tengan la aprobación del supervisor**.
  - Puede rechazar una publicación indicando el motivo al usuario.
- **Administrador (`admin`)**:
  - Control global y auditoría.
  - **Módulo de Reportes:** Genera y visualiza reportes de objetos publicados por usuario, distribución por categoría de objeto, métricas de entregas y filtros por **rango de fechas** (`startDate` a `endDate`).

### 2. Flujo de Publicación y Aprobación
1. Un estudiante publica un objeto desde `/items/new` o `POST /api/items`. El objeto se crea con `status = "pending_approval"`.
2. El supervisor accede al panel `/supervisor` o consulta `GET /api/items?status=pending_approval`.
3. El supervisor aprueba (`PATCH /api/items/:id/review` con `action="approve"`).
4. El objeto pasa a `status = "approved"` y queda disponible públicamente en el catálogo.

### 3. Solicitud de Producto, Notificación al Publicador y Entrega
1. Un estudiante interesado solicita el producto desde `/items/:id` o `POST /api/requests`.
2. La solicitud es **idempotente** usando `clientRequestId` (para soporte offline en Guía 2).
3. **Notificación al publicador:** La petición aparece en la pestaña *Peticiones Recibidas* del dueño de la publicación con los datos del interesado (nombre, correo, WhatsApp y motivo).
4. El publicador puede:
   - Aceptar al interesado (`approve`).
   - Rechazar (`reject`).
   - Confirmar la entrega física del producto (`deliver`).
5. Al confirmarse la entrega:
   - El objeto pasa automáticamente a no disponible (`available = false`).
   - La solicitud queda marcada como `delivered` con la fecha y hora exacta.
   - Las demás peticiones en espera para ese objeto son rechazadas.

### 4. Módulo de Reportes para Administrador
- Endpoint: `GET /api/reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&userId=&category=`
- Vista Web: `/reports`
- Muestra tarjetas de impacto (Publicados, Aprobados, Pendientes, Peticiones, Entregados) y tablas desglosadas por usuario y por categoría.

---

## 🛠️ Estructura de Endpoints de la API

| Método | Ruta | Rol / Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | Público | Comprobación de estado del servicio |
| `GET` | `/api/openapi.json` | Público | Especificación OpenAPI 3.1 generada desde Zod |
| `GET` | `/api/docs` | Público | Documentación interactiva Swagger UI |
| `POST` | `/api/auth/register` | Público | Crea usuario con rol estudiante |
| `POST` | `/api/auth/login` | Público | Inicia sesión con correo y contraseña |
| `POST` | `/api/auth/refresh` | Público | Renueva idToken con refreshToken |
| `GET` | `/api/auth/me` | Autenticado | Perfil y rol del usuario actual |
| `GET` | `/api/items` | Autenticado | Catálogo de objetos (búsqueda, filtro y sync incremental) |
| `POST` | `/api/items` | Autenticado | Crea publicación (queda `pending_approval`) |
| `GET` | `/api/items/:id` | Autenticado | Detalle de un objeto |
| `PATCH` | `/api/items/:id/review` | Supervisor / Admin | Aprueba o rechaza una publicación |
| `GET` | `/api/items/:id/cover` | Público | Imagen del objeto (con caché) |
| `PUT` | `/api/items/:id/cover` | Publicador / Admin | Sube foto en base64 (valida magic bytes) |
| `GET` | `/api/requests` | Autenticado | Historial de peticiones recibidas o enviadas |
| `POST` | `/api/requests` | Autenticado | Solicita un objeto (idempotente) |
| `GET` | `/api/requests/:id` | Autenticado | Detalle de una petición |
| `PATCH` | `/api/requests/:id` | Publicador / Admin | Acepta, rechaza o confirma entrega |
| `GET` | `/api/reports` | Admin / Supervisor | Reportes con rango de fechas, usuario y categoría |

---

## 🧪 Pruebas y Calidad de Código

El proyecto cumple con los 4 puntos de control exigidos por la Guía 1:
```bash
pnpm typecheck   # 0 errores de tipado con Next.js Typegen
pnpm test        # 6 suites de pruebas unitarias en verde (35 pruebas)
pnpm lint        # 0 advertencias ni errores de ESLint
pnpm build       # Compilación exitosa para producción con App Router y Turbopack
```

---

## 🚀 Puesta en Marcha

1. Copia `.env.example` a `.env` y configura tus credenciales de Firebase:
   ```env
   FIREBASE_PROJECT_ID=tu-proyecto
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@...
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_WEB_API_KEY=AIzaSy...
   ```
2. Cargar objetos iniciales de prueba:
   ```bash
   pnpm seed
   ```
3. Iniciar el servidor de desarrollo:
   ```bash
   pnpm dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) para la interfaz web o [http://localhost:3000/api/docs](http://localhost:3000/api/docs) para la documentación interactiva Swagger UI.
