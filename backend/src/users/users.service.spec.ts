import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should seed admin onModuleInit if admin does not exist', async () => {
    userModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    userModel.create.mockResolvedValue({});

    await service.onModuleInit();

    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@feedlab.az',
        role: 'ADMIN',
      }),
    );
  });

  it('should not seed admin onModuleInit if admin already exists', async () => {
    userModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ email: 'admin@feedlab.az' }),
    });

    await service.onModuleInit();

    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('should create a new user document', async () => {
    const userData = {
      email: 'test@feedlab.az',
      passwordHash: 'hashed_password',
      fullName: 'Test User',
      role: 'USER' as const,
    };
    userModel.create.mockResolvedValue(userData);

    const result = await service.create(userData);
    expect(result).toEqual(userData);
    expect(userModel.create).toHaveBeenCalledWith(userData);
  });

  it('should find user by email with normalized query', async () => {
    const mockUser = { email: 'test@feedlab.az' };
    userModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    const result = await service.findByEmail('  TEST@feedlab.az  ');
    expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@feedlab.az' });
    expect(result).toBe(mockUser);
  });
});
