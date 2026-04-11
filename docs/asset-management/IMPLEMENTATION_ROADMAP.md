# Asset Management - Implementation Roadmap

## Strategy: Small, Incremental PRs

Each PR should be:
- **Small** - reviewable in < 30 minutes
- **Focused** - one feature/change
- **Tested** - unit tests included
- **Independent** - can be merged without breaking anything

---

## Phase 1: Database Foundation

### PR #1: Database Migration
**Branch:** `feature/asset-management-db-schema`

**Files:**
- `backend/src/migrations/XXXXXX_create_assets_tables.ts`

**Changes:**
- Create `assets` table
- Create `asset_tasks` table
- Create `asset_status_history` table
- Add `installed_asset_id` to `devices` table
- Add `linked_asset_id` + `task_role` to `subsystem_tasks` table
- Create indexes
- Create triggers (auto-timestamp, status logging)

**Testing:**
- Migration runs successfully
- Migration rollback works
- All constraints validated

**Review Focus:**
- SQL syntax
- Index strategy
- Constraint correctness

**Estimated Time:** 1 day

---

## Phase 2: Backend Entities

### PR #2: TypeORM Entities
**Branch:** `feature/asset-management-entities`

**Files:**
- `backend/src/entities/Asset.ts`
- `backend/src/entities/AssetTask.ts`
- `backend/src/entities/AssetStatusHistory.ts`
- Update `backend/src/entities/Device.ts` (add `installedAsset` relation)
- Update `backend/src/entities/SubsystemTask.ts` (add `linkedAsset` relation)

**Changes:**
- Define TypeORM entity classes
- Define relationships (@ManyToOne, @OneToMany)
- Add validation decorators

**Testing:**
- Entities sync with database schema
- Relations load correctly

**Review Focus:**
- TypeORM decorators
- Relationship definitions
- Type safety

**Estimated Time:** 1 day

---

## Phase 3: Asset Numbering Service

### PR #3: Asset Number Generation
**Branch:** `feature/asset-numbering-service`

**Files:**
- `backend/src/services/AssetNumberingService.ts`
- `backend/src/services/AssetNumberingService.test.ts`

**Changes:**
- Implement `generateAssetNumber()` algorithm
- Handle month/year rollover
- Thread-safe sequence generation (transaction)

**Testing:**
- Unit tests for numbering algorithm
- Test sequence increments correctly
- Test month rollover (Jan → Feb)
- Test concurrent requests (race conditions)

**Review Focus:**
- Algorithm correctness
- Edge cases (year rollover, concurrent access)
- Test coverage

**Estimated Time:** 1 day

---

## Phase 4: Basic CRUD API

### PR #4: Asset Service + Controller (Read Only)
**Branch:** `feature/asset-service-crud-read`

**Files:**
- `backend/src/services/AssetService.ts`
- `backend/src/controllers/AssetController.ts`
- `backend/src/routes/assetRoutes.ts`
- Update `backend/src/routes/index.ts`

**Changes:**
- `AssetService.getAllAssets(filters, pagination)`
- `AssetService.getAssetById(id)`
- `AssetController.getAssets()` endpoint
- `AssetController.getAssetById()` endpoint
- Add routes: `GET /api/assets`, `GET /api/assets/:id`

**Testing:**
- Integration tests for GET endpoints
- Test filters (type, status, contract)
- Test pagination
- Test 404 for non-existent asset

**Review Focus:**
- Query performance (N+1 problem)
- Filter validation
- Pagination logic

**Estimated Time:** 2 days

---

### PR #5: Asset Update + Status Change
**Branch:** `feature/asset-service-crud-update`

**Files:**
- Update `backend/src/services/AssetService.ts`
- Update `backend/src/controllers/AssetController.ts`

**Changes:**
- `AssetService.updateAsset(id, data)`
- `AssetService.changeStatus(id, newStatus, reason)`
- `AssetController.updateAsset()` endpoint
- `AssetController.changeStatus()` endpoint
- Add routes: `PATCH /api/assets/:id`, `POST /api/assets/:id/status`
- Auto-log status changes to `asset_status_history`

**Testing:**
- Test valid status transitions
- Test invalid transitions (should fail)
- Test history logging
- Test permissions (only manager/admin)

**Review Focus:**
- Status transition validation
- History audit trail
- Permission checks

**Estimated Time:** 1 day

---

## Phase 5: BOM + Device Integration

### PR #6: Device Linking by Serial Number
**Branch:** `feature/asset-device-linking`

**Files:**
- Update `backend/src/services/AssetService.ts`
- Update `backend/src/services/DeviceService.ts`

