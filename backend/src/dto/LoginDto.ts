// src/dto/LoginDto.ts
// DTO logowania użytkownika

import { IsString, IsNotEmpty, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'Nazwa użytkownika musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Nazwa użytkownika jest wymagana' })
  username: string;

  @IsString({ message: 'Hasło musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Hasło jest wymagane' })
  @MinLength(8, { message: 'Hasło musi mieć minimum 8 znaków' })
  password: string;

  @IsOptional()
  @IsBoolean({ message: 'Pole rememberMe musi być wartością logiczną' })
  rememberMe?: boolean;
}
