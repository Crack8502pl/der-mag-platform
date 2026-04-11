# Asset Management System - Overview

## Executive Summary
Transition from task-centric to asset-centric architecture for SMOKIP-A and SMOKIP-B subsystems.

## Vision
Every physical infrastructure element (crossing, LCS, CUID, control room, etc.) becomes a tracked **Asset** with:
- Unique global identifier (OBJ-XXXXXXMMRR)
- Full lifecycle tracking (planned → installed → active → serviced → decommissioned)
- Associated tasks (installation, warranty service, repairs, maintenance)
- BOM snapshot with serial number tracking to `/devices`
- Location data (GPS, railway line, kilometer marker)
- Service history and warranty tracking

## Current State (Task-Centric)
Task P000001 - Install Crossing └─ Status: Created → In Progress → Completed → END
**Problem:** No continuity after task completion. No way to track warranty, schedule service, or manage repairs.

## Target State (Asset-Centric)
Task P000001 - Install Crossing └─ Creates → Asset OBJ-0000010426 (Crossing LK-123 km 45.678) ├─ Type: PRZEJAZD ├─ Category: KAT A ├─ Location: LK-123, km 45.678, GPS coordinates ├─ BOM: Camera S/N ABC123 → link to /devices ├─ Status: Installed ├─ Warranty until: 2028-04-11 └─ Task History: ├─ P000001 - Installation (completed) ├─ P000123 - Warranty service (scheduled) └─ P000456 - Repair (in progress) 
## Scope

### In Scope (MVP)
- **SMOKIP-A subsystems:**
  - PRZEJAZD_KAT_A
  - SKP
  - NASTAWNIA
  - LCS
  - CUID

- **SMOKIP-B subsystems:**
  - PRZEJAZD_KAT_B
  - NASTAWNIA
  - LCS
  - CUID

### Out of Scope (Post-MVP)
- Other subsystems (SKD, SSWIN, CCTV, etc.) - pending end-user approval

## Key Features

### 1. Global Asset Numbering
- Format: `OBJ-XXXXXXMMRR`
- Example: `OBJ-0000010426` = Asset #1, April 2026
- Components:
  - `OBJ-` = Fixed prefix
  - `XXXXXX` = 6-digit sequence (000001-999999)
  - `MM` = Month (01-12)
  - `RR` = Year (last 2 digits)
- **Benefit:** 999,999 assets per month before rollover

### 2. Lifecycle States
- `planned` - Asset planned but not yet installed
- `installed` - Installation task completed
- `active` - In operation
- `in_service` - Currently being serviced
- `faulty` - Fault reported
- `inactive` - Temporarily out of service
- `decommissioned` - Permanently removed

### 3. BOM Integration
Every asset stores a snapshot of the Bill of Materials used during installation:
```json
{
  "subsystemType": "SMOKIP_A",
  "subsystemName": "Przejazd KAT A",
  "materials": [
    {
      "name": "Kamera AXIS P1448-LE",
      "quantity": 2,
      "unit": "szt",
      "serialNumber": "ABC123456",
      "deviceId": 42,
      "installedAt": "2026-04-11T10:30:00Z"
    },
    {
      "name": "Switch Cisco SG350",
      "quantity": 1,
      "unit": "szt",
      "serialNumber": "DEF789012",
      "deviceId": 43,
      "installedAt": "2026-04-11T11:00:00Z"
    }
  ]
}
```
When a device is installed as part of an asset:

    devices.status changes to INSTALLED
    devices.installed_asset_id points to the asset
    Asset BOM stores the device serial number and ID

### 4. Task Roles

Tasks can be associated with assets in different roles:

    installation - Original installation task that created the asset
    warranty_service - Warranty-covered maintenance
    repair - Fault repair (warranty or post-warranty)
    maintenance - Scheduled preventive maintenance
    decommission - Asset removal/replacement

Benefits
Operational

    Full inventory - Know exactly what was installed where
    Warranty tracking - Automatic reminders for warranty expiry
    Service scheduling - Plan preventive maintenance
    Fault management - Track repairs and recurring issues
    Geographic visualization - Map of all installed assets

Business

    Asset valuation - Track installed equipment value
    Lifecycle costing - Installation + maintenance + repair costs per asset
    Performance metrics - MTBF, MTTR per asset type
    Compliance - Audit trail for all assets

Technical

    Backwards compatible - Existing tasks work unchanged
    Incremental adoption - Only SMOKIP initially
    Device tracking - Full chain from warehouse to installation
    Data-driven decisions - Analytics on asset performance

Non-Functional Requirements
Performance

    Asset number generation: < 100ms
    Asset list with filters: < 2s (pagination: 50 items/page)
    Asset detail page load: < 1s

Scalability

    Support 999,999 assets per month
    10,000+ total assets in system
    100+ concurrent users viewing asset data

Reliability

    Full backwards compatibility - no breaking changes
    Database migrations are reversible
    Nullable foreign keys preserve data integrity

Security

    Only authorized users can create assets (role: manager, admin)
    Asset modification logged in audit trail
    Status changes tracked in asset_status_history

Success Criteria

    ✅ Asset created automatically when installation task completed
    ✅ BOM devices linked by serial number to /devices
    ✅ Asset detail page shows full lifecycle history
    ✅ New service task can be created for existing asset
    ✅ Warranty expiry alerts generated
    ✅ Geographic map shows all assets
    ✅ Existing tasks/contracts work unchanged (backwards compatible)

Glossary

    Asset - Physical infrastructure element with tracked lifecycle
    BOM - Bill of Materials, list of components/devices used
    S/N - Serial Number (unique device identifier)
    SMOKIP-A/B - Subsystem types for railway crossing monitoring
    Installation Task - Task that creates the asset
    Service Task - Task performed on existing asset (maintenance, repair)