**Changes:**
- `AssetService.linkDevicesBySerialNumber(assetId, bomSnapshot)`
  - For each material with S/N:
    - Find device by `serialNumber`
    - Update `device.status = 'installed'`
    - Update `device.installed_asset_id = assetId`
    - Store `deviceId` in BOM snapshot

**Testing:**
- Test device found and linked
- Test device not found (warning logged, but asset still created)
- Test device already installed elsewhere (should warn or fail)
- Test device status update

**Review Focus:**
- Device lookup logic
- Error handling (device not found)
- Transaction safety

**Estimated Time:** 1 day

---

## Phase 6: Task Completion Flow

### PR #7: Complete Task → Create Asset
**Branch:** `feature/task-completion-asset-creation`

**Files:**
- Update `backend/src/services/SubsystemTaskService.ts`
- Update `backend/src/controllers/TaskController.ts`

**Changes:**
- New endpoint: `POST /api/tasks/:id/complete-and-create-asset`
- Validate task is installation type
- Generate asset number
- Create asset with status = 'installed'
- Link devices from BOM
- Update task: `linked_asset_id`, `task_role = 'installation'`, `status = 'completed'`
- Create `asset_tasks` entry
- Set warranty expiry (installation_date + 24 months)

**Testing:**
- Test full flow (task → asset → devices)
- Test task already completed (should fail)
- Test non-installation task (should fail)
- Test device linking integration

**Review Focus:**
- Transaction handling (all-or-nothing)
- Rollback on error
- Data consistency

**Estimated Time:** 2 days

---

### PR #8: Create Service Task for Asset
**Branch:** `feature/asset-create-service-task`

**Files:**
- Update `backend/src/services/AssetService.ts`
- Update `backend/src/controllers/AssetController.ts`

**Changes:**
- New endpoint: `POST /api/assets/:id/tasks`
- Create task linked to asset
- Set `task_role` (warranty_service, repair, maintenance)
- Link to same contract/subsystem as asset

**Testing:**
- Test service task creation
- Test task linked to correct asset
- Test permissions

**Review Focus:**
- Task creation logic
- Asset-task relationship

**Estimated Time:** 1 day

---

## Phase 7: Frontend - Asset Module

### PR #9: Asset List Page (Read Only)
**Branch:** `feature/frontend-asset-list`

**Files:**
- `frontend/src/components/assets/AssetListPage.tsx`
- `frontend/src/components/assets/AssetListPage.css`
- `frontend/src/services/asset.service.ts`
- Update `frontend/src/App.tsx` (add route)

**Changes:**
- Asset list page with table
- Filters (type, status, contract, search)
- Pagination
- Link to asset detail page

**Testing:**
- Manual testing: filters work
- Manual testing: pagination works
- Manual testing: search works

**Review Focus:**
- UI/UX
- Performance (lazy loading)
- Responsive design

**Estimated Time:** 2 days

---

### PR #10: Asset Detail Page
**Branch:** `feature/frontend-asset-detail`

**Files:**
- `frontend/src/components/assets/AssetDetailPage.tsx`
- `frontend/src/components/assets/AssetDetailPage.css`
- Update `frontend/src/services/asset.service.ts`

**Changes:**
- Asset detail page layout
- Display all asset data (location, BOM, tasks, history)
- Links to devices
- Links to tasks
- "Show on map" button (Google Maps)

**Testing:**
- Manual testing: all data displays correctly
- Manual testing: links work
- Manual testing: map opens

**Review Focus:**
- Layout & design
- Data loading (loading states)
- Error handling

**Estimated Time:** 2 days

---

### PR #11: Create Service Task Dialog
**Branch:** `feature/frontend-create-service-task`

**Files:**
- `frontend/src/components/assets/CreateServiceTaskModal.tsx`
- `frontend/src/components/assets/CreateServiceTaskModal.css`

**Changes:**
- Modal dialog for creating service task
- Form: task role, name, scheduled date, priority, assignee
- API call to create task
- Refresh asset detail after creation

**Testing:**
- Manual testing: form validation
- Manual testing: task created successfully
- Manual testing: error handling

**Review Focus:**
- Form UX
- Validation
- Success/error messages

**Estimated Time:** 1 day

---

## Phase 8: Wizard Integration

### PR #12: Task Completion Dialog
**Branch:** `feature/wizard-task-completion-dialog`

**Files:**
- `frontend/src/components/tasks/CompleteTaskAndCreateAssetModal.tsx`
- `frontend/src/components/tasks/CompleteTaskAndCreateAssetModal.css`
- Update task detail pages (show button for installation tasks)

