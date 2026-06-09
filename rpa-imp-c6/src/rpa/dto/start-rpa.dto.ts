import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsUrl,
  IsNotEmpty,
} from 'class-validator';

export class StartRpaDto {
  @IsString()
  @IsNotEmpty()
  usuario!: string;

  @IsString()
  @IsNotEmpty()
  senha!: string;

  @IsString()
  @IsNotEmpty()
  loja!: string;

  @IsBoolean()
  @IsOptional()
  headless?: boolean = true;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  statusImportacao?: string[];

  @IsUrl()
  @IsNotEmpty()
  callbackUrl!: string;
}
