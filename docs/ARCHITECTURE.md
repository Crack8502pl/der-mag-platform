# Grover Platform - Architektura Systemu

**Wersja:** 1.0.0  
**Data:** 2025-11-09  
**Status:** Production Ready  

---

## 🔐 Security Architecture

Middleware stack dla requestów HTTP:

```
Request → requestIdMiddleware → helmet → CORS → CSRF → rateLimiter
       → verifyWebhookSignature (dla /webhooks)
       → authenticate (dla chronionych tras)
       → validate (DTO validation)
       → controller
       → errorHandler
```

---

## 📐 Przegląd architektury

Grover Platform to zaawansowany system zarządzania zadaniami infrastrukturalnymi zbudowany w architekturze trzywarstwowej (three-tier architecture) z separacją warstw prezentacji, logiki biznesowej i danych.

### Główne komponenty:

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web Client  │  │ Mobile App   │  │  API Tester  │      │
│  │  (React)     │  │ (React Nat.) │  │  (HTML)      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                            ▼                                 │
│                    ┌───────────────┐                         │
│                    │   REST API    │                         │
│                    │   (Express)   │                         │
│                    └───────┬───────┘                         │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                    APPLICATION LAYER                          │
│                            │                                  │
│    ┌───────────────────────┴────────────────────┐            │
│    │          Express.js Application            │            │
│    └────────────────┬───────────────────────────┘            │
│                     │                                         │
│    ┌────────────────┼───────────────────────┐                │
│    │                ▼                       │                │
│    │    ┌──────────────────────┐           │                │
│    │    │    Controllers (9)    │           │                │
│    │    └──────────┬───────────┘           │                │
│    │               │                        │                │
│    │    ┌──────────▼───────────┐           │                │
│    │    │     Services (6)     │           │                │
│    │    └──────────┬───────────┘           │                │
│    │               │                        │                │
│    │    ┌──────────▼───────────┐           │                │
│    │    │   TypeORM Repository │           │                │
│    │    └──────────────────────┘           │                │
│    │                                        │                │
│    │    ┌──────────────────────┐           │                │
│    │    │   Middleware (4)     │◄──────────┘                │
│    │    │  - Auth              │                             │
│    │    │  - RBAC              │                             │
│    │    │  - Upload            │                             │
│    │    │  - Validation        │                             │
│    │    └──────────────────────┘                             │
│    │                                                          │
└────┼──────────────────────────────────────────────────────────┘
     │
┌────┼──────────────────────────────────────────────────────────┐
│    │                   DATA LAYER                             │
│    │                                                           │
│    │    ┌────────────────────────────────────┐                │
│    └───►│      PostgreSQL 15 Database        │                │
│         │                                    │                │
│         │  ┌──────────────────────────────┐ │                │
│         │  │      13 Tables:              │ │                │
│         │  │  • users                     │ │                │
│         │  │  • roles                     │ │                │
│         │  │  • tasks                     │ │                │
│         │  │  • task_types                │ │                │
│         │  │  • bom_templates             │ │                │
│         │  │  • task_materials            │ │                │
│         │  │  • devices                   │ │                │
│         │  │  • ip_pools                  │ │                │
│         │  │  • activity_templates        │ │                │
│         │  │  • task_activities           │ │                │
│         │  │  • quality_photos            │ │                │
│         │  │  • task_assignments          │ │                │
│         │  │  • task_metrics              │ │                │
│         │  └──────────────────────────────┘ │                │
│         │                                    │                │
│         │  15+ Indexes | Foreign Keys        │                │
│         │  JSONB Support | Full Text Search │                │
│         └────────────────────────────────────┘                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🏗 Backend Architecture (Node.js + TypeScript)

### Struktura projektu:

