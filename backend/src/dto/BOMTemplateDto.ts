// src/dto/BOMTemplateDto.ts
// DTO dla operacji na szablonach BOM

import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, MaxLength } from 'class-validator';

export class CreateBOMTemplateDto {
  @IsNumber({}, { message: 'ID typu zadania musi być liczbą' })
  @IsNotEmpty({ message: 'ID typu zadania jest wymagane' })
  taskTypeId: number;

  @IsString({ message: 'Nazwa materiału musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Nazwa materiału jest wymagana' })
  @MaxLength(200, { message: 'Nazwa materiału może mieć maksymalnie 200 znaków' })
  materialName: string;

  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsOptional()
  description?: string;

  @IsString({ message: 'Jednostka musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(50, { message: 'Jednostka może mieć maksymalnie 50 znaków' })
  unit?: string;

  @IsNumber({}, { message: 'Domyślna ilość musi być liczbą' })
  @IsOptional()
  defaultQuantity?: number;

  @IsBoolean({ message: 'isSerialized musi być wartością logiczną' })
  @IsOptional()
  isSerialized?: boolean;

  @IsString({ message: 'Kategoria musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(100, { message: 'Kategoria może mieć maksymalnie 100 znaków' })
  category?: string;

  @IsString({ message: 'Numer części musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(100, { message: 'Numer części może mieć maksymalnie 100 znaków' })
  partNumber?: string;

  @IsString({ message: 'Numer katalogowy musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(100, { message: 'Numer katalogowy może mieć maksymalnie 100 znaków' })
  catalogNumber?: string;

  @IsString({ message: 'Dostawca musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(255, { message: 'Dostawca może mieć maksymalnie 255 znaków' })
  supplier?: string;

  @IsNumber({}, { message: 'Cena jednostkowa musi być liczbą' })
  @IsOptional()
  unitPrice?: number;

  @IsBoolean({ message: 'isRequired musi być wartością logiczną' })
  @IsOptional()
  isRequired?: boolean;

  @IsNumber({}, { message: 'Kolejność sortowania musi być liczbą' })
  @IsOptional()
  sortOrder?: number;
}

export class UpdateBOMTemplateDto {
  @IsString({ message: 'Nazwa materiału musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(200, { message: 'Nazwa materiału może mieć maksymalnie 200 znaków' })
  materialName?: string;

  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsOptional()
  description?: string;

  @IsString({ message: 'Jednostka musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(50, { message: 'Jednostka może mieć maksymalnie 50 znaków' })
  unit?: string;

  @IsNumber({}, { message: 'Domyślna ilość musi być liczbą' })
  @IsOptional()
  defaultQuantity?: number;

  @IsBoolean({ message: 'isSerialized musi być wartością logiczną' })
  @IsOptional()
  isSerialized?: boolean;

  @IsString({ message: 'Kategoria musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(100, { message: 'Kategoria może mieć maksymalnie 100 znaków' })
  category?: string;

  @IsString({ message: 'Numer części musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(100, { message: 'Numer części może mieć maksymalnie 100 znaków' })
  partNumber?: string;

  @IsString({ message: 'Numer katalogowy musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(100, { message: 'Numer katalogowy może mieć maksymalnie 100 znaków' })
  catalogNumber?: string;

  @IsString({ message: 'Dostawca musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(255, { message: 'Dostawca może mieć maksymalnie 255 znaków' })
  supplier?: string;

  @IsNumber({}, { message: 'Cena jednostkowa musi być liczbą' })
  @IsOptional()
  unitPrice?: number;

  @IsBoolean({ message: 'isRequired musi być wartością logiczną' })
  @IsOptional()
  isRequired?: boolean;

  @IsNumber({}, { message: 'Kolejność sortowania musi być liczbą' })
  @IsOptional()
  sortOrder?: number;

  @IsBoolean({ message: 'active musi być wartością logiczną' })
  @IsOptional()
  active?: boolean;
}

export class BatchCreateBOMTemplatesDto {
  @IsNumber({}, { message: 'ID typu zadania musi być liczbą' })
  @IsNotEmpty({ message: 'ID typu zadania jest wymagane' })
  taskTypeId: number;

  @IsNotEmpty({ message: 'Lista materiałów jest wymagana' })
  materials: CreateBOMTemplateDto[];
}

export class CopyBOMTemplateDto {
  @IsNumber({}, { message: 'ID typu zadania źródłowego musi być liczbą' })
  @IsNotEmpty({ message: 'ID typu zadania źródłowego jest wymagane' })
  sourceTaskTypeId: number;

  @IsNumber({}, { message: 'ID typu zadania docelowego musi być liczbą' })
  @IsNotEmpty({ message: 'ID typu zadania docelowego jest wymagane' })
  targetTaskTypeId: number;
}