**Changes:**
- Modal dialog for "Complete task and create asset"
- Form: asset name, category, location, GPS, notes
- Auto-fill from task data (linia_kolejowa, kilometraz)
- BOM preview (show which devices will be linked)
- API call to complete task and create asset
- Redirect to asset detail page

**Testing:**
- Manual testing: form auto-fill works
- Manual testing: BOM devices displayed
- Manual testing: asset created successfully
- Manual testing: task status updated

**Review Focus:**
- UX flow
- Data pre-filling
- Success feedback

**Estimated Time:** 2 days

---

### PR #13: Wizard Integration - Auto-create on Completion
**Branch:** `feature/wizard-auto-asset-creation`

**Files:**
- Update `frontend/src/components/contracts/wizard/ContractWizardModal.tsx`
- Update task completion logic in wizard

**Changes:**
- When completing installation task in wizard, show asset creation dialog
- Validate location data is filled
- Pre-fill asset form from task details

**Testing:**
- Manual testing: wizard flow works
- Manual testing: asset created from wizard

**Review Focus:**
- Integration with existing wizard
- No regressions

**Estimated Time:** 1 day

---

## Phase 9: Enhancements

### PR #14: Asset Status History Page
**Branch:** `feature/frontend-asset-history`

**Files:**
- `frontend/src/components/assets/AssetStatusHistoryPage.tsx`

**Changes:**
- Full page view of asset status history
- Timeline visualization
- Filter by date range

**Estimated Time:** 1 day

---

### PR #15: Dashboard Widget
**Branch:** `feature/dashboard-asset-widget`

**Files:**
- `frontend/src/components/dashboard/AssetSummaryWidget.tsx`

**Changes:**
- Widget showing asset statistics
- Quick links to lists filtered by status

**Estimated Time:** 1 day

---

### PR #16: Contract Detail - Assets Section
**Branch:** `feature/contract-asset-section`

**Files:**
- Update `frontend/src/components/contracts/ContractDetailPage.tsx`

**Changes:**
- Add "Installed Assets" section to contract detail page
- List all assets for contract

**Estimated Time:** 0.5 day

---

### PR #17: Device Detail - Asset Link
**Branch:** `feature/device-asset-link`

**Files:**
- Update `frontend/src/components/devices/DeviceDetailPage.tsx`

**Changes:**
- Show "Installed in Asset" section if device is installed
- Link to asset detail page

**Estimated Time:** 0.5 day

---

## Phase 10: Data Migration (Optional)

### PR #18: Migrate Existing Completed Tasks
**Branch:** `feature/migrate-existing-tasks-to-assets`

**Files:**
- `backend/src/scripts/migrateTasksToAssets.ts`

**Changes:**
- Script to find all completed installation tasks
- Create assets for them (with best-effort data)
- Link tasks to assets

**Testing:**
- Dry-run mode
- Validate data before committing

**Review Focus:**
- Data integrity
- Rollback plan

**Estimated Time:** 2 days

---

## Total Timeline Estimate

| Phase | PRs | Time |
|-------|-----|------|
| Phase 1: Database | 1 | 1 day |
| Phase 2: Entities | 1 | 1 day |
| Phase 3: Numbering | 1 | 1 day |
| Phase 4-5: CRUD API | 2 | 3 days |
| Phase 6: BOM Integration | 1 | 1 day |
| Phase 7: Task Flow | 2 | 3 days |
| Phase 8: Frontend List/Detail | 3 | 5 days |
| Phase 9: Wizard Integration | 2 | 3 days |
| Phase 10: Enhancements | 4 | 3 days |
| **Total** | **17 PRs** | **~21 days** |

**With reviews, testing, fixes:** ~4-5 weeks

---

## Definition of Done (per PR)

- [ ] Code written
- [ ] Unit tests written (backend)
- [ ] Manual testing completed (frontend)
- [ ] No console errors/warnings
- [ ] Code reviewed by 1+ person
- [ ] CI/CD passes
- [ ] Documentation updated (if needed)
- [ ] Merged to main branch

---

## Risk Mitigation

### Backwards Compatibility
- All new columns are nullable
- Existing code works unchanged
- Feature flag for asset creation (optional)

### Performance
- Indexes on all foreign keys
- Pagination for large lists
- Lazy loading for related data

### Data Integrity
- Transactions for multi-step operations
- Foreign key constraints
- Status validation constraints

### User Experience
- Loading states for all async operations
- Error messages user-friendly
- Undo/rollback for critical actions (optional)

---

## Post-MVP Enhancements