```
backend/
├── src/
│   ├── config/              # Konfiguracja aplikacji
│   │   ├── database.ts      # TypeORM DataSource
│   │   ├── jwt.ts           # JWT configuration
│   │   └── constants.ts     # Application constants
│   │
│   ├── entities/            # TypeORM Entities (13)
│   │   ├── User.ts
│   │   ├── Role.ts
│   │   ├── Task.ts
│   │   ├── TaskType.ts
│   │   ├── BOMTemplate.ts
│   │   ├── TaskMaterial.ts
│   │   ├── Device.ts
│   │   ├── IPPool.ts
│   │   ├── ActivityTemplate.ts
│   │   ├── TaskActivity.ts
│   │   ├── QualityPhoto.ts
│   │   ├── TaskAssignment.ts
│   │   └── TaskMetric.ts
│   │
│   ├── controllers/         # HTTP Controllers (9)
│   │   ├── AuthController.ts
│   │   ├── TaskController.ts
│   │   ├── BOMController.ts
│   │   ├── DeviceController.ts
│   │   ├── ActivityController.ts
│   │   ├── QualityController.ts
│   │   ├── IPManagementController.ts
│   │   ├── MetricsController.ts
│   │   └── UserController.ts
│   │
│   ├── services/            # Business Logic (6)
│   │   ├── TaskService.ts
│   │   ├── TaskNumberGenerator.ts
│   │   ├── BOMService.ts
│   │   ├── IPAllocator.ts
│   │   ├── PhotoService.ts
│   │   └── MetricsService.ts
│   │
│   ├── middleware/          # Express Middleware (4)
│   │   ├── auth.ts          # JWT verification
│   │   ├── roleCheck.ts     # RBAC authorization
│   │   ├── upload.ts        # Multer file upload
│   │   └── validation.ts    # Request validation
│   │
│   ├── routes/              # API Routes (10)
│   │   ├── auth.routes.ts
│   │   ├── task.routes.ts
│   │   ├── bom.routes.ts
│   │   ├── device.routes.ts
│   │   ├── activity.routes.ts
│   │   ├── quality.routes.ts
│   │   ├── ip.routes.ts
│   │   ├── metrics.routes.ts
│   │   ├── user.routes.ts
│   │   └── index.ts
│   │
│   ├── dto/                 # Data Transfer Objects (4)
│   │   ├── CreateTaskDto.ts
│   │   ├── UpdateTaskDto.ts
│   │   ├── CreateUserDto.ts
│   │   └── LoginDto.ts
│   │
│   ├── utils/               # Utility Functions (3)
│   │   ├── hash.ts
│   │   ├── jwt.ts
│   │   └── pagination.ts
│   │
│   ├── app.ts               # Express application setup
│   └── index.ts             # Entry point
│
├── scripts/                 # Database scripts
│   ├── init-db.sql
│   ├── seed-data.sql
│   └── add-service-tasks.sql
│
├── public/                  # Static files
│   └── api-tester.html
│
├── uploads/                 # Uploaded files
│   ├── photos/
│   └── thumbnails/
│
├── package.json
├── tsconfig.json
├── .env.example
└── Dockerfile
```

---

## 🗄 Database Schema (PostgreSQL)

### Entity Relationship Diagram:

```
┌──────────────┐         ┌──────────────┐
│    roles     │         │    users     │
├──────────────┤         ├──────────────┤
│ id (PK)      │◄────┐   │ id (PK)      │
│ name         │     └───│ role_id (FK) │
│ description  │         │ username     │
│ permissions  │         │ email        │
│ created_at   │         │ password     │
│ updated_at   │         │ first_name   │
└──────────────┘         │ last_name    │
                         │ phone        │
                         │ active       │
                         │ refresh_token│
                         │ created_at   │
                         │ updated_at   │
                         │ deleted_at   │
                         └──────┬───────┘
                                │
                                │ created_by
                                │
                                ▼
┌──────────────┐         ┌──────────────┐
│ task_types   │         │    tasks     │
├──────────────┤         ├──────────────┤
│ id (PK)      │◄────┐   │ id (PK)      │
│ name         │     └───│ task_type_id │
│ description  │         │ task_number  │ (UNIQUE, 9-digit)
│ code         │         │ title        │
│ active       │         │ description  │
│ configuration│         │ status       │
│ created_at   │         │ location     │
│ updated_at   │         │ client       │
└──────┬───────┘         │ planned_start│
       │                 │ planned_end  │
       │                 │ actual_start │
       │                 │ actual_end   │
       │                 │ priority     │
       │                 │ metadata     │
       │                 │ created_at   │
       │                 │ updated_at   │
       │                 │ deleted_at   │
       │                 └──────┬───────┘
       │                        │
       ├────────────────────────┼────────────────┐
       │                        │                │
       ▼                        ▼                ▼
┌──────────────┐       ┌──────────────┐  ┌──────────────┐
│bom_templates │       │task_materials│  │task_activities│
├──────────────┤       ├──────────────┤  ├──────────────┤
│ id (PK)      │       │ id (PK)      │  │ id (PK)      │
│ task_type_id │       │ task_id (FK) │  │ task_id (FK) │
│ name         │       │ template_id  │  │ template_id  │
│ category     │       │ quantity_used│  │ completed    │
│ part_number  │       │ serial_number│  │ completed_at │
│ unit         │       │ notes        │  │ completed_by │
│ est_quantity │       │ created_at   │  │ photo_url    │
│ is_serialized│       │ updated_at   │  │ notes        │
│ created_at   │       └──────────────┘  │ created_at   │
│ updated_at   │                         │ updated_at   │
└──────────────┘                         └──────────────┘
       │
       │ task_type_id
       │
       ▼
┌──────────────┐       ┌──────────────┐
│activity_temps│       │task_assignmen│
├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │
│ task_type_id │       │ task_id (FK) │
│ name         │       │ user_id (FK) │
│ description  │       │ assigned_at  │
│ sequence     │       │ assigned_by  │
│ parent_id    │       │ created_at   │
│ is_required  │       │ updated_at   │
│ photo_required│      └──────────────┘
│ created_at   │
│ updated_at   │       ┌──────────────┐
└──────────────┘       │quality_photos│
                       ├──────────────┤
       ▼               │ id (PK)      │
┌──────────────┐       │ task_id (FK) │
│  ip_pools    │       │ activity_id  │
├──────────────┤       │ file_path    │
│ id (PK)      │       │ thumbnail    │
│ task_type_id │       │ latitude     │
│ pool_name    │       │ longitude    │
│ cidr         │       │ taken_at     │
│ description  │       │ uploaded_by  │
│ total_ips    │       │ approved     │
│ used_ips     │       │ approved_by  │
│ created_at   │       │ approved_at  │
│ updated_at   │       │ created_at   │
└──────────────┘       │ updated_at   │
                       └──────────────┘
       ▼
┌──────────────┐       ┌──────────────┐
│   devices    │       │ task_metrics │
├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │
│ task_id (FK) │       │ task_id (FK) │
│ device_type  │       │ metric_name  │
│ serial_number│       │ metric_value │
│ manufacturer │       │ recorded_at  │
│ model        │       │ created_at   │
│ ip_address   │       │ updated_at   │
│ mac_address  │       └──────────────┘
│ prefabricated│
│ verified     │
│ verified_by  │
│ verified_at  │
│ created_at   │
│ updated_at   │
└──────────────┘
```

