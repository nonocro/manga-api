import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { StorageService } from '../storage/storage.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: StorageService,
          useValue: {
            read: jest.fn(),
            write: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
