# BOM Trigger System - Implementation Documentation

## Overview
This document describes the BOM (Bill of Materials) Trigger System implementation for the Der-Mag Platform. The system enables automated actions to be triggered by various events in the task and BOM lifecycle.

## Architecture

### Entities

#### BomTrigger (`backend/src/entities/BomTrigger.ts`)
Main entity representing an automated trigger/action.

**Fields:**
- `id`: Primary key
- `uuid`: Unique identifier (UUID)
- `name`: Trigger name (max 200 chars)
- `description`: Optional description
- `triggerEvent`: Type of event that activates the trigger
- `triggerCondition`: JSONB field with conditions to evaluate
- `actionType`: Type of action to perform
- `actionConfig`: JSONB field with action configuration
- `sourceTaskTypeId`: Optional source task type reference
- `targetTaskTypeId`: Optional target task type reference
- `priority`: Execution priority (default: 10, higher = first)
- `isActive`: Whether trigger is active
- `createdBy`: User who created the trigger
- `createdAt`, `updatedAt`: Timestamps

#### BomTriggerLog (`backend/src/entities/BomTriggerLog.ts`)
Logs execution of triggers for auditing and debugging.

**Fields:**
- `id`: Primary key
- `triggerId`: Reference to BomTrigger
- `taskId`: Optional reference to Task
- `executedAt`: Timestamp of execution
- `success`: Whether execution succeeded
- `inputData`: JSONB with input event data
- `resultData`: JSONB with execution results
- `errorMessage`: Optional error message

### Trigger Events
1. **ON_TASK_CREATE** - Fired when a task is created
2. **ON_STATUS_CHANGE** - Fired when task status changes
3. **ON_BOM_UPDATE** - Fired when BOM template is updated
4. **ON_MATERIAL_ADD** - Fired when material is added to task
5. **ON_QUANTITY_CHANGE** - Fired when material quantity changes

### Action Types
1. **ADD_MATERIAL** - Automatically add material to task BOM
2. **UPDATE_QUANTITY** - Update material quantity
3. **COPY_BOM** - Copy BOM template from another task type
4. **NOTIFY** - Send notification to users
5. **CALCULATE_COST** - Calculate total material costs

## Service Layer

### BomTriggerService (`backend/src/services/BomTriggerService.ts`)

**CRUD Operations:**
- `getAllTriggers(filters?)` - Get all triggers with optional filtering
- `getTriggerById(id)` - Get trigger by ID
- `createTrigger(data, userId)` - Create new trigger
- `updateTrigger(id, data)` - Update existing trigger
- `deleteTrigger(id)` - Soft delete (sets isActive=false)
- `toggleTrigger(id)` - Toggle active status

**Execution:**
- `executeTriggers(event, eventData)` - Execute all active triggers for an event
- `executeTrigger(trigger, inputData)` - Execute single trigger
- `evaluateCondition(condition, eventData)` - Check if trigger conditions are met

**Action Handlers:**
- `executeAddMaterial()` - Add material to task
- `executeUpdateQuantity()` - Update material quantity
- `executeCopyBom()` - Copy BOM from template
- `executeNotify()` - Send notification
- `executeCalculateCost()` - Calculate costs

**Metadata:**
- `getAvailableEvents()` - Get list of event types
- `getAvailableActions()` - Get list of action types
- `getTriggerLogs(triggerId?, limit?)` - Get execution logs

### Integration Points

#### TaskService
Triggers are executed at:
- **createTask()** - Fires ON_TASK_CREATE event
- **updateTaskStatus()** - Fires ON_STATUS_CHANGE event

#### BOMService
Triggers are executed at:
- **createTemplate()** - Fires ON_BOM_UPDATE event
- **addMaterialToTask()** - Fires ON_MATERIAL_ADD event
- **updateMaterialUsage()** - Fires ON_QUANTITY_CHANGE event

## API Endpoints

### BomTriggerController (`backend/src/controllers/BomTriggerController.ts`)

All endpoints require authentication. Admin and manager roles have full access, bom_editor can view only.

**GET /api/bom-triggers**
- List all triggers
- Query params: `isActive`, `triggerEvent`
- Access: admin, manager, bom_editor

**GET /api/bom-triggers/:id**
- Get trigger details
- Access: admin, manager, bom_editor

**POST /api/bom-triggers**
- Create new trigger
- Body: CreateBomTriggerDto
- Access: admin, manager

**PUT /api/bom-triggers/:id**
- Update trigger
- Body: UpdateBomTriggerDto
- Access: admin, manager

**DELETE /api/bom-triggers/:id**
- Delete trigger (soft delete)
- Access: admin, manager

**POST /api/bom-triggers/:id/toggle**
- Toggle trigger active/inactive
- Access: admin, manager

**POST /api/bom-triggers/:id/test**
- Test trigger execution
- Body: TestBomTriggerDto
- Access: admin, manager

**GET /api/bom-triggers/:id/logs**
- Get trigger execution logs
- Query param: `limit` (default: 50)
- Access: admin, manager

**GET /api/bom-triggers/events**
- Get available event types
- Access: admin, manager, bom_editor

**GET /api/bom-triggers/actions**
- Get available action types
- Access: admin, manager, bom_editor

## Database Schema

### Tables Created
Migration: `20251230_add_bom_triggers.sql`