### Indexes Strategy:

```sql
-- Primary Keys (automatic)
CREATE INDEX ON users(id);
CREATE INDEX ON tasks(id);
-- ... for all tables

-- Unique Constraints
CREATE UNIQUE INDEX idx_tasks_task_number ON tasks(task_number);
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_roles_name ON roles(name);
CREATE UNIQUE INDEX idx_task_types_code ON task_types(code);
CREATE UNIQUE INDEX idx_devices_serial ON devices(serial_number);

-- Foreign Key Indexes
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_tasks_task_type_id ON tasks(task_type_id);
CREATE INDEX idx_task_materials_task_id ON task_materials(task_id);
CREATE INDEX idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX idx_devices_task_id ON devices(task_id);
CREATE INDEX idx_quality_photos_task_id ON quality_photos(task_id);
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id);

-- Query Optimization Indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX idx_users_active ON users(active);

-- Composite Indexes
CREATE INDEX idx_tasks_type_status ON tasks(task_type_id, status);
CREATE INDEX idx_tasks_location_status ON tasks(location, status);
CREATE INDEX idx_devices_type_verified ON devices(device_type, verified);

-- Full Text Search (optional)
CREATE INDEX idx_tasks_search ON tasks USING gin(to_tsvector('polish', title || ' ' || description));
```

### JSONB Fields:

**roles.permissions:**
```json
{
  "all": true,  // Admin: full access
  "tasks": {
    "read": true,
    "create": true,
    "update": true,
    "delete": true,
    "assign": true
  },
  "users": {
    "read": true,
    "create": true,
    "update": true
  },
  "bom": {
    "read": true,
    "create": true,
    "update": true,
    "delete": true
  }
}
```

**Coordinator (restricted create):**
```json
{
  "tasks": {
    "read": true,
    "update": true,
    "create": ["SERWIS"],  // Array of allowed task type codes!
    "assign": true
  },
  "users": {
    "read": true
  }
}
```

**task_types.configuration:**
```json
{
  "has_bom": true,
  "has_ip_config": true,
  "requires_gps": false,
  "max_photos": 50
}
```

**tasks.metadata:**
```json
{
  "contract_number": "PKP-2024-001",
  "po_number": "PO-12345",
  "custom_fields": {
    "station": "Warszawa Centralna",
    "platform": "3"
  }
}
```

---

## 🔐 Security Architecture

### Authentication Flow:

```
┌─────────────┐                                    ┌─────────────┐
│   Client    │                                    │   Server    │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │  1. POST /api/auth/login                        │
       │     { username, password }                      │
       ├────────────────────────────────────────────────►│
       │                                                  │
       │                              2. Verify password  │
       │                                 (bcrypt.compare) │
       │                                                  │
       │                              3. Generate tokens │
       │                                 - Access (8h)   │
       │                                 - Refresh (7d)  │
       │                                                  │
       │  4. Response                                    │
       │     { accessToken, refreshToken, user }         │
       │◄────────────────────────────────────────────────┤
       │                                                  │
       │  5. Store tokens                                │
       │     localStorage / SecureStorage                │
       │                                                  │
       │  6. API Request                                 │
       │     Authorization: Bearer <accessToken>         │
       ├────────────────────────────────────────────────►│
       │                                                  │
       │                              7. Verify JWT      │
       │                                 (jwt.verify)    │
       │                                                  │
       │                              8. Check role      │
       │                                 (RBAC)          │
       │                                                  │
       │  9. Response                                    │
       │     { success: true, data: ... }                │
       │◄────────────────────────────────────────────────┤
       │                                                  │
       │  (After 8 hours)                                │
       │                                                  │
       │  10. Access token expired                       │
       │      Response: 401 Unauthorized                 │
       │◄────────────────────────────────────────────────┤
       │                                                  │
       │  11. POST /api/auth/refresh                     │
       │      { refreshToken }                           │
       ├────────────────────────────────────────────────►│
       │                                                  │
       │                              12. Verify refresh │
       │                                  Generate new   │
       │                                  accessToken    │
       │                                                  │
       │  13. Response                                   │
       │      { accessToken }                            │
       │◄────────────────────────────────────────────────┤
       │                                                  │
       │  14. Continue with new token                    │
       │                                                  │
```

### Authorization (RBAC):

```typescript
// middleware/auth.ts
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Brak tokenu' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Nieprawidłowy token' });
  }
}

// middleware/roleCheck.ts
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getUserWithRole(req.userId);
    
    if (!user || !user.active) {
      return res.status(403).json({ message: 'Użytkownik nieaktywny' });
    }

    // Admin has access to everything
    if (user.role.name === 'admin') {
      return next();
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(user.role.name)) {
      return res.status(403).json({ 
        message: 'Brak uprawnień',
        required: allowedRoles,
        current: user.role.name
      });
    }

    next();
  };
}

// Usage in routes:
router.post('/tasks', 
  authenticate, 
  requireRole('admin', 'manager', 'coordinator'), 
  TaskController.create
);
```

### Granular Permission Check:

```typescript
// controllers/TaskController.ts - create method
async create(req: Request, res: Response) {
  const user = await getUser(req.userId);
  const taskType = await getTaskType(req.body.taskTypeId);

  // Check granular permissions for coordinator
  if (user.role.name === 'coordinator') {
    const allowedTypes = user.role.permissions?.tasks?.create;
    
    if (!Array.isArray(allowedTypes) || !allowedTypes.includes(taskType.code)) {
      return res.status(403).json({
        success: false,
        message: `Nie masz uprawnień do tworzenia zadań typu ${taskType.name}`,
        allowed_types: allowedTypes
      });
    }
  }

  // Continue with task creation...
}
```

### Security Headers (Helmet.js):

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Rate Limiting:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Zbyt wiele zapytań z tego adresu IP, spróbuj ponownie później.'
});

app.use('/api/', limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Zbyt wiele prób logowania, spróbuj ponownie za 15 minut.'
});

app.use('/api/auth/login', authLimiter);
```

---

## 🔄 API Request Flow

### Complete request lifecycle:

```
Client Request
      │
      ▼
┌─────────────────┐
│ Express Router  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Rate Limiter    │ (100 req/15min)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CORS Middleware │ (origin check)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Body Parser     │ (JSON, 10MB limit)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auth Middleware │ (JWT verification)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Role Check      │ (RBAC authorization)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validation      │ (class-validator DTOs)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Controller     │ (HTTP handling)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Service       │ (business logic)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Repository     │ (TypeORM)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │ (database)
└────────┬────────┘
         │
         ▼
    Response
         │
         ▼
┌─────────────────┐
│ Error Handler   │ (catch all errors)
└────────┬────────┘
         │
         ▼
   Client Response
