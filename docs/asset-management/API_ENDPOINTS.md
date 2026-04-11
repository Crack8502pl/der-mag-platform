# Asset Management API Endpoints

## Base URL
All endpoints are prefixed with `/api`

## Authentication
All endpoints require authentication via JWT token in `Authorization` header.

---

## Assets

### 1. Get All Assets (with filters)

**GET** `/api/assets`

Query all assets with optional filters and pagination.

**Query Parameters:**
```typescript
{
  page?: number;           // Page number (default: 1)
  limit?: number;          // Items per page (default: 50, max: 100)
  type?: string;           // Filter by asset_type (PRZEJAZD, LCS, CUID, etc.)
  status?: string;         // Filter by status (active, planned, etc.)
  contractId?: number;     // Filter by contract
  subsystemId?: number;    // Filter by subsystem
  search?: string;         // Search in name, asset_number, location
  sortBy?: string;         // Sort field (created_at, name, asset_number)
  sortOrder?: 'asc'|'desc';// Sort direction
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "id": 1,
        "assetNumber": "OBJ-0000010426",
        "assetType": "PRZEJAZD",
        "name": "Przejazd LK-123 km 45,678",
        "category": "KAT A",
        "status": "active",
        "liniaKolejowa": "LK-123",
        "kilometraz": "45,678",
        "gpsLatitude": 52.1234,
        "gpsLongitude": 21.5678,
        "miejscowosc": "Warszawa",
        "contractId": 5,
        "subsystemId": 12,
        "actualInstallationDate": "2026-01-15",
        "warrantyExpiryDate": "2028-01-15",
        "lastServiceDate": "2026-03-10",
        "createdAt": "2026-01-10T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 156,
      "totalPages": 4
    }
  }
}
```

**Permissions:** Any authenticated user

---

### 2. Get Asset by ID

**GET** `/api/assets/:id`

