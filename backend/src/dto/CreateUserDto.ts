// src/dto/CreateUserDto.ts
// DTO tworzenia użytkownika

import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsNumber, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'Nazwa użytkownika musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Nazwa użytkownika jest wymagana' })
  @MaxLength(50, { message: 'Nazwa użytkownika może mieć maksymalnie 50 znaków' })
  username: string;

  @IsEmail({}, { message: 'Nieprawidłowy format adresu email' })
  @IsNotEmpty({ message: 'Email jest wymagany' })
  @MaxLength(100, { message: 'Email może mieć maksymalnie 100 znaków' })
  email: string;

  @IsString({ message: 'Hasło musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Hasło jest wymagane' })
  @MinLength(8, { message: 'Hasło musi mieć minimum 8 znaków' })
  @MaxLength(128, { message: 'Hasło może mieć maksymalnie 128 znaków' })
  password: string;

  @IsString({ message: 'Imię musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Imię jest wymagane' })
  @MaxLength(100, { message: 'Imię może mieć maksymalnie 100 znaków' })
  firstName: string;

  @IsString({ message: 'Nazwisko musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Nazwisko jest wymagane' })
  @MaxLength(100, { message: 'Nazwisko może mieć maksymalnie 100 znaków' })
  lastName: string;

  @IsString({ message: 'Telefon musi być ciągiem znaków' })
  @IsOptional()
  @MaxLength(20, { message: 'Telefon może mieć maksymalnie 20 znaków' })
  phone?: string;

  @IsNumber({}, { message: 'ID roli musi być liczbą' })
  @IsNotEmpty({ message: 'ID roli jest wymagane' })
  roleId: number;
}