```

### Example: Create Task Request

**Request:**
```http
POST /api/tasks HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Montaż SMW Warszawa Centralna",
  "taskTypeId": 1,
  "location": "Warszawa Centralna, Peron 3",
  "client": "PKP PLK",
  "priority": "high",
  "plannedStart": "2025-11-15",
  "plannedEnd": "2025-11-30"
}
```

**Processing Flow:**

1. **Rate Limiter:** Check IP quota (✅ 45/100 requests)
2. **CORS:** Verify origin (✅ localhost:3001 allowed)
3. **Body Parser:** Parse JSON (✅ valid JSON)
4. **Auth Middleware:**
   ```typescript
   const decoded = jwt.verify(token, JWT_SECRET);
   // { userId: 5, role: "manager", iat: ..., exp: ... }
   req.userId = 5;
   req.userRole = "manager";
   ```
5. **Role Check:** Verify 'manager' role (✅ has permission)
6. **Validation:** Validate CreateTaskDto (✅ all required fields present)
7. **Controller:** TaskController.create()
   - Generate task number: 123456789
   - Check manager permissions (✅ can create all types)
8. **Service:** TaskService.createTask()
   - Create task entity
   - Auto-assign BOM templates
   - Allocate IP if needed
9. **Repository:** TypeORM save()
   ```sql
   INSERT INTO tasks (task_number, title, task_type_id, location, ...)
   VALUES ('123456789', 'Montaż SMW...', 1, 'Warszawa...', ...);
   ```
10. **Response:**
    ```json
    {
      "success": true,
      "data": {
        "id": 42,
        "taskNumber": "123456789",
        "title": "Montaż SMW Warszawa Centralna",
        "status": "created",
        "taskType": {
          "id": 1,
          "name": "System Monitoringu Wizyjnego"
        },
        "createdAt": "2025-11-09T12:34:56.789Z"
      }
    }
    ```

---

## 📤 File Upload Architecture

### Photo Upload Flow:

```
Mobile/Web Client
      │
      │ 1. Select photo
      ▼
┌─────────────────┐
│  Upload Form    │
│  (multipart)    │
└────────┬────────┘
         │
         │ 2. POST /api/quality/photos
         │    Content-Type: multipart/form-data
         │    - file: [JPEG, 5.2MB]
         │    - taskId: 42
         │    - activityId: 15
         ▼
┌─────────────────┐
│ Multer          │
│ Middleware      │
│                 │
│ - Size check    │ < 10MB
│ - Type check    │ image/jpeg
│ - Save temp     │ /tmp/upload_xyz.jpg
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ QualityContr.   │
│ upload()        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PhotoService    │
│                 │
│ 1. Extract EXIF │
│    - GPS coords │
│    - Timestamp  │
│    - Camera     │
│                 │
│ 2. Compress     │
│    Sharp        │
│    1920x1080    │
│    quality: 80% │
│    → 800KB      │
│                 │
│ 3. Thumbnail    │
│    200x200      │
│    quality: 70% │
│    → 15KB       │
│                 │
│ 4. Save files   │
│    uploads/     │
│    photos/      │
│    thumbnails/  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Database        │
│ quality_photos  │
│                 │
│ INSERT:         │
│  file_path      │
│  thumbnail_path │
│  latitude       │
│  longitude      │
│  taken_at       │
│  uploaded_by    │
└────────┬────────┘
         │
         ▼
    Response
    {
      "success": true,
      "data": {
        "id": 123,
        "filePath": "/uploads/photos/task_42_photo_123.jpg",
        "thumbnailPath": "/uploads/thumbnails/task_42_thumb_123.jpg",
        "latitude": 52.2297,
        "longitude": 21.0122,
        "takenAt": "2025-11-09T10:30:00Z"
      }
    }
```

### Sharp Image Processing:

```typescript
// services/PhotoService.ts
export class PhotoService {
  async processPhoto(filePath: string): Promise<PhotoData> {
    const tempPath = filePath;
    const finalPath = path.join(UPLOAD_DIR, 'photos', `photo_${Date.now()}.jpg`);
    const thumbPath = path.join(UPLOAD_DIR, 'thumbnails', `thumb_${Date.now()}.jpg`);

    // Extract EXIF
    const exif = await exifr.parse(tempPath, { gps: true, exif: true });
    const gps = exif?.latitude && exif?.longitude 
      ? { lat: exif.latitude, lon: exif.longitude }
      : null;
    const takenAt = exif?.DateTimeOriginal || new Date();

    // Compress main image
    await sharp(tempPath)
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80, progressive: true })
      .toFile(finalPath);

    // Generate thumbnail
    await sharp(tempPath)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 70 })
      .toFile(thumbPath);

    // Clean up temp file
    fs.unlinkSync(tempPath);

    return {
      filePath: finalPath,
      thumbnailPath: thumbPath,
      latitude: gps?.lat,
      longitude: gps?.lon,
      takenAt
    };
  }
}
```

---

## 🔢 Task Number Generation Algorithm

### Generator Logic:

```typescript
// services/TaskNumberGenerator.ts
export class TaskNumberGenerator {
  /**
   * Generate unique 9-digit task number
   * Range: 100000000 - 999999999
   * Retry: max 10 attempts
   */
  static async generate(): Promise<string> {
    const taskRepository = AppDataSource.getRepository(Task);
    const maxAttempts = 10;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random 9-digit number
      const min = 100000000;
      const max = 999999999;
      const number = Math.floor(Math.random() * (max - min + 1)) + min;
      const taskNumber = number.toString();
      
      // Check uniqueness
      const existing = await taskRepository.findOne({
        where: { taskNumber }
      });
      
      if (!existing) {
        return taskNumber;
      }
      
      console.warn(`Task number ${taskNumber} collision, retry ${attempt + 1}/${maxAttempts}`);
    }
    