**bom_triggers**
- Primary key: id (serial)
- Unique: uuid
- Foreign keys: source_task_type_id, target_task_type_id, created_by
- Indexes: trigger_event, is_active, priority, source_task_type_id, target_task_type_id
- Constraints: CHECK on trigger_event and action_type values

**bom_trigger_logs**
- Primary key: id (serial)
- Foreign keys: trigger_id, task_id
- Indexes: trigger_id, task_id, executed_at, success

### Seed Data
Migration includes 3 example triggers:
1. Auto-add UTP cable to LAN tasks
2. Notify on task completion
3. Calculate costs when material added

### Cleanup Function
`cleanup_old_trigger_logs(retention_days)` - Removes logs older than specified days (default: 90)

## DTO Validation

### CreateBomTriggerDto
Required fields:
- name (string, max 200 chars)
- triggerEvent (enum)
- actionType (enum)
- actionConfig (object)

Optional fields:
- description
- triggerCondition (object, default: {})
- sourceTaskTypeId, targetTaskTypeId
- priority (number, default: 10)
- isActive (boolean, default: true)

### UpdateBomTriggerDto
All fields optional (partial update)

### TestBomTriggerDto
- testData (object) - Required

## Testing

### Unit Tests
- **BomTriggerService.test.ts** - 7 tests covering CRUD and metadata
- **BomTriggerController.test.ts** - 9 tests covering all endpoints
- Mocked BomTriggerService in BOMService and TaskService tests

### Test Coverage
- All CRUD operations
- Trigger toggle functionality
- Event and action metadata retrieval
- Error handling (404, 401, 500)

## UI Testing Interface

### API Tester (`backend/public/api-tester.html`)
New section "⚡ BOM Triggery" includes:
- List triggers with filtering
- Create new trigger form
- Get trigger details
- Toggle trigger active status
- Test trigger execution
- View execution logs
- View available events and actions
- Delete trigger

## Example Usage

### Creating a Trigger
```json
POST /api/bom-triggers
{
  "name": "Auto-dodaj kabel do zadań LAN",
  "description": "Automatycznie dodaje kabel UTP przy tworzeniu zadań LAN",
  "triggerEvent": "ON_TASK_CREATE",
  "triggerCondition": {"taskTypeCode": "LAN"},
  "actionType": "ADD_MATERIAL",
  "actionConfig": {
    "materialName": "Kabel UTP Cat6",
    "defaultQuantity": 100,
    "unit": "m",
    "category": "network"
  },
  "priority": 10,
  "isActive": true
}
```

### Trigger Execution Flow
1. Event occurs (e.g., task created)
2. TaskService/BOMService calls `BomTriggerService.executeTriggers(event, data)`
3. Service fetches all active triggers for that event
4. For each trigger:
   - Evaluate conditions against event data
   - If conditions match, execute action
   - Log execution result (success/failure)
5. Errors are caught and logged, but don't interrupt main flow

## Security

### Authorization
- View triggers: admin, manager, bom_editor
- Manage triggers: admin, manager only
- Created by user is tracked for audit

### Data Validation
- All inputs validated with class-validator
- JSON fields (condition, config) validated as objects
- Enum values enforced for events and actions

## Performance Considerations

### Indexes
- trigger_event for fast event lookup
- is_active for filtering active triggers
- priority DESC for correct execution order
- executed_at DESC for log queries

### Error Handling
- Trigger execution errors don't interrupt main operations
- Errors logged to console and bom_trigger_logs
- Individual trigger failures don't affect other triggers

### Cleanup
- Use cleanup_old_trigger_logs() periodically to remove old logs
- Soft delete for triggers (preserves audit trail)

## Migration Instructions

### Database Setup
```bash
# Run migration script
psql $DB_CONNECTION_STRING -f backend/scripts/migrations/20251230_add_bom_triggers.sql
```

### TypeScript Build
```bash
cd backend
npm install
npm run typecheck  # Verify compilation
npm run build      # Build for production
```

### Testing
```bash
npm test           # Run all tests
npm test -- BomTriggerService.test.ts  # Run specific tests
```

## Future Enhancements

Potential improvements:
1. **Scheduler triggers** - Time-based or cron-like triggers
2. **Conditional logic** - More complex condition evaluation (AND/OR/NOT)
3. **Chained triggers** - One trigger can fire another
4. **Trigger templates** - Pre-defined trigger configurations
5. **UI builder** - Visual trigger builder in frontend
6. **Async execution** - Queue system for long-running actions
7. **Rollback support** - Undo trigger actions
8. **A/B testing** - Test different trigger configurations

## Troubleshooting

### Common Issues

**Trigger not executing:**
- Check if trigger is active (isActive=true)
- Verify conditions match event data exactly
- Check trigger priority (higher priority executes first)
- Review logs in bom_trigger_logs table

**Action fails:**
- Check actionConfig has all required fields
- Verify related entities exist (task, materials, etc.)
- Check user permissions
- Review error_message in logs

**Performance issues:**
- Too many active triggers for same event
- Complex condition evaluation
- Review indexes and query performance
- Consider caching frequently used triggers

## References

- TypeORM Documentation: https://typeorm.io/
- class-validator: https://github.com/typestack/class-validator
- Express.js: https://expressjs.com/
- PostgreSQL JSONB: https://www.postgresql.org/docs/current/datatype-json.html
