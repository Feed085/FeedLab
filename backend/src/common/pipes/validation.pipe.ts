import {
  ValidationPipe as NestValidationPipe,
  ValidationError,
  BadRequestException,
} from '@nestjs/common';
import { BACKEND_VALIDATION_MESSAGES } from '../i18n/az.messages';

function mapConstraintToAzerbaijani(
  property: string,
  constraintKey: string,
  defaultMessage: string,
): string {
  // If decorator already provided a custom Azerbaijani message (non-English)
  if (defaultMessage && /[əğıöşüçƏĞIİÖŞÜÇ]/.test(defaultMessage)) {
    return defaultMessage;
  }

  // Strip property name prefix from defaultMessage if present to avoid matching digits inside property name (e.g. pw2, field1)
  const messageBody =
    defaultMessage && defaultMessage.startsWith(property)
      ? defaultMessage.slice(property.length)
      : defaultMessage || '';

  switch (constraintKey) {
    case 'isNotEmpty':
      return BACKEND_VALIDATION_MESSAGES.IS_NOT_EMPTY;
    case 'isDefined':
      return BACKEND_VALIDATION_MESSAGES.IS_DEFINED;
    case 'isEmail':
      return BACKEND_VALIDATION_MESSAGES.IS_EMAIL;
    case 'isString':
      return BACKEND_VALIDATION_MESSAGES.IS_STRING.replace('$property', property);
    case 'isNumber':
      return BACKEND_VALIDATION_MESSAGES.IS_NUMBER.replace('$property', property);
    case 'isInt':
      return BACKEND_VALIDATION_MESSAGES.IS_INT.replace('$property', property);
    case 'isPositive':
      return BACKEND_VALIDATION_MESSAGES.IS_POSITIVE.replace('$property', property);
    case 'isBoolean':
      return BACKEND_VALIDATION_MESSAGES.IS_BOOLEAN.replace('$property', property);
    case 'isArray':
      return BACKEND_VALIDATION_MESSAGES.IS_ARRAY.replace('$property', property);
    case 'isDateString':
      return BACKEND_VALIDATION_MESSAGES.IS_DATE_STRING.replace('$property', property);
    case 'isUrl':
      return BACKEND_VALIDATION_MESSAGES.IS_URL.replace('$property', property);
    case 'isMongoId':
      return BACKEND_VALIDATION_MESSAGES.IS_MONGO_ID.replace('$property', property);
    case 'minLength': {
      const match = messageBody.match(/(\d+)/);
      const minLen = match ? match[1] : '';
      return minLen
        ? BACKEND_VALIDATION_MESSAGES.MIN_LENGTH.replace('$property', property).replace('$constraint1', minLen)
        : `${property} ən azı tələb olunan simvol sayında olmalıdır`;
    }
    case 'maxLength': {
      const match = messageBody.match(/(\d+)/);
      const maxLen = match ? match[1] : '';
      return maxLen
        ? BACKEND_VALIDATION_MESSAGES.MAX_LENGTH.replace('$property', property).replace('$constraint1', maxLen)
        : `${property} icazə verilən maksimum simvol sayını aşmamalıdır`;
    }
    case 'length': {
      const match = messageBody.match(/(\d+)[^\d]+(\d+)/);
      return match
        ? BACKEND_VALIDATION_MESSAGES.LENGTH.replace('$property', property).replace('$constraint1', match[1]).replace('$constraint2', match[2])
        : `${property} tələb olunan uzunluq intervalında olmalıdır`;
    }
    case 'min': {
      const match = messageBody.match(/(-?\d+(?:\.\d+)?)/);
      const minVal = match ? match[1] : '';
      return minVal
        ? BACKEND_VALIDATION_MESSAGES.MIN_VALUE.replace('$property', property).replace('$constraint1', minVal)
        : `${property} minimum həddən az olmamalıdır`;
    }
    case 'max': {
      const match = messageBody.match(/(-?\d+(?:\.\d+)?)/);
      const maxVal = match ? match[1] : '';
      return maxVal
        ? BACKEND_VALIDATION_MESSAGES.MAX_VALUE.replace('$property', property).replace('$constraint1', maxVal)
        : `${property} maksimum həddən çox olmamalıdır`;
    }
    case 'isEnum': {
      const match = messageBody.match(/values:\s*(.*)$/i);
      const allowed = match && match[1]?.trim() ? match[1].trim() : '';
      return allowed
        ? BACKEND_VALIDATION_MESSAGES.IS_ENUM.replace('$property', property).replace('$constraint1', allowed)
        : `${property} yalnız icazə verilən dəyərlərdən biri ola bilər`;
    }
    case 'isIn': {
      const match = messageBody.match(/values:\s*(.*)$/i);
      const allowed = match && match[1]?.trim() ? match[1].trim() : '';
      return allowed
        ? BACKEND_VALIDATION_MESSAGES.IS_IN.replace('$property', property).replace('$constraint1', allowed)
        : `${property} yalnız göstərilən dəyərlərdən biri ola bilər`;
    }
    case 'arrayMinSize': {
      const match = messageBody.match(/(\d+)/);
      return match
        ? BACKEND_VALIDATION_MESSAGES.ARRAY_MIN_SIZE.replace('$property', property).replace('$constraint1', match[1])
        : `${property} ən azı tələb olunan element sayında olmalıdır`;
    }
    case 'arrayMaxSize': {
      const match = messageBody.match(/(\d+)/);
      return match
        ? BACKEND_VALIDATION_MESSAGES.ARRAY_MAX_SIZE.replace('$property', property).replace('$constraint1', match[1])
        : `${property} icazə verilən element sayını aşmamalıdır`;
    }
    case 'matches':
      return BACKEND_VALIDATION_MESSAGES.MATCHES_PATTERN.replace('$property', property);
    default:
      return `${property} üçün daxil edilən dəyər düzgün deyil`;
  }
}

function formatValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      if (error.constraints.isNotEmpty) {
        messages.push(
          mapConstraintToAzerbaijani(
            error.property,
            'isNotEmpty',
            error.constraints.isNotEmpty,
          ),
        );
      } else {
        for (const [key, msg] of Object.entries(error.constraints)) {
          messages.push(mapConstraintToAzerbaijani(error.property, key, msg));
        }
      }
    }
    if (error.children && error.children.length > 0) {
      messages.push(...formatValidationErrors(error.children));
    }
  }

  return Array.from(new Set(messages));
}

export class CustomValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = formatValidationErrors(errors);
        return new BadRequestException(
          formattedErrors.length === 1 ? formattedErrors[0] : formattedErrors,
        );
      },
    });
  }
}
