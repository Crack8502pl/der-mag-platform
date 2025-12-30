// src/dto/BomTriggerDto.ts
// DTO walidacyjne dla triggerów BOM

import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsIn, IsObject, MaxLength } from 'class-validator';
import { TriggerEvent, ActionType } from '../entities/BomTrigger';

export class CreateBomTriggerDto {
  @IsString({ message: 'Nazwa musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Nazwa jest wymagana' })
  @MaxLength(200, { message: 'Nazwa może mieć maksymalnie 200 znaków' })
  name: string;

  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsOptional()
  description?: string;

  @IsString({ message: 'Typ eventu musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Typ eventu jest wymagany' })
  @IsIn(['ON_TASK_CREATE', 'ON_STATUS_CHANGE', 'ON_BOM_UPDATE', 'ON_MATERIAL_ADD', 'ON_QUANTITY_CHANGE'], {
    message: 'Nieprawidłowy typ eventu'
  })
  triggerEvent: TriggerEvent;

  @IsObject({ message: 'Warunek triggera musi być obiektem' })
  @IsOptional()
  triggerCondition?: Record<string, any>;

  @IsString({ message: 'Typ akcji musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Typ akcji jest wymagany' })
  @IsIn(['ADD_MATERIAL', 'UPDATE_QUANTITY', 'COPY_BOM', 'NOTIFY', 'CALCULATE_COST'], {
    message: 'Nieprawidłowy typ akcji'
  })
  actionType: ActionType;

  @IsObject({ message: 'Konfiguracja akcji musi być obiektem' })
  @IsNotEmpty({ message: 'Konfiguracja akcji jest wymagana' })
  actionConfig: Record<string, any>;

  @IsNumber({}, { message: 'ID źródłowego typu zadania musi być liczbą' })
  @IsOptional()
  sourceTaskTypeId?: number;

  @IsNumber({}, { message: 'ID docelowego typu zadania musi być liczbą' })
  @IsOptional()
  targetTaskTypeId?: number;

  @IsNumber({}, { message: 'Priorytet musi być liczbą' })
  @IsOptional()
  priority?: number;

  @IsBoolean({ message: 'isActive musi być wartością logiczną' })
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBomTriggerDto {
  @IsString({ message: 'Nazwa musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(200, { message: 'Nazwa może mieć maksymalnie 200 znaków' })
  name?: string;

  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsOptional()
  description?: string;

  @IsString({ message: 'Typ eventu musi być ciągiem znaków' })
  @IsOptional()
  @IsIn(['ON_TASK_CREATE', 'ON_STATUS_CHANGE', 'ON_BOM_UPDATE', 'ON_MATERIAL_ADD', 'ON_QUANTITY_CHANGE'], {
    message: 'Nieprawidłowy typ eventu'
  })
  triggerEvent?: TriggerEvent;

  @IsObject({ message: 'Warunek triggera musi być obiektem' })
  @IsOptional()
  triggerCondition?: Record<string, any>;

  @IsString({ message: 'Typ akcji musi być ciągiem znaków' })
  @IsOptional()
  @IsIn(['ADD_MATERIAL', 'UPDATE_QUANTITY', 'COPY_BOM', 'NOTIFY', 'CALCULATE_COST'], {
    message: 'Nieprawidłowy typ akcji'
  })
  actionType?: ActionType;

  @IsObject({ message: 'Konfiguracja akcji musi być obiektem' })
  @IsOptional()
  actionConfig?: Record<string, any>;

  @IsNumber({}, { message: 'ID źródłowego typu zadania musi być liczbą' })
  @IsOptional()
  sourceTaskTypeId?: number;

  @IsNumber({}, { message: 'ID docelowego typu zadania musi być liczbą' })
  @IsOptional()
  targetTaskTypeId?: number;

  @IsNumber({}, { message: 'Priorytet musi być liczbą' })
  @IsOptional()
  priority?: number;

  @IsBoolean({ message: 'isActive musi być wartością logiczną' })
  @IsOptional()
  isActive?: boolean;
}

export class TestBomTriggerDto {
  @IsObject({ message: 'Dane testowe muszą być obiektem' })
  @IsNotEmpty({ message: 'Dane testowe są wymagane' })
  testData: Record<string, any>;
}
