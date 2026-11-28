import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ComponentSpecDto,
  ComponentPinDto,
  ComponentCodeExampleDto,
  ComponentAlternativeDto,
} from './create-component.dto';

export class UpdateComponentDto {
  @IsOptional()
  @IsString({ message: 'Komponent slug mətn formatında olmalıdır' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug yalnız kiçik latın hərfləri, rəqəmlər və defis (-) simvolundan ibarət olmalıdır',
  })
  slug?: string;

  @IsOptional()
  @IsString({ message: 'Komponent adı mətn formatında olmalıdır' })
  name?: string;

  @IsOptional()
  @IsArray({ message: 'Alternativ adlar siyahı formatında olmalıdır' })
  @IsString({ each: true, message: 'Hər alternativ ad mətn formatında olmalıdır' })
  aliases?: string[];

  @IsOptional()
  @IsString({ message: 'Kateqoriya açarı mətn formatında olmalıdır' })
  category?: string;

  @IsOptional()
  @IsString({ message: 'Kateqoriya adı mətn formatında olmalıdır' })
  categoryLabel?: string;

  @IsOptional()
  @IsString({ message: 'Qısa təsvir mətn formatında olmalıdır' })
  shortDescription?: string;

  @IsOptional()
  @IsString({ message: 'Komponentin tərif bölməsi mətn formatında olmalıdır' })
  definition?: string;

  @IsOptional()
  @IsString({ message: 'İş prinsipi bölməsi mətn formatında olmalıdır' })
  workingPrinciple?: string;

  @IsOptional()
  @IsArray({ message: 'Tətbiq sahələri siyahı formatında olmalıdır' })
  @IsString({ each: true, message: 'Hər tətbiq sahəsi mətn formatında olmalıdır' })
  applications?: string[];

  @IsOptional()
  @IsArray({ message: 'Texniki göstəricilər siyahı formatında olmalıdır' })
  @ValidateNested({ each: true })
  @Type(() => ComponentSpecDto)
  specs?: ComponentSpecDto[];

  @IsOptional()
  @IsArray({ message: 'Pinout siyahı formatında olmalıdır' })
  @ValidateNested({ each: true })
  @Type(() => ComponentPinDto)
  pinout?: ComponentPinDto[];

  @IsOptional()
  @IsString({ message: 'Pinout şəkli URL mətn formatında olmalıdır' })
  pinoutImageUrl?: string | null;

  @IsOptional()
  @IsString({ message: 'Qoşulma qaydası mətn formatında olmalıdır' })
  wiringGuide?: string;

  @IsOptional()
  @IsString({ message: 'Qoşulma sxemi şəkli URL mətn formatında olmalıdır' })
  wiringImageUrl?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ComponentCodeExampleDto)
  codeExample?: ComponentCodeExampleDto | null;

  @IsOptional()
  @IsArray({ message: 'Üstünlüklər siyahı formatında olmalıdır' })
  @IsString({ each: true, message: 'Hər üstünlük mətn formatında olmalıdır' })
  pros?: string[];

  @IsOptional()
  @IsArray({ message: 'Məhdudiyyətlər siyahı formatında olmalıdır' })
  @IsString({ each: true, message: 'Hər məhdudiyyət mətn formatında olmalıdır' })
  limitations?: string[];

  @IsOptional()
  @IsArray({ message: 'Alternativlər siyahı formatında olmalıdır' })
  @ValidateNested({ each: true })
  @Type(() => ComponentAlternativeDto)
  alternatives?: ComponentAlternativeDto[];

  @IsOptional()
  @IsString({ message: 'Şəkil URL mətn formatında olmalıdır' })
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'Aktivlik statusu boolean formatında olmalıdır' })
  isActive?: boolean;
}
