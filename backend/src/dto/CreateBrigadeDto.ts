// src/dto/CreateBrigadeDto.ts
// DTO for creating and managing brigades

import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsNumber, IsArray, IsDateString, ArrayMinSize, ArrayMaxSize, Min, Max } from 'class-validator';

export class CreateBrigadeDto {
  @IsString({ message: 'Kod brygady musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Kod brygady (numer rejestracyjny) jest wymagany' })
  code: string; // Vehicle registration number

  @IsString({ message: 'Nazwa musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Nazwa brygady jest wymagana' })
  name: string;

  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsOptional()
  description?: string;

  @IsBoolean({ message: 'Status aktywności musi być wartością logiczną' })
  @IsOptional()
  active?: boolean;
}

export class UpdateBrigadeDto {
  @IsString({ message: 'Kod brygady musi być ciągiem znaków' })
  @IsOptional()
  code?: string;

  @IsString({ message: 'Nazwa musi być ciągiem znaków' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsOptional()
  description?: string;

  @IsBoolean({ message: 'Status aktywności musi być wartością logiczną' })
  @IsOptional()
  active?: boolean;
}

export class BrigadeMemberDto {
  @IsNumber({}, { message: 'ID użytkownika musi być liczbą' })
  @IsNotEmpty({ message: 'ID użytkownika jest wymagane' })
  userId: number;

  @IsArray({ message: 'Dni pracy muszą być tablicą' })
  @ArrayMinSize(1, { message: 'Wybierz co najmniej jeden dzień pracy' })
  @ArrayMaxSize(7, { message: 'Maksymalnie 7 dni pracy' })
  @IsNumber({}, { each: true, message: 'Każdy dzień musi być liczbą' })
  @Min(1, { each: true, message: 'Dzień musi być od 1 do 7' })
  @Max(7, { each: true, message: 'Dzień musi być od 1 do 7' })
  workDays: number[]; // 1=Mon, 2=Tue, ..., 7=Sun

  @IsDateString({}, { message: 'Nieprawidłowy format daty rozpoczęcia' })
  @IsNotEmpty({ message: 'Data rozpoczęcia jest wymagana' })
  validFrom: string;

  @IsDateString({}, { message: 'Nieprawidłowy format daty zakończenia' })
  @IsOptional()
  validTo?: string;

  @IsBoolean({ message: 'Status aktywności musi być wartością logiczną' })
  @IsOptional()
  active?: boolean;
}

export class AddBrigadeMemberDto extends BrigadeMemberDto {}

export class UpdateBrigadeMemberDto {
  @IsArray({ message: 'Dni pracy muszą być tablicą' })
  @IsOptional()
  @ArrayMinSize(1, { message: 'Wybierz co najmniej jeden dzień pracy' })
  @ArrayMaxSize(7, { message: 'Maksymalnie 7 dni pracy' })
  @IsNumber({}, { each: true, message: 'Każdy dzień musi być liczbą' })
  @Min(1, { each: true, message: 'Dzień musi być od 1 do 7' })
  @Max(7, { each: true, message: 'Dzień musi być od 1 do 7' })
  workDays?: number[];

  @IsDateString({}, { message: 'Nieprawidłowy format daty rozpoczęcia' })
  @IsOptional()
  validFrom?: string;

  @IsDateString({}, { message: 'Nieprawidłowy format daty zakończenia' })
  @IsOptional()
  validTo?: string;

  @IsBoolean({ message: 'Status aktywności musi być wartością logiczną' })
  @IsOptional()
  active?: boolean;
}
