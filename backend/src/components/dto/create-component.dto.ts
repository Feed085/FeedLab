import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ComponentSpecDto {
  @IsNotEmpty({ message: 'Göstərici adı mütləq doldurulmalıdır' })
  @IsString({ message: 'Göstərici adı mətn formatında olmalıdır' })
  label: string;

  @IsNotEmpty({ message: 'Göstərici dəyəri mütləq doldurulmalıdır' })
  @IsString({ message: 'Göstərici dəyəri mətn formatında olmalıdır' })
  value: string;
}

export class ComponentPinDto {
  @IsNotEmpty({ message: 'Pin nömrəsi mütləq doldurulmalıdır' })
  @IsString({ message: 'Pin nömrəsi mətn formatında olmalıdır' })
  pin: string;

  @IsNotEmpty({ message: 'Pin adı mütləq doldurulmalıdır' })
  @IsString({ message: 'Pin adı mətn formatında olmalıdır' })
  name: string;

  @IsNotEmpty({ message: 'Pin funksiyası mütləq doldurulmalıdır' })
  @IsString({ message: 'Pin funksiyası mətn formatında olmalıdır' })
  function: string;

  @IsOptional()
  @IsString({ message: 'Pin tipi mətn formatında olmalıdır' })
  type?: string;
}

export class ComponentCodeExampleDto {
  @IsNotEmpty({ message: 'Proqramlaşdırma dili mütləq doldurulmalıdır' })
  @IsString({ message: 'Proqramlaşdırma dili mətn formatında olmalıdır' })
  language: string;

  @IsOptional()
  @IsString({ message: 'Kod başlığı mətn formatında olmalıdır' })
  title?: string;

  @IsNotEmpty({ message: 'Nümunə kodu mütləq doldurulmalıdır' })
  @IsString({ message: 'Nümunə kodu mətn formatında olmalıdır' })
  code: string;
}

export class ComponentAlternativeDto {
  @IsOptional()
  @IsString({ message: 'Alternativ slug mətn formatında olmalıdır' })
  slug?: string;

  @IsNotEmpty({ message: 'Alternativ komponent adı mütləq doldurulmalıdır' })
  @IsString({ message: 'Alternativ komponent adı mətn formatında olmalıdır' })
  name: string;

  @IsNotEmpty({ message: 'Alternativ seçilmə səbəbi mütləq doldurulmalıdır' })
  @IsString({ message: 'Alternativ seçilmə səbəbi mətn formatında olmalıdır' })
  reason: string;
}

export class CreateComponentDto {
  @IsNotEmpty({ message: 'Komponent slug dəyəri mütləq doldurulmalıdır' })
  @IsString({ message: 'Komponent slug mətn formatında olmalıdır' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug yalnız kiçik latın hərfləri, rəqəmlər və defis (-) simvolundan ibarət olmalıdır',
  })
  slug: string;

  @IsNotEmpty({ message: 'Komponent adı mütləq doldurulmalıdır' })
  @IsString({ message: 'Komponent adı mətn formatında olmalıdır' })
  name: string;

  @IsOptional()
  @IsArray({ message: 'Alternativ adlar siyahı formatında olmalıdır' })
  @IsString({ each: true, message: 'Hər alternativ ad mətn formatında olmalıdır' })
  aliases?: string[];

  @IsNotEmpty({ message: 'Kateqoriya açarı mütləq doldurulmalıdır' })
  @IsString({ message: 'Kateqoriya açarı mətn formatında olmalıdır' })
  category: string;

  @IsNotEmpty({ message: 'Kateqoriya adı mütləq doldurulmalıdır' })
  @IsString({ message: 'Kateqoriya adı mətn formatında olmalıdır' })
  categoryLabel: string;

  @IsNotEmpty({ message: 'Qısa təsvir mütləq doldurulmalıdır' })
  @IsString({ message: 'Qısa təsvir mətn formatında olmalıdır' })
  shortDescription: string;

  @IsNotEmpty({ message: 'Komponentin tərif bölməsi mütləq doldurulmalıdır' })
  @IsString({ message: 'Komponentin tərif bölməsi mətn formatında olmalıdır' })
  definition: string;

  @IsNotEmpty({ message: 'İş prinsipi bölməsi mütləq doldurulmalıdır' })
  @IsString({ message: 'İş prinsipi bölməsi mətn formatında olmalıdır' })
  workingPrinciple: string;

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
  pinoutImageUrl?: string;

  @IsOptional()
  @IsString({ message: 'Qoşulma qaydası mətn formatında olmalıdır' })
  wiringGuide?: string;

  @IsOptional()
  @IsString({ message: 'Qoşulma sxemi şəkli URL mətn formatında olmalıdır' })
  wiringImageUrl?: string;

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
  imageUrl?: string;

  @IsOptional()
  @IsBoolean({ message: 'Aktivlik statusu boolean formatında olmalıdır' })
  isActive?: boolean;
}
