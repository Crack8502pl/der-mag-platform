// src/dto/CreateTaskDto.ts
// DTO tworzenia zadania

import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, MaxLength, Min } from 'class-validator';

export class CreateTaskDto {
  @IsString({ message: 'Tytuł musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Tytuł jest wymagany' })
  @MaxLength(200, { message: 'Tytuł może mieć maksymalnie 200 znaków' })
  title: string;

  @IsString({ message: 'Opis musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(5000, { message: 'Opis może mieć maksymalnie 5000 znaków' })
  description?: string;

  @IsNumber({}, { message: 'ID typu zadania musi być liczbą' })
  @IsNotEmpty({ message: 'ID typu zadania jest wymagane' })
  taskTypeId: number;

  @IsString({ message: 'Lokalizacja musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(200, { message: 'Lokalizacja może mieć maksymalnie 200 znaków' })
  location?: string;

  @IsString({ message: 'Klient musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(100, { message: 'Klient może mieć maksymalnie 100 znaków' })
  client?: string;

  @IsString({ message: 'Numer kontraktu musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(100, { message: 'Numer kontraktu może mieć maksymalnie 100 znaków' })
  contractNumber?: string;

  @IsNumber({}, { message: 'ID kontraktu musi być liczbą' })
  @IsOptional()
  @Min(1, { message: 'ID kontraktu musi być liczbą dodatnią' })
  contractId?: number;

  @IsNumber({}, { message: 'ID podsystemu musi być liczbą' })
  @IsOptional()
  @Min(1, { message: 'ID podsystemu musi być liczbą dodatnią' })
  subsystemId?: number;

  @IsNumber({}, { message: 'ID zadania nadrzędnego musi być liczbą' })
  @IsOptional()
  @Min(1, { message: 'ID zadania nadrzędnego musi być liczbą dodatnią' })
  parentTaskId?: number;

  @IsDateString({}, { message: 'Nieprawidłowy format daty rozpoczęcia' })
  @IsOptional()
  plannedStartDate?: string;

  @IsDateString({}, { message: 'Nieprawidłowy format daty zakończenia' })
  @IsOptional()
  plannedEndDate?: string;

  @IsNumber({}, { message: 'Priorytet musi być liczbą' })
  @IsOptional()
  priority?: number;
}
