// src/dto/ChangePasswordDto.ts
// DTO dla zmiany hasła z walidacją

import { IsString, IsNotEmpty, Matches, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Nowe hasło musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Nowe hasło jest wymagane' })
  @MinLength(8, { message: 'Hasło musi mieć minimum 8 znaków' })
  @MaxLength(12, { message: 'Hasło może mieć maksymalnie 12 znaków' })
  @Matches(
    /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,12}$/,
    {
      message: 'Hasło musi zawierać: minimum 1 dużą literę (A-Z), 1 cyfrę (0-9), 1 znak specjalny (!@#$%^&*()_+-=[]{};\':"\\|,.<>/?), oraz mieć długość 8-12 znaków'
    }
  )
  newPassword: string;

  @IsString({ message: 'Potwierdzenie hasła musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'Potwierdzenie hasła jest wymagane' })
  confirmPassword: string;
}