Get detailed information about a specific asset.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "assetNumber": "OBJ-0000010426",
    "assetType": "PRZEJAZD",
    "name": "Przejazd LK-123 km 45,678",
    "category": "KAT A",
    "status": "active",
    "liniaKolejowa": "LK-123",
    "kilometraz": "45,678",
    "gpsLatitude": 52.1234,
    "gpsLongitude": 21.5678,
    "googleMapsUrl": "https://maps.google.com/?q=52.1234,21.5678",
    "miejscowosc": "Warszawa",
    "contractId": 5,
    "subsystemId": 12,
    "installationTaskId": 42,
    "plannedInstallationDate": "2026-01-14",
    "actualInstallationDate": "2026-01-15",
    "warrantyExpiryDate": "2028-01-15",
    "lastServiceDate": "2026-03-10",
    "nextServiceDueDate": "2027-03-10",
    "bomSnapshot": {
      "subsystemType": "SMOKIP_A",
      "materials": [
        {
          "name": "Kamera AXIS P1448-LE",
          "quantity": 2,
          "serialNumber": "ABC123",
          "deviceId": 42
        }
      ]
    },
    "notes": "Installed without issues",
    "createdAt": "2026-01-10T08:00:00Z",
    "updatedAt": "2026-03-10T14:30:00Z",
    "createdBy": 1,
    
    // Related data (populated)
    "contract": { "id": 5, "name": "K00001 - Test Contract" },
    "subsystem": { "id": 12, "systemType": "SMOKIP_A" },
    "installationTask": { "id": 42, "number": "P000001" },
    "relatedTasks": [
      {
        "id": 42,
        "number": "P000001",
        "name": "Instalacja przejazdu",
        "status": "completed",
        "role": "installation"
      },
      {
        "id": 123,
        "number": "P000045",
        "name": "Serwis gwarancyjny",
        "status": "planned",
        "role": "warranty_service"
      }
    ]
  }
}
```

**Permissions:** Any authenticated user

---

### 3. Create Asset (from Task Completion)

**POST** `/api/tasks/:taskId/complete-and-create-asset`

Complete an installation task and create the associated asset.

**Request Body:**
```json
{
  "assetData": {
    "name": "Przejazd LK-123 km 45,678",
    "category": "KAT A",
    "liniaKolejowa": "LK-123",
    "kilometraz": "45,678",
    "gpsLatitude": 52.1234,
    "gpsLongitude": 21.5678,
    "googleMapsUrl": "https://maps.google.com/?q=52.1234,21.5678",
    "miejscowosc": "Warszawa",
    "notes": "Installed without issues",
    "bomSnapshot": {
      "subsystemType": "SMOKIP_A",
      "subsystemName": "Przejazd KAT A",
      "materials": [
        {
          "name": "Kamera AXIS P1448-LE",
          "quantity": 2,
          "unit": "szt",
          "serialNumber": "ABC123456",
          "installedAt": "2026-01-15T10:30:00Z"
        }
      ]
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 42,
      "number": "P000001",
      "status": "completed",
      "linkedAssetId": 1
    },
    "asset": {
      "id": 1,
      "assetNumber": "OBJ-0000010426",
      "name": "Przejazd LK-123 km 45,678",
      "status": "installed",
      "actualInstallationDate": "2026-01-15",
      "warrantyExpiryDate": "2028-01-15"
    },
    "devicesLinked": [
      {
        "deviceId": 42,
        "serialNumber": "ABC123456",
        "status": "installed"
      }
    ]
  }
}
```

**Business Logic:**
1. Validate task is of type installation (PRZEJAZD, LCS, CUID, etc.)
2. Validate task is not already completed
3. Generate asset number (OBJ-XXXXXXMMRR)
4. Create asset record with status = 'installed'
5. Link devices from BOM by serial number:
   - Find device by `serialNumber`
   - Update `device.status = 'installed'`
   - Update `device.installed_asset_id = asset.id`
   - Store `deviceId` in BOM snapshot
6. Update task:
   - Set `status = 'completed'`
   - Set `linked_asset_id = asset.id`
   - Set `task_role = 'installation'`
7. Create entry in `asset_tasks` table
8. Set warranty expiry date (installation_date + 24 months)

**Permissions:** Manager, Admin only

---

### 4. Update Asset

**PATCH** `/api/assets/:id`

Update asset metadata (not lifecycle-critical fields).

**Request Body:** (all fields optional)
```json
{
  "name": "Updated name",
  "notes": "Additional notes",
  "nextServiceDueDate": "2027-04-10"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated name",
    "updatedAt": "2026-04-11T15:45:00Z"
  }
}
```

**Permissions:** Manager, Admin only

**Note:** Cannot update status via this endpoint (use dedicated status change endpoint)

---

### 5. Change Asset Status

**POST** `/api/assets/:id/status`

Change asset lifecycle status (logged in audit trail).

**Request Body:**
```json
{
  "newStatus": "in_service",
  "reason": "Scheduled maintenance"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assetId": 1,
    "oldStatus": "active",
    "newStatus": "in_service",
    "changedAt": "2026-04-11T09:00:00Z"
  }
}
```

**Business Logic:**
1. Validate status transition is allowed
2. Update `assets.status`
3. Log change in `asset_status_history`
4. Trigger auto-updates timestamp

**Valid Status Transitions:**
- `planned` → `installed`
- `installed` → `active`
- `active` ↔ `in_service` (bidirectional)
- `active` → `faulty`
- `faulty` → `active` (after repair)
- `active` → `inactive`
- `inactive` → `active`
- Any → `decommissioned`

**Permissions:** Manager, Admin only

---

### 6. Get Asset Status History

**GET** `/api/assets/:id/history`

Get full audit trail of status changes for an asset.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "assetId": 1,
      "oldStatus": null,
      "newStatus": "installed",
      "changedBy": { "id": 1, "name": "Jan Kowalski" },
      "changedAt": "2026-01-15T10:00:00Z",
      "reason": null
    },
    {
      "id": 2,
      "assetId": 1,
      "oldStatus": "installed",
      "newStatus": "active",
      "changedBy": { "id": 2, "name": "Anna Nowak" },
      "changedAt": "2026-01-20T14:00:00Z",
      "reason": "Activation after testing"
    }
  ]
}
```

