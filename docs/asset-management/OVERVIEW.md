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
