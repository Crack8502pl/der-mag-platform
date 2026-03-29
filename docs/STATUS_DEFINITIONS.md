# STATUS_DEFINITIONS.md

Pełna lista statusów używanych w systemie DER-MAG Platform.

---

## Task Statuses (TaskWorkflowStatus)

| Status | Opis (PL) | Description (EN) |
|--------|-----------|------------------|
| `CREATED` | Utworzone | Created |
| `BOM_GENERATED` | BOM wygenerowany | BOM Generated |
| `COMPLETION_ASSIGNED` | Przypisano do kompletacji | Completion Assigned |
| `COMPLETION_IN_PROGRESS` | Kompletacja w trakcie | Completion In Progress |
| `COMPLETION_COMPLETED` | Kompletacja zakończona | Completion Completed |
| `PREFABRICATION_ASSIGNED` | Przypisano do prefabrykacji | Prefabrication Assigned |
| `PREFABRICATION_IN_PROGRESS` | Prefabrykacja w trakcie | Prefabrication In Progress |
| `PREFABRICATION_COMPLETED` | Prefabrykacja zakończona | Prefabrication Completed |
| `READY_FOR_DEPLOYMENT` | Gotowe do wysyłki | Ready for Deployment |
| `DEPLOYED` | Wysłane/Wdrożone | Deployed |
| `VERIFIED` | Zweryfikowane | Verified |
| `CANCELLED` | Anulowane | Cancelled |

---

## Subsystem Statuses (SubsystemStatus)

| Status | Opis (PL) | Description (EN) |
|--------|-----------|------------------|
| `CREATED` | Utworzony | Created |
| `BOM_GENERATED` | BOM wygenerowany | BOM Generated |
| `IP_ALLOCATED` | IP przydzielone | IP Allocated |
| `IN_COMPLETION` | W kompletacji | In Completion |
| `IN_PREFABRICATION` | W prefabrykacji | In Prefabrication |
| `READY_FOR_DEPLOYMENT` | Gotowe do wysyłki | Ready for Deployment |
| `DEPLOYED` | Wysłane | Deployed |

---

## Contract Statuses

| Status | Opis (PL) | Description (EN) |
|--------|-----------|------------------|
| `PENDING_CONFIGURATION` | Do konfiguracji | Pending Configuration |
| `CREATED` | Utworzony | Created |
| `APPROVED` | Zatwierdzony | Approved |
| `IN_PROGRESS` | W realizacji | In Progress |
| `COMPLETED` | Zakończony | Completed |
| `CANCELLED` | Anulowany | Cancelled |
| `ACTIVE` | Aktywny (Symfonia) | Active (Symfonia) |
| `INACTIVE` | Nieaktywny (Symfonia) | Inactive (Symfonia) |

---

## Completion Order Statuses

| Status | Opis (PL) | Description (EN) |
|--------|-----------|------------------|
| `pending` | Oczekuje | Pending |
| `in_progress` | W trakcie | In Progress |
| `completed` | Zakończona | Completed |

---

## Service Task Statuses

| Status | Opis (PL) | Description (EN) |
|--------|-----------|------------------|
| `created` | Utworzone | Created |
| `assigned` | Przypisane | Assigned |
| `in_progress` | W trakcie | In Progress |
| `completed` | Zakończone | Completed |
| `cancelled` | Anulowane | Cancelled |

---

## Substatuses (metadata.substatus)

| Substatus | Opis (PL) | Description (EN) |
|-----------|-----------|------------------|
| `wysyłka_zlecona` | Wysyłka zlecona | Shipment Ordered |
