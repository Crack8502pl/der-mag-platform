import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'refreshToken musi być ciągiem znaków' })
  @IsNotEmpty({ message: 'refreshToken jest wymagany' })
  refreshToken: string;
}
