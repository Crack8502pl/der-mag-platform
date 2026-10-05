import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, Equals, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNotIn, IsObject,
  IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested,
} from 'class-validator';
import { FormJsonObject, FormKind, FormProcedureType } from '../entities/FormTypes';
import { FormResponses } from './FormServiceDto';
import { RESERVED_FORM_KEYS } from '../utils/formJson';

const supplied = (_: unknown, value: unknown) => value !== undefined;
const nullable = (_: unknown, value: unknown) => value !== undefined && value !== null;
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const pgMax = 2147483647;

export class CreateTemplateDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]+$/) @MaxLength(100)
  key: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(255)
  name: string;

  @ValidateIf(nullable) @IsString() @MaxLength(10000)
  description?: string | null;

  @ValidateIf(supplied) @IsEnum(FormKind)
  kind?: FormKind;

  @IsEnum(FormProcedureType)
  procedureType: FormProcedureType;
}

export class DraftFieldBody {
  @IsString() @Matches(/^[A-Za-z0-9_-]+$/) @MaxLength(100) @IsNotIn(RESERVED_FORM_KEYS)
  key: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(255)
  label: string;

  @IsIn(['TEXT', 'STRING', 'TEXTAREA', 'EMAIL', 'DATE', 'SELECT', 'RADIO', 'NUMBER', 'PASS_FAIL', 'CHECKBOX', 'MULTI_SELECT'])
  fieldType: string;

  @ValidateIf(supplied) @IsBoolean()
  required?: boolean;

  @ValidateIf(supplied) @IsInt() @Min(0) @Max(pgMax)
  sortOrder?: number;

  @ValidateIf(supplied) @IsObject()
  validation?: FormJsonObject;

  @ValidateIf(supplied) @IsObject()
  options?: FormJsonObject;

  @ValidateIf(supplied) @IsObject()
  conditions?: FormJsonObject;
}

export class DraftSectionBody {
  @IsString() @Matches(/^[A-Za-z0-9_-]+$/) @MaxLength(100) @IsNotIn(RESERVED_FORM_KEYS)
  key: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(255)
  title: string;

  @ValidateIf(nullable) @IsString() @MaxLength(10000)
  description?: string | null;

  @ValidateIf(supplied) @IsInt() @Min(0) @Max(pgMax)
  sortOrder?: number;

  @ValidateIf(supplied) @IsObject()
  conditions?: FormJsonObject;

  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => DraftFieldBody)
  fields: DraftFieldBody[];
}

export class UpdateDraftDto {
  @ValidateIf(supplied) @Transform(trim) @IsString() @MinLength(1) @MaxLength(255)
  title?: string;

  @ValidateIf(nullable) @IsString() @MaxLength(10000)
  description?: string | null;

  @ValidateIf(supplied) @IsObject()
  settings?: FormJsonObject;

  @ValidateIf(supplied) @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => DraftSectionBody)
  sections?: DraftSectionBody[];
}

export class CreateInstanceDto {
  @IsInt() @Min(1) @Max(pgMax)
  templateVersionId: number;

  @ValidateIf(supplied) @IsInt() @Min(1) @Max(pgMax)
  contractId?: number;

  @ValidateIf(supplied) @IsInt() @Min(1) @Max(pgMax)
  taskId?: number;

  @ValidateIf(supplied) @IsInt() @Min(1) @Max(pgMax)
  subsystemTaskId?: number;

  @ValidateIf(supplied) @IsInt() @Min(1) @Max(pgMax)
  objectId?: number;

  @ValidateIf(supplied) @IsInt() @Min(1) @Max(pgMax)
  deviceId?: number;

  @ValidateIf(supplied) @IsInt() @Min(1) @Max(pgMax)
  bomItemId?: number;

  @ValidateIf(supplied) @IsInt() @Min(1) @Max(pgMax)
  workflowBomItemId?: number;

  @ValidateIf(supplied) @IsInt() @Min(1) @Max(pgMax)
  assignedUserId?: number;

  @ValidateIf(supplied) @IsInt() @Min(1) @Max(pgMax)
  assignedTeamId?: number;
}

export class ResponsesDto {
  @IsObject()
  responses: FormResponses;
}

export class InstanceAssignmentDto {
  @ValidateIf(nullable) @IsInt() @Min(1) @Max(pgMax)
  assignedUserId?: number | null;

  @ValidateIf(nullable) @IsInt() @Min(1) @Max(pgMax)
  assignedTeamId?: number | null;
}

export class EmptyFormActionDto {
  // The sentinel validates an empty DTO without permitting any JSON payload property.
  @Equals(undefined)
  _empty?: never;
}

export class ApprovalDto {
  @ValidateIf(supplied) @Transform(trim) @IsString() @MinLength(1) @MaxLength(10000)
  comment?: string;
}

export class RejectionDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(10000)
  comment: string;
}

export class AssignmentRuleDto {
  @ValidateIf(nullable) @IsInt() @Min(1) @Max(pgMax)
  triggerId?: number | null;

  @ValidateIf(supplied) @IsInt() @Min(0) @Max(pgMax)
  priority?: number;

  @ValidateIf(supplied) @IsBoolean()
  active?: boolean;

  @ValidateIf(supplied) @IsObject()
  conditions?: FormJsonObject;

  @ValidateIf(supplied) @IsInt() @Min(1) @Max(pgMax)
  assignedUserId?: number;

  @ValidateIf(supplied) @IsInt() @Min(1) @Max(pgMax)
  assignedTeamId?: number;
}

export class AssignmentRulesDto {
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => AssignmentRuleDto)
  rules: AssignmentRuleDto[];
}
