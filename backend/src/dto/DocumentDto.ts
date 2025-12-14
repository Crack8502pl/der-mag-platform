// src/dto/DocumentDto.ts
// DTO dla operacji na dokumentach

import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString({ message: 'Nazwa musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Nazwa jest wymagana' })
  @MaxLength(255, { message: 'Nazwa może mieć maksymalnie 255 znaków' })
  name: string;

  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'ID zadania musi być liczbą' })
  @IsOptional()
  taskId?: number;

  @IsEnum(['invoice', 'protocol', 'report', 'bom_list', 'other'], { 
    message: 'Nieprawidłowa kategoria dokumentu' 
  })
  @IsNotEmpty({ message: 'Kategoria jest wymagana' })
  category: string;
}

export class UpdateDocumentDto {
  @IsString({ message: 'Nazwa musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(255, { message: 'Nazwa może mieć maksymalnie 255 znaków' })
  name?: string;

  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsOptional()
  description?: string;

  @IsEnum(['invoice', 'protocol', 'report', 'bom_list', 'other'], { 
    message: 'Nieprawidłowa kategoria dokumentu' 
  })
  @IsOptional()
  category?: string;
}

export class CreateTemplateDto {
  @IsString({ message: 'Nazwa musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Nazwa jest wymagana' })
  @MaxLength(255, { message: 'Nazwa może mieć maksymalnie 255 znaków' })
  name: string;

  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'ID typu zadania musi być liczbą' })
  @IsOptional()
  taskTypeId?: number;

  @IsOptional()
  placeholders?: Record<string, any>;
}

export class GenerateDocumentDto {
  @IsNotEmpty({ message: 'Dane do wypełnienia są wymagane' })
  data: Record<string, any>;

  @IsString({ message: 'Nazwa dokumentu musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Nazwa dokumentu jest wymagana' })
  documentName: string;

  @IsNumber({}, { message: 'ID zadania musi być liczbą' })
  @IsOptional()
  taskId?: number;
}
