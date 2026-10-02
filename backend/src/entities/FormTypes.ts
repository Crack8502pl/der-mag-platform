export enum FormKind {
  FORM = 'FORM',
  CHECKLIST = 'CHECKLIST'
}

export enum FormProcedureType {
  CABINET_PREFABRICATION = 'CABINET_PREFABRICATION',
  DEVICE_PRECONFIGURATION = 'DEVICE_PRECONFIGURATION',
  FIELD_INSTALLATION = 'FIELD_INSTALLATION'
}

export enum FormVersionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED'
}

export enum FormInstanceStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum FormApprovalDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export type FormJsonValue = string | number | boolean | null | FormJsonValue[] | FormJsonObject;
export type FormJsonObject = { [key: string]: FormJsonValue };
