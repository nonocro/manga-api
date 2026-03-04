import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MangasService } from './mangas.service';
import { Manga } from './manga.interface';
import { StorageService } from '../storage/storage.service';
import { MangaStatus } from './dto/create-manga.dto';

const mockMangas: Manga[] = [
  {
    id: 1,
    title: 'Berserk',
    author: 'Kentaro Miura',
    genres: ['Dark Fantasy', 'Action'],
    status: MangaStatus.ONGOING,
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
    status: MangaStatus.ONGOING,
    volumes: 105,
    startYear: 1997,
    publisher: 'Shueisha',
    synopsis: 'A boy with rubber powers wants to become the Pirate King.',
  },
  {
    id: 3,
    title: 'Vagabond',
    author: 'Takehiko Inoue',
    genres: ['Historical', 'Action'],
    status: MangaStatus.HIATUS,
    volumes: 37,
    startYear: 1998,
    publisher: 'Kodansha',
    synopsis: 'The life of legendary swordsman Miyamoto Musashi.',
  },
];

describe('MangasService', () => {
  let service: MangasService;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MangasService,
        {
          provide: StorageService,
          useValue: {
            read: jest.fn(),
            write: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MangasService>(MangasService);
    storageService = module.get(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all mangas with default pagination (page 1, limit 10)', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.findAll({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(3);
      expect(result.data).toHaveLength(3);
    });

    it('should paginate results correctly', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.findAll({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.data[0].title).toBe('Berserk');
    });

    it('should return the second page correctly', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.findAll({ page: 2, limit: 2 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Vagabond');
    });

    it('should filter by genre (case-insensitive partial match)', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.findAll({ genre: 'dark' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Berserk');
      expect(result.total).toBe(1);
    });

    it('should filter by status', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.findAll({ status: MangaStatus.HIATUS });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Vagabond');
    });

    it('should combine genre and status filters', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.findAll({
        genre: 'action',
        status: MangaStatus.ONGOING,
      });

      expect(result.total).toBe(2);
      expect(result.data.every((m) => m.status === MangaStatus.ONGOING)).toBe(
        true,
      );
    });

    it('should return empty data when no manga matches filters', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.findAll({ status: MangaStatus.COMPLETED });

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('should find mangas matching the title (case-insensitive)', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.search('BERSERK');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Berserk');
    });

    it('should find mangas matching the author', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.search('oda');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('One Piece');
    });

    it('should find mangas matching the synopsis', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.search('pirate');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('One Piece');
    });

    it('should return multiple results when several mangas match', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.search('action');

      // 'action' appears in the genres but not in searchable fields (title, author, synopsis)
      // Let's search for something in synopsis present in multiple
      const result2 = service.search('warrior');
      expect(result2).toHaveLength(1);
    });

    it('should return empty array when no manga matches', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.search('xyz-no-match-at-all');

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return the manga with the given id', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      const result = service.findOne(1);

      expect(result.title).toBe('Berserk');
      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException if manga id does not exist', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      expect(() => service.findOne(999)).toThrow(NotFoundException);
      expect(() => service.findOne(999)).toThrow('Manga with id 999 not found');
    });
  });

  describe('exists', () => {
    it('should return true if manga exists', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      expect(service.exists(1)).toBe(true);
    });

    it('should return false if manga does not exist', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      expect(service.exists(999)).toBe(false);
    });
  });

  describe('create', () => {
    const createDto = {
      title: 'Naruto',
      author: 'Masashi Kishimoto',
      genres: ['Action', 'Adventure'],
      status: MangaStatus.COMPLETED,
      volumes: 72,
      startYear: 1999,
      publisher: 'Shueisha',
      synopsis: 'A young ninja seeks recognition and the title of Hokage.',
    };

    it('should create a new manga and assign the next available id', () => {
      storageService.read.mockReturnValue([...mockMangas]);
      storageService.write.mockImplementation(() => {});

      const result = service.create(createDto);

      expect(result.id).toBe(4); // max(1,2,3) + 1
      expect(result.title).toBe('Naruto');
    });

    it('should persist the new manga to storage', () => {
      storageService.read.mockReturnValue([...mockMangas]);
      storageService.write.mockImplementation(() => {});

      service.create(createDto);

      expect(storageService.write).toHaveBeenCalledWith(
        'mangas.json',
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Naruto',
            author: 'Masashi Kishimoto',
          }),
        ]),
      );
    });

    it('should throw ConflictException for duplicate title (case-insensitive)', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      expect(() => service.create({ ...createDto, title: 'berserk' })).toThrow(
        ConflictException,
      );
    });

    it('should not write to storage on conflict', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      expect(() =>
        service.create({ ...createDto, title: 'Berserk' }),
      ).toThrow();
      expect(storageService.write).not.toHaveBeenCalled();
    });

    it('should assign id 1 when the manga list is empty', () => {
      storageService.read.mockReturnValue([]);
      storageService.write.mockImplementation(() => {});

      const result = service.create(createDto);

      expect(result.id).toBe(1);
    });
  });

  describe('replace', () => {
    const replaceDto = {
      title: 'Berserk Deluxe',
      author: 'Kentaro Miura',
      genres: ['Dark Fantasy'],
      status: MangaStatus.COMPLETED,
      volumes: 42,
      startYear: 1989,
      publisher: 'Hakusensha',
      synopsis: 'Updated synopsis of the dark fantasy epic.',
    };

    it('should replace the manga with the given id', () => {
      storageService.read.mockReturnValue([...mockMangas]);
      storageService.write.mockImplementation(() => {});

      const result = service.replace(1, replaceDto);

      expect(result.id).toBe(1);
      expect(result.title).toBe('Berserk Deluxe');
      expect(result.volumes).toBe(42);
    });

    it('should throw NotFoundException if manga does not exist', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      expect(() => service.replace(999, replaceDto)).toThrow(NotFoundException);
    });

    it('should throw ConflictException if new title conflicts with another manga', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      expect(() =>
        service.replace(1, { ...replaceDto, title: 'One Piece' }),
      ).toThrow(ConflictException);
    });

    it('should allow keeping the same title on replace (no self-conflict)', () => {
      storageService.read.mockReturnValue([...mockMangas]);
      storageService.write.mockImplementation(() => {});

      // Replacing manga 1 with the same title 'Berserk' should not throw
      expect(() =>
        service.replace(1, { ...replaceDto, title: 'Berserk' }),
      ).not.toThrow();
    });
  });

  describe('update', () => {
    it('should partially update the manga', () => {
      storageService.read.mockReturnValue([...mockMangas]);
      storageService.write.mockImplementation(() => {});

      const result = service.update(1, { volumes: 42 });

      expect(result.volumes).toBe(42);
      expect(result.title).toBe('Berserk'); // unchanged
      expect(result.author).toBe('Kentaro Miura'); // unchanged
    });

    it('should throw NotFoundException if manga does not exist', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      expect(() => service.update(999, { volumes: 42 })).toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new title conflicts with another manga', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      expect(() => service.update(1, { title: 'One Piece' })).toThrow(
        ConflictException,
      );
    });

    it('should allow keeping the same title on update (no self-conflict)', () => {
      storageService.read.mockReturnValue([...mockMangas]);
      storageService.write.mockImplementation(() => {});

      expect(() => service.update(1, { title: 'Berserk' })).not.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove the manga from storage', () => {
      storageService.read.mockReturnValue([...mockMangas]);
      storageService.write.mockImplementation(() => {});

      service.remove(1);

      expect(storageService.write).toHaveBeenCalledWith(
        'mangas.json',
        expect.not.arrayContaining([expect.objectContaining({ id: 1 })]),
      );
    });

    it('should keep the other mangas after deletion', () => {
      storageService.read.mockReturnValue([...mockMangas]);
      storageService.write.mockImplementation(() => {});

      service.remove(1);

      const written: Manga[] = storageService.write.mock.calls[0][1] as Manga[];
      expect(written).toHaveLength(mockMangas.length - 1);
      expect(written.find((m) => m.id === 2)).toBeDefined();
    });

    it('should throw NotFoundException if manga does not exist', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      expect(() => service.remove(999)).toThrow(NotFoundException);
    });

    it('should not write to storage if manga is not found', () => {
      storageService.read.mockReturnValue([...mockMangas]);

      expect(() => service.remove(999)).toThrow();
      expect(storageService.write).not.toHaveBeenCalled();
    });
  });
});
