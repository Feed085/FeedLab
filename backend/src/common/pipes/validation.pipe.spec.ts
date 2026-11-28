import { CustomValidationPipe } from './validation.pipe';
import {
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { BadRequestException, ArgumentMetadata } from '@nestjs/common';

enum TestRole {
  USER = 'user',
  AUTHOR = 'author',
  ADMIN = 'admin',
}

class SampleDto {
  @IsNotEmpty()
  title: string;

  @IsEmail()
  email: string;
}

class ExtendedDto {
  @MinLength(8)
  @MaxLength(32)
  password: string;

  @IsEnum(TestRole)
  role: TestRole;

  @Min(18)
  @Max(100)
  age: number;
}

describe('CustomValidationPipe', () => {
  let pipe: CustomValidationPipe;
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: SampleDto,
    data: '',
  };
  const extendedMetadata: ArgumentMetadata = {
    type: 'body',
    metatype: ExtendedDto,
    data: '',
  };

  beforeEach(() => {
    pipe = new CustomValidationPipe();
  });

  it('should pass validation when valid data is provided', async () => {
    const validData = {
      title: 'Arduino Robot Layihəsi',
      email: 'test@feedlab.az',
    };

    const result = await pipe.transform(validData, metadata);
    expect(result).toEqual(validData);
  });

  it('should map missing and invalid fields to Azerbaijani error messages', async () => {
    const invalidData = {
      title: '',
      email: 'not-an-email',
    };

    try {
      await pipe.transform(invalidData, metadata);
      fail('Validation should have thrown BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      expect(response.message).toContain('Bu xana mütləq doldurulmalıdır');
      expect(response.message).toContain('Düzgün bir e-poçt ünvanı daxil edin');
    }
  });

  it('should map minLength, maxLength, isEnum, min, and max to Azerbaijani without leaking English', async () => {
    const invalidData = {
      password: 'abc', // too short (< 8)
      role: 'superadmin', // invalid enum
      age: 15, // too young (< 18)
    };

    try {
      await pipe.transform(invalidData, extendedMetadata);
      fail('Validation should have thrown BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const messages: string[] = response.message;

      // Verify specific localized constraints
      expect(messages.some((m) => m.includes('ən azı 8 simvol olmalıdır'))).toBe(true);
      expect(messages.some((m) => m.includes('yalnız icazə verilən dəyərlərdən biri ola bilər'))).toBe(true);
      expect(messages.some((m) => m.includes('ən azı 18 olmalıdır'))).toBe(true);

      // Verify no English class-validator strings leaked
      for (const msg of messages) {
        expect(msg).not.toMatch(/must be longer than/i);
        expect(msg).not.toMatch(/must be one of/i);
        expect(msg).not.toMatch(/must not be less than/i);
      }
    }
  });

  it('should map maxLength and max constraints properly', async () => {
    const invalidData = {
      password: 'a'.repeat(35), // too long (> 32)
      role: 'invalid_role',
      age: 150, // too old (> 100)
    };

    try {
      await pipe.transform(invalidData, extendedMetadata);
      fail('Validation should have thrown BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      const messages: string[] = response.message;

      expect(messages.some((m) => m.includes('ən çoxu 32 simvol ola bilər'))).toBe(true);
      expect(messages.some((m) => m.includes('ən çoxu 100 ola bilər'))).toBe(true);

      for (const msg of messages) {
        expect(msg).not.toMatch(/must be shorter than/i);
        expect(msg).not.toMatch(/must not be greater than/i);
      }
    }
  });
});
