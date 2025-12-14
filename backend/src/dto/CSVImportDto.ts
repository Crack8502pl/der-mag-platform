// src/dto/CSVImportDto.ts
// DTO dla importu materiałów z CSV

import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialCSVRowDto {
  @IsString({ message: 'Numer katalogowy musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Numer katalogowy jest wymagany' })
  catalog_number: string;

  @IsString({ message: 'Nazwa materiału musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Nazwa materiału jest wymagana' })
  name: string;

  @IsString({ message: 'Jednostka musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Jednostka jest wymagana' })
  unit: string;

  @IsNumber({}, { message: 'Domyślna ilość musi być liczbą' })
  @IsOptional()
  default_quantity?: number;

  @IsString({ message: 'Kategoria musi być ciągiem znaków' })
  @IsOptional()
  category?: string;

  @IsString({ message: 'Dostawca musi być ciągiem znaków' })
  @IsOptional()
  supplier?: string;

  @IsNumber({}, { message: 'Cena jednostkowa musi być liczbą' })
  @IsOptional()
  unit_price?: number;
}

export class CSVImportPreviewDto {
  uuid: string;
  filename: string;
  totalRows: number;
  newItems: number;
  existingItems: number;
  errorItems: number;
  preview: {
    new: MaterialCSVRowDto[];
    existing: MaterialCSVRowDto[];
    errors: Array<{ row: number; data: any; error: string }>;
  };
}

export class ConfirmImportDto {
  @IsString({ message: 'UUID importu musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'UUID importu jest wymagany' })
  uuid: string;
}
