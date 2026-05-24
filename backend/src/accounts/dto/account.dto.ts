import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AccountType } from '../../generated/prisma/client';
import { Type } from 'class-transformer';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsDateString()
  trackingStartDate: string;

  @IsOptional()
  @Type(() => Number)
  initialBalance?: number;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsDateString()
  trackingStartDate?: string;

  @IsOptional()
  @Type(() => Number)
  initialBalance?: number;

  @IsOptional()
  @IsString()
  color?: string;
}