1. **Map Visualization** - Show all assets on Google Maps
2. **Scheduled Service Alerts** - Email/notification when service due
3. **Warranty Expiry Alerts** - Warn before warranty ends
4. **Asset Reports** - Excel export, statistics
5. **Multi-asset Operations** - Bulk status change, bulk service scheduling
6. **Asset Photos** - Upload photos per asset
7. **Asset Templates** - Pre-fill common asset types
8. **Mobile App** - QR code scanning for asset lookup
9. **Integration with External Systems** - Export to ERP/CMMS
10. **Advanced Analytics** - MTBF, MTTR, cost per asset

---

## Success Metrics

### Technical
- [ ] All PRs merged without breaking changes
- [ ] Test coverage > 70%
- [ ] No performance regressions
- [ ] Zero data migration errors

### Business
- [ ] 100% of new installation tasks create assets
- [ ] All assets have valid BOM data
- [ ] Service tasks linked to assets
- [ ] End user (prezes) approves for production

### User Adoption
- [ ] Managers use asset list regularly
- [ ] Service tasks created via asset detail page
- [ ] Devices tracked from warehouse to installation

---

## Implementation Notes

### Mini-fix: "Opisane zadania" validation

**Context:** W wizardzie SMOKIP-A/B, krok "Szczegóły zadań" (edit mode), licznik opisanych zadań błędnie liczy zadania które już istnieją w bazie.

**Files to modify:**
- `frontend/src/components/contracts/wizard/SmokipADetailsStep.tsx`
- `frontend/src/components/contracts/wizard/SmokipBDetailsStep.tsx`

**Fix:**
W funkcji `describedTasks` dodać na początku:
```typescript
const describedTasks = subsystemDetails.filter(detail => {
  // Ignore tasks that are already created (have ID from backend)
  if (detail.id) return true;
  
  // Existing validation logic...
  return detail.name && detail.name.trim() !== '';
});
```

**Reasoning:** Zadania które już mają `detail.id` są pobrane z bazy danych i nie wymagają ponownego opisania. Powinny być zawsze uznawane za "opisane".

**Testing:**
1. Otwórz kontrakt z istniejącymi zadaniami SMOKIP
2. Przejdź do kroku "Szczegóły zadań"
3. Sprawdź czy licznik pokazuje 100% dla istniejących zadań
4. Dodaj nowe zadanie bez opisu - licznik powinien pokazać brakujące

**Priority:** Low (kosmetyczny bug, nie blokuje pracy)

---

## Glossary

- **Asset** - Physical infrastructure object (crossing, LCS, CUID, control room)
- **BOM** - Bill of Materials, list of devices/components used in installation
- **S/N** - Serial Number (unique device identifier)
- **Installation Task** - Task that creates the asset when completed
- **Service Task** - Task performed on existing asset (maintenance, repair, warranty service)
- **Asset Number** - Globally unique identifier in format OBJ-XXXXXXMMRR
- **Lifecycle** - Asset progression from planned → installed → active → decommissioned
- **Status Transition** - Change from one lifecycle status to another (logged in history)
- **Device Linking** - Connecting devices table to assets via serial number
- **Backwards Compatible** - New code doesn't break existing functionality

---

## FAQ

### Q: What happens to existing tasks?
**A:** All existing tasks continue to work unchanged. The `linked_asset_id` and `task_role` columns are nullable and will be NULL for old tasks.

### Q: Can we create assets without completing a task?
**A:** In MVP, no. Assets are ONLY created when installation task is completed. Post-MVP we might add manual asset creation.

### Q: What if a device serial number is not found?
**A:** Asset is still created, but device is not linked. Warning is logged. Admin can manually link device later.

### Q: Can we change asset number after creation?
**A:** No. Asset number is immutable. This ensures referential integrity and audit trail.

### Q: What about non-SMOKIP subsystems?
**A:** Out of scope for MVP. Will be added after end-user approval (prezes decision).

### Q: How do we handle asset replacement?
**A:** Old asset status → `decommissioned`, new installation task creates new asset. They can be linked via notes or custom field (post-MVP).

### Q: Can multiple tasks link to same asset?
**A:** Yes! That's the point. Installation task creates it, then many service/repair tasks can be associated.

### Q: What's the rollback plan if something goes wrong?
**A:** Database migration includes rollback script. All changes are in transactions. Feature can be disabled via feature flag.

---

## Contact & Support

For questions about implementation:
- **Technical lead:** Remigiusz
- **Business owner:** Prezes
- **Documentation:** `/docs/asset-management/`

---

**Last updated:** 2026-04-11
**Version:** 1.0
**Status:** Ready for implementation
