import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { StorageService } from './../src/storage/storage.service';

const ADMIN_KEY = 'admin-test-api-key';
const USER_KEY = 'user-test-api-key';

const mockUsers = [
  {
    id: '1',
    email: 'admin@test.com',
    role: 'admin',
    apiKey: ADMIN_KEY,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    email: 'user@test.com',
    role: 'user',
    apiKey: USER_KEY,
    createdAt: '2024-01-02T00:00:00.000Z',
  },
];

const mockMangas = [
  {
    id: 1,
    title: 'Berserk',
    author: 'Kentaro Miura',
    genres: ['Dark Fantasy', 'Action'],
    status: 'ongoing',
    volumes: 41,
    startYear: 1989,
    publisher: 'Hakusensha',
    synopsis: 'A warrior fights demonic forces in a dark medieval world.',
  },
  {
    id: 2,
    title: 'One Piece',
    author: 'Eiichiro Oda',
    genres: ['Adventure', 'Action'],
    status: 'ongoing',
    volumes: 105,
    startYear: 1997,
    publisher: 'Shueisha',
    synopsis: 'A boy with rubber powers wants to become the Pirate King.',
  },
];

const mockStorageService = {
  read: jest.fn(),
  write: jest.fn(),
};

describe('MangaAPI (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    mockStorageService.read.mockReset();
    mockStorageService.write.mockReset();

    // Default: read returns appropriate data depending on filename
    mockStorageService.read.mockImplementation((filename: string) => {
      if (filename === 'users.json') return [...mockUsers];
      if (filename === 'mangas.json') return [...mockMangas];
      return [];
    });
    mockStorageService.write.mockImplementation(() => {});

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(mockStorageService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ─── Health check ─────────────────────────────────────────────────────────

  describe('GET /api', () => {
    it('should return 200 with status ok (public route — no API key required)', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect({ status: 'ok', version: '1.0.0' });
    });
  });

  // ─── Auth — register ──────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should create a new account and return an apiKey', () => {
      mockStorageService.read.mockReturnValueOnce([]); // no users yet

      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'newuser@test.com' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('apiKey');
          expect(typeof res.body.apiKey).toBe('string');
        });
    });

    it('should return 409 when the email is already registered', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'admin@test.com' })
        .expect(409);
    });

    it('should return 400 for an invalid email address', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'not-a-valid-email' })
        .expect(400);
    });

    it('should return 400 when the email field is missing', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({})
        .expect(400);
    });
  });

  // ─── Auth — getMe ─────────────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('should return user info with a valid API key', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('x-api-key', USER_KEY)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe('user@test.com');
          expect(res.body.role).toBe('user');
        });
    });

    it('should return 401 when the API key header is missing', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('should return 403 with an invalid API key', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('x-api-key', 'totally-wrong-key')
        .expect(403);
    });
  });

  // ─── Auth — regenerate key ────────────────────────────────────────────────

  describe('POST /api/auth/regenerate-key', () => {
    it('should return a new apiKey', () => {
      return request(app.getHttpServer())
        .post('/api/auth/regenerate-key')
        .set('x-api-key', USER_KEY)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('apiKey');
        });
    });

    it('should return 401 without API key', () => {
      return request(app.getHttpServer())
        .post('/api/auth/regenerate-key')
        .expect(401);
    });
  });

  // ─── Auth — delete account ────────────────────────────────────────────────

  describe('DELETE /api/auth/account', () => {
    it('should return 204 and delete the account', () => {
      return request(app.getHttpServer())
        .delete('/api/auth/account')
        .set('x-api-key', USER_KEY)
        .expect(204);
    });

    it('should return 401 without API key', () => {
      return request(app.getHttpServer())
        .delete('/api/auth/account')
        .expect(401);
    });
  });

  // ─── Mangas — list ────────────────────────────────────────────────────────

  describe('GET /api/mangas', () => {
    it('should return a paginated list with a valid API key', () => {
      return request(app.getHttpServer())
        .get('/api/mangas')
        .set('x-api-key', USER_KEY)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should return 401 without an API key', () => {
      return request(app.getHttpServer()).get('/api/mangas').expect(401);
    });

    it('should support pagination via query params', () => {
      return request(app.getHttpServer())
        .get('/api/mangas?page=1&limit=1')
        .set('x-api-key', USER_KEY)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(1);
        });
    });

    it('should filter by status query param', () => {
      return request(app.getHttpServer())
        .get('/api/mangas?status=ongoing')
        .set('x-api-key', USER_KEY)
        .expect(200)
        .expect((res) => {
          expect(
            (res.body.data as any[]).every((m) => m.status === 'ongoing'),
          ).toBe(true);
        });
    });
  });

  // ─── Mangas — search ──────────────────────────────────────────────────────

  describe('GET /api/mangas/search', () => {
    it('should return matching mangas for a valid query', () => {
      return request(app.getHttpServer())
        .get('/api/mangas/search?q=berserk')
        .set('x-api-key', USER_KEY)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect((res.body as any[])[0].title).toBe('Berserk');
        });
    });

    it('should return 400 when the q param is missing', () => {
      return request(app.getHttpServer())
        .get('/api/mangas/search')
        .set('x-api-key', USER_KEY)
        .expect(400);
    });

    it('should return an empty array when no manga matches', () => {
      return request(app.getHttpServer())
        .get('/api/mangas/search?q=xyz-no-match')
        .set('x-api-key', USER_KEY)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([]);
        });
    });
  });

  // ─── Mangas — findOne ─────────────────────────────────────────────────────

  describe('GET /api/mangas/:id', () => {
    it('should return the manga for a valid id', () => {
      return request(app.getHttpServer())
        .get('/api/mangas/1')
        .set('x-api-key', USER_KEY)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Berserk');
          expect(res.body.id).toBe(1);
        });
    });

    it('should return 404 for an unknown id', () => {
      return request(app.getHttpServer())
        .get('/api/mangas/999')
        .set('x-api-key', USER_KEY)
        .expect(404);
    });

    it('should return 400 for a non-numeric id', () => {
      return request(app.getHttpServer())
        .get('/api/mangas/abc')
        .set('x-api-key', USER_KEY)
        .expect(400);
    });
  });

  // ─── Mangas — create (admin only) ─────────────────────────────────────────

  describe('POST /api/mangas', () => {
    const newMangaPayload = {
      title: 'Naruto',
      author: 'Masashi Kishimoto',
      genres: ['Action', 'Adventure'],
      status: 'completed',
      volumes: 72,
      startYear: 1999,
      publisher: 'Shueisha',
      synopsis: 'A young ninja seeks recognition and the title of Hokage.',
    };

    it('should create a manga and return 201 with admin key', () => {
      return request(app.getHttpServer())
        .post('/api/mangas')
        .set('x-api-key', ADMIN_KEY)
        .send(newMangaPayload)
        .expect(201)
        .expect((res) => {
          expect(res.body.title).toBe('Naruto');
          expect(res.body).toHaveProperty('id');
        });
    });

    it('should return 403 with a regular user key', () => {
      return request(app.getHttpServer())
        .post('/api/mangas')
        .set('x-api-key', USER_KEY)
        .send(newMangaPayload)
        .expect(403);
    });

    it('should return 401 without any API key', () => {
      return request(app.getHttpServer())
        .post('/api/mangas')
        .send(newMangaPayload)
        .expect(401);
    });

    it('should return 400 for an invalid body (empty title)', () => {
      return request(app.getHttpServer())
        .post('/api/mangas')
        .set('x-api-key', ADMIN_KEY)
        .send({ ...newMangaPayload, title: '' })
        .expect(400);
    });

    it('should return 409 when the title already exists', () => {
      return request(app.getHttpServer())
        .post('/api/mangas')
        .set('x-api-key', ADMIN_KEY)
        .send({ ...newMangaPayload, title: 'Berserk' })
        .expect(409);
    });
  });

  // ─── Mangas — update PATCH (admin only) ───────────────────────────────────

  describe('PATCH /api/mangas/:id', () => {
    it('should partially update a manga with admin key', () => {
      return request(app.getHttpServer())
        .patch('/api/mangas/1')
        .set('x-api-key', ADMIN_KEY)
        .send({ volumes: 42 })
        .expect(200)
        .expect((res) => {
          expect(res.body.volumes).toBe(42);
          expect(res.body.title).toBe('Berserk');
        });
    });

    it('should return 403 with a regular user key', () => {
      return request(app.getHttpServer())
        .patch('/api/mangas/1')
        .set('x-api-key', USER_KEY)
        .send({ volumes: 42 })
        .expect(403);
    });

    it('should return 404 when the manga does not exist', () => {
      return request(app.getHttpServer())
        .patch('/api/mangas/999')
        .set('x-api-key', ADMIN_KEY)
        .send({ volumes: 42 })
        .expect(404);
    });
  });

  // ─── Mangas — replace PUT (admin only) ────────────────────────────────────

  describe('PUT /api/mangas/:id', () => {
    const replacementPayload = {
      title: 'Berserk',
      author: 'Kentaro Miura',
      genres: ['Dark Fantasy'],
      status: 'completed',
      volumes: 42,
      startYear: 1989,
      publisher: 'Hakusensha',
      synopsis: 'The complete dark fantasy epic.',
    };

    it('should replace a manga entirely with admin key', () => {
      return request(app.getHttpServer())
        .put('/api/mangas/1')
        .set('x-api-key', ADMIN_KEY)
        .send(replacementPayload)
        .expect(200)
        .expect((res) => {
          expect(res.body.volumes).toBe(42);
          expect(res.body.id).toBe(1);
        });
    });

    it('should return 403 with a regular user key', () => {
      return request(app.getHttpServer())
        .put('/api/mangas/1')
        .set('x-api-key', USER_KEY)
        .send(replacementPayload)
        .expect(403);
    });

    it('should return 404 when the manga does not exist', () => {
      return request(app.getHttpServer())
        .put('/api/mangas/999')
        .set('x-api-key', ADMIN_KEY)
        .send(replacementPayload)
        .expect(404);
    });
  });

  // ─── Mangas — delete (admin only) ─────────────────────────────────────────

  describe('DELETE /api/mangas/:id', () => {
    it('should delete a manga and return 204 with admin key', () => {
      return request(app.getHttpServer())
        .delete('/api/mangas/1')
        .set('x-api-key', ADMIN_KEY)
        .expect(204);
    });

    it('should return 403 with a regular user key', () => {
      return request(app.getHttpServer())
        .delete('/api/mangas/1')
        .set('x-api-key', USER_KEY)
        .expect(403);
    });

    it('should return 401 without an API key', () => {
      return request(app.getHttpServer()).delete('/api/mangas/1').expect(401);
    });

    it('should return 404 when the manga does not exist', () => {
      return request(app.getHttpServer())
        .delete('/api/mangas/999')
        .set('x-api-key', ADMIN_KEY)
        .expect(404);
    });
  });

  // ─── Error response format ────────────────────────────────────────────────

  describe('Error response format', () => {
    it('should return a structured error body with statusCode, error, message, timestamp and path', () => {
      return request(app.getHttpServer())
        .get('/api/mangas/999')
        .set('x-api-key', USER_KEY)
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
          expect(res.body).toHaveProperty('error', 'Not Found');
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('path');
        });
    });
  });
});