    throw new Error('Failed to generate unique task number after 10 attempts');
  }
}
```

**Why 9 digits?**
- Total combinations: 900,000,000
- Expected tasks per year: ~1,000 - 10,000
- Collision probability: ~0.000001%
- Human-readable and memorable
- Compatible with QR codes

---

## 🌐 IP Allocation Algorithm

### CIDR Pool Management:

```typescript
// services/IPAllocator.ts
export class IPAllocator {
  /**
   * Allocate IP address from CIDR pool
   * Example: 192.168.1.0/24 → 192.168.1.1 - 192.168.1.254
   */
  static async allocate(poolId: number, taskId: number): Promise<string> {
    const pool = await AppDataSource.getRepository(IPPool).findOne({
      where: { id: poolId }
    });
    
    if (!pool) {
      throw new Error('IP pool not found');
    }

    // Parse CIDR
    const [network, prefixLength] = pool.cidr.split('/');
    const totalIPs = Math.pow(2, 32 - parseInt(prefixLength)) - 2; // -2 for network and broadcast

    // Get used IPs from devices table
    const usedIPs = await AppDataSource.getRepository(Device)
      .createQueryBuilder('device')
      .select('device.ipAddress')
      .where('device.taskId = :taskId', { taskId })
      .andWhere('device.ipAddress IS NOT NULL')
      .getMany();

    const usedSet = new Set(usedIPs.map(d => d.ipAddress));

    // Find first available IP
    const baseIP = this.ipToNumber(network);
    for (let i = 1; i <= totalIPs; i++) {
      const candidateIP = this.numberToIP(baseIP + i);
      
      if (!usedSet.has(candidateIP)) {
        // Update pool usage
        pool.usedIps += 1;
        await AppDataSource.getRepository(IPPool).save(pool);
        
        return candidateIP;
      }
    }

    throw new Error('No available IPs in pool');
  }

