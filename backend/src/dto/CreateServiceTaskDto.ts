// src/dto/CreateServiceTaskDto.ts
// DTO for creating service tasks

import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { ServiceTaskVariant } from '../entities/ServiceTask';

export class CreateServiceTaskDto {
  @IsString({ message: 'Tytuł musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Tytuł jest wymagany' })
  title: string;

  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsOptional()
  description?: string;

  @IsEnum(ServiceTaskVariant, { message: 'Nieprawidłowy wariant zadania' })
  @IsNotEmpty({ message: 'Wariant zadania jest wymagany' })
  variant: ServiceTaskVariant;

  @IsNumber({}, { message: 'ID kontraktu musi być liczbą' })
  @IsOptional()
  contractId?: number;

  @IsNumber({}, { message: 'ID podsystemu musi być liczbą' })
  @IsOptional()
  subsystemId?: number;

  @IsNumber({}, { message: 'ID brygady musi być liczbą' })
  @IsOptional()
  brigadeId?: number;

  @IsDateString({}, { message: 'Nieprawidłowy format daty rozpoczęcia' })
  @IsOptional()
  plannedStartDate?: string;

  @IsDateString({}, { message: 'Nieprawidłowy format daty zakończenia' })
  @IsOptional()
  plannedEndDate?: string;

  @IsNumber({}, { message: 'Priorytet musi być liczbą' })
  @Min(0, { message: 'Priorytet nie może być mniejszy niż 0' })
  @Max(10, { message: 'Priorytet nie może być większy niż 10' })
  @IsOptional()
  priority?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateServiceTaskDto {
  @IsString({ message: 'Tytuł musi być ciągiem znaków' })
  @IsOptional()
  title?: string;

  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsOptional()
  description?: string;

  @IsEnum(ServiceTaskVariant, { message: 'Nieprawidłowy wariant zadania' })
  @IsOptional()
  variant?: ServiceTaskVariant;

  @IsString({ message: 'Status musi być ciągiem znaków' })
  @IsOptional()
  status?: string;

  @IsNumber({}, { message: 'ID brygady musi być liczbą' })
  @IsOptional()
  brigadeId?: number;

  @IsDateString({}, { message: 'Nieprawidłowy format daty rozpoczęcia' })
  @IsOptional()
  plannedStartDate?: string;

  @IsDateString({}, { message: 'Nieprawidłowy format daty zakończenia' })
  @IsOptional()
  plannedEndDate?: string;

  @IsNumber({}, { message: 'Priorytet musi być liczbą' })
  @Min(0, { message: 'Priorytet nie może być mniejszy niż 0' })
  @Max(10, { message: 'Priorytet nie może być większy niż 10' })
  @IsOptional()
  priority?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateServiceTaskActivityDto {
  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Opis jest wymagany' })
  description: string;

  @IsString({ message: 'Typ czynności musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Typ czynności jest wymagany' })
  activityType: string; // 'status_change', 'note', 'photo', 'material_used'

  @IsOptional()
  metadata?: Record<string, any>;
}