**Permissions:** Any authenticated user

---

### 7. Create Service Task for Asset

**POST** `/api/assets/:id/tasks`

Create a new service/repair/maintenance task for an existing asset.

**Request Body:**
```json
{
  "taskRole": "warranty_service",
  "taskName": "Serwis gwarancyjny - 12 miesięcy",
  "scheduledDate": "2027-01-15",
  "priority": "medium",
  "assignedTo": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 124,
      "number": "P000046",
      "name": "Serwis gwarancyjny - Przejazd OBJ-0000010426",
      "type": "WARRANTY_SERVICE",
      "status": "planned",
      "linkedAssetId": 1,
      "taskRole": "warranty_service"
    }
  }
}
```

**Business Logic:**
1. Create new task in `subsystem_tasks`
2. Set `linked_asset_id = asset.id`
3. Set `task_role` from request
4. Link to same contract/subsystem as asset
5. Create entry in `asset_tasks` table
6. If `taskRole = 'in_service'`, update asset status to `in_service`

**Permissions:** Manager, Admin only

---

## Asset Number Generation

### Internal Service Method

**AssetNumberingService.generateAssetNumber()**

Generates next available asset number in format `OBJ-XXXXXXMMRR`.

**Algorithm:**
```typescript
async generateAssetNumber(): Promise<string> {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 01-12
  const year = String(now.getFullYear()).slice(-2);          // YY
  
  // Find last asset number for current month+year
  const lastAsset = await assetRepository
    .createQueryBuilder('asset')
    .where("asset.assetNumber LIKE :pattern", { 
      pattern: `OBJ-______${month}${year}` 
    })
    .orderBy('asset.assetNumber', 'DESC')
    .getOne();
  
  let nextSequence = 1;
  if (lastAsset) {
    const match = lastAsset.assetNumber.match(/^OBJ-(\d{6})\d{4}$/);
    if (match) {
      nextSequence = parseInt(match[1], 10) + 1;
    }
  }
  
  const sequence = String(nextSequence).padStart(6, '0');
  return `OBJ-${sequence}${month}${year}`;
}
```

**Examples:**
- First asset in April 2026: `OBJ-0000010426`
- Second asset: `OBJ-0000020426`
- 999,999th asset: `OBJ-9999990426`
- First asset in May 2026: `OBJ-0000010526` (sequence resets)

---

## Error Responses

All endpoints return errors in standardized format:

```json
{
  "success": false,
  "error": {
    "code": "ASSET_NOT_FOUND",
    "message": "Asset with ID 999 not found",
    "details": {}
  }
}
```

**Common Error Codes:**
- `ASSET_NOT_FOUND` - Asset ID doesn't exist
- `TASK_NOT_INSTALLATION` - Cannot create asset from non-installation task
- `TASK_ALREADY_COMPLETED` - Task already has linked asset
- `INVALID_STATUS_TRANSITION` - Status change not allowed
- `DEVICE_NOT_FOUND` - Serial number not in devices table
- `UNAUTHORIZED` - User lacks permission
- `VALIDATION_ERROR` - Invalid request data

---

## Permissions Matrix

| Endpoint | View | Create | Update | Delete |
|----------|------|--------|--------|--------|
| GET /assets | All users | - | - | - |
| GET /assets/:id | All users | - | - | - |
| POST /tasks/:id/complete-and-create-asset | - | Manager, Admin | - | - |
| PATCH /assets/:id | - | - | Manager, Admin | - |
| POST /assets/:id/status | - | Manager, Admin | - | - |
| GET /assets/:id/history | All users | - | - | - |
| POST /assets/:id/tasks | - | Manager, Admin | - | - |