  private static ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  }

  private static numberToIP(num: number): string {
    return [
      (num >>> 24) & 0xFF,
      (num >>> 16) & 0xFF,
      (num >>> 8) & 0xFF,
      num & 0xFF
    ].join('.');
  }

  static async release(ipAddress: string, poolId: number): Promise<void> {
    const pool = await AppDataSource.getRepository(IPPool).findOne({
      where: { id: poolId }
    });
    
    if (pool && pool.usedIps > 0) {
      pool.usedIps -= 1;
      await AppDataSource.getRepository(IPPool).save(pool);
    }
  }
}
```

---

## 📊 Metrics & Analytics Architecture

### Dashboard Data Aggregation:

```typescript
// services/MetricsService.ts
export class MetricsService {
  /**
   * Real-time dashboard metrics
   */
  static async getDashboard(): Promise<DashboardData> {
    const taskRepo = AppDataSource.getRepository(Task);
    
    // Aggregate queries (optimized with indexes)
    const [
      totalTasks,
      activeTasks,
      completedTasks,
      todayTasks,
      tasksByType,
      tasksByStatus,
      avgCompletionTime
    ] = await Promise.all([
      taskRepo.count({ where: { deletedAt: IsNull() } }),
      
      taskRepo.count({ 
        where: { 
          status: In(['assigned', 'started', 'in_progress']),
          deletedAt: IsNull()
        }
      }),
      
      taskRepo.count({ 
        where: { 
          status: 'completed',
          deletedAt: IsNull()
        }
      }),
      
      taskRepo.count({
        where: {
          createdAt: MoreThan(new Date(new Date().setHours(0,0,0,0))),
          deletedAt: IsNull()
        }
      }),
      
      taskRepo.createQueryBuilder('task')
        .select('task_type.name', 'taskType')
        .addSelect('COUNT(*)', 'count')
        .leftJoin('task.taskType', 'task_type')
        .where('task.deleted_at IS NULL')
        .groupBy('task_type.name')
        .getRawMany(),
      
      taskRepo.createQueryBuilder('task')
        .select('task.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('task.deleted_at IS NULL')
        .groupBy('task.status')
        .getRawMany(),
      
      taskRepo.createQueryBuilder('task')
        .select('AVG(EXTRACT(EPOCH FROM (task.actual_end - task.actual_start)))', 'avg')
        .where('task.status = :status', { status: 'completed' })
        .andWhere('task.actual_start IS NOT NULL')
        .andWhere('task.actual_end IS NOT NULL')
        .getRawOne()
    ]);

    return {
      total: totalTasks,
      active: activeTasks,
      completed: completedTasks,
      today: todayTasks,
      byType: tasksByType,
      byStatus: tasksByStatus,
      avgCompletionTime: avgCompletionTime?.avg || 0
    };
  }
}
```

---

## 🔄 Offline-First Strategy (Mobile)

### Planned mobile architecture:

```
┌────────────────────────────────────────────────┐
│             Mobile App (React Native)          │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │         UI Components                    │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
│  ┌──────────────▼───────────────────────────┐  │
│  │         Redux Store                      │  │
│  │  - tasks: []                             │  │
│  │  - syncQueue: []                         │  │
│  │  - offline: boolean                      │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
│  ┌──────────────▼───────────────────────────┐  │
│  │         Sync Middleware                  │  │
│  │  - Queue offline actions                 │  │
│  │  - Replay when online                    │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
│  ┌──────────────▼───────────────────────────┐  │
│  │         SQLite Database                  │  │
│  │  - tasks (cached)                        │  │
│  │  - photos (local)                        │  │
│  │  - sync_queue (pending)                  │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
└─────────────────┼───────────────────────────────┘
                  │
                  │ Background Sync Worker
                  │ (runs every 5 minutes when online)
                  │
                  ▼
          ┌───────────────┐
          │  Backend API  │
          └───────────────┘
```

### Sync Strategy:

1. **Read Operations:**
   - Always read from SQLite (fast, offline-capable)
   - Background sync updates SQLite when online
   - Optimistic UI updates

2. **Write Operations:**
   - Write to SQLite immediately (instant feedback)
   - Add to sync queue
   - Background worker syncs to backend
   - Resolve conflicts (last-write-wins or manual)

3. **Photo Uploads:**
   - Store locally in app directory
   - Compress before upload
   - Upload in background when on WiFi
   - Retry failed uploads

---

## 🔧 Configuration Management

### Environment-based Configuration:

```typescript
// config/index.ts
export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'dermag_platform',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development'
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    accessExpires: process.env.JWT_EXPIRES_IN || '8h',
    refreshExpires: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
  },
  
  // Upload
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  
  // Security
  security: {
    bcryptRounds: 10,
    rateLimitWindow: 15 * 60 * 1000, // 15 min
    rateLimitMax: 100
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true
  }
};
```

---

## 🚀 Deployment Architecture

### Production Stack (planned):

```
┌────────────────────────────────────────────────────────────┐
│                        Internet                             │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│                   Firewall / WireGuard VPN                  │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│               Nginx Reverse Proxy (SSL)                     │
│  - HTTPS termination (Let's Encrypt)                        │
│  - Load balancing                                           │
│  - Static file serving                                      │
│  - Rate limiting                                            │
└───────────────────────┬────────────────────────────────────┘
                        │
                ┌───────┴────────┐
                │                │
                ▼                ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Backend API        │  │  Frontend Web       │
│  (Docker)           │  │  (Docker)           │
│  - Node.js          │  │  - React SPA        │
│  - TypeScript       │  │  - Nginx            │
│  - Express          │  │                     │
│  - PM2              │  │                     │
└──────────┬──────────┘  └─────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────────┐
│               PostgreSQL 15 (Docker Volume)                 │
│  - Master-Slave replication (planned)                       │
│  - Daily backups to S3                                      │
│  - Point-in-time recovery                                   │
└────────────────────────────────────────────────────────────┘
```

### Docker Compose (example):

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dermag_platform
      POSTGRES_USER: dermag_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dermag_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - uploads:/app/uploads
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - uploads:/usr/share/nginx/uploads
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  pgdata:
  uploads:
```

---

## 📏 Performance Considerations

### Query Optimization:

```typescript
// BAD: N+1 Query Problem
const tasks = await taskRepo.find();
for (const task of tasks) {
  const taskType = await taskTypeRepo.findOne(task.taskTypeId);
  // ...
}

// GOOD: Eager loading with relations
const tasks = await taskRepo.find({
  relations: ['taskType', 'assignments', 'assignments.user']
});

// BETTER: Query builder with specific fields
const tasks = await taskRepo.createQueryBuilder('task')
  .select(['task.id', 'task.taskNumber', 'task.title', 'task.status'])
  .leftJoinAndSelect('task.taskType', 'taskType')
  .where('task.deleted_at IS NULL')
  .orderBy('task.created_at', 'DESC')
  .take(20)
  .getMany();
```

### Pagination:

```typescript
// Cursor-based pagination (better for large datasets)
async function getTasks(cursor?: string, limit: number = 20) {
  const queryBuilder = taskRepo.createQueryBuilder('task')
    .where('task.deleted_at IS NULL')
    .orderBy('task.created_at', 'DESC')
    .take(limit);

  if (cursor) {
    const decodedCursor = Buffer.from(cursor, 'base64').toString();
    queryBuilder.andWhere('task.created_at < :cursor', { cursor: decodedCursor });
  }

  const tasks = await queryBuilder.getMany();
  
  const nextCursor = tasks.length === limit
    ? Buffer.from(tasks[tasks.length - 1].createdAt.toISOString()).toString('base64')
    : null;

  return { tasks, nextCursor };
}
```

### Caching Strategy (future):

```typescript
// Redis cache for frequently accessed data
import Redis from 'ioredis';
const redis = new Redis();

async function getTaskTypes(): Promise<TaskType[]> {
  const cacheKey = 'task_types:all';
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss - query database
  const taskTypes = await taskTypeRepo.find({ where: { active: true } });
  
  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(taskTypes));
  
  return taskTypes;
}
```

---

## 🧪 Testing Strategy (planned)

### Test Pyramid:

```
              ┌─────────────┐
              │     E2E     │ (5%)
              │  Playwright │
              └─────────────┘
            ┌─────────────────┐
            │  Integration    │ (15%)
            │   Supertest     │
            └─────────────────┘
          ┌─────────────────────┐
          │       Unit          │ (80%)
          │       Jest          │
          └─────────────────────┘
```

### Example Unit Test:

```typescript
// __tests__/services/TaskNumberGenerator.test.ts
import { TaskNumberGenerator } from '../../src/services/TaskNumberGenerator';

describe('TaskNumberGenerator', () => {
  describe('generate', () => {
    it('should generate 9-digit number', async () => {
      const number = await TaskNumberGenerator.generate();
      expect(number).toHaveLength(9);
      expect(parseInt(number)).toBeGreaterThanOrEqual(100000000);
      expect(parseInt(number)).toBeLessThanOrEqual(999999999);
    });

    it('should generate unique numbers', async () => {
      const numbers = new Set();
      for (let i = 0; i < 100; i++) {
        const number = await TaskNumberGenerator.generate();
        numbers.add(number);
      }
      expect(numbers.size).toBe(100);
    });

    it('should throw after max retries', async () => {
      // Mock repository to always return existing task
      jest.spyOn(taskRepo, 'findOne').mockResolvedValue({} as Task);
      
      await expect(TaskNumberGenerator.generate()).rejects.toThrow(
        'Failed to generate unique task number'
      );
    });
  });
});
```

---

## 📚 Dokumentacja API

Pełna dokumentacja wszystkich 41 endpoints znajduje się w:
- `backend/API_TESTING.md` - Curl examples
- `backend/README.md` - API overview
- `backend/public/api-tester.html` - Interactive testing

---

## 🎯 Scalability Considerations

### Horizontal Scaling:

```
Load Balancer
      │
      ├─────► Backend Instance 1 (PM2 cluster: 4 workers)
      │
      ├─────► Backend Instance 2 (PM2 cluster: 4 workers)
      │
      └─────► Backend Instance 3 (PM2 cluster: 4 workers)
              │
              └─────► PostgreSQL (Master)
                      │
                      ├─── Read Replica 1
                      └─── Read Replica 2
```

### Database Partitioning (future):

```sql
-- Partition tasks table by year
CREATE TABLE tasks_2025 PARTITION OF tasks
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE tasks_2026 PARTITION OF tasks
FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

---

**Dokument wygenerowany:** 2025-11-09  
**Wersja architektury:** 1.0.0  
**Status:** Production Ready  

*Copyright © 2025 Der-Mag. All rights reserved.*
