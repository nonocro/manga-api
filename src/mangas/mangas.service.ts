import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { QueryMangaDto } from './dto/query-manga.dto';
import { Manga } from './manga.interface';
import { CreateMangaDto } from './dto/create-manga.dto';
import { UpdateMangaDto } from './dto/update-manga.dto';

@Injectable()
export class MangasService {
  constructor(private readonly storage: StorageService) {}

  findAll(query: QueryMangaDto) {
    let mangas = this.storage.read<Manga[]>('mangas.json');

    if (query.genre) {
      mangas = mangas.filter((m) =>
        m.genres.some((g) =>
          g.toLowerCase().includes(query.genre!.toLowerCase()),
        ),
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const start = (page - 1) * limit;

    if (query.status) {
      mangas = mangas.filter((m) => m.status === query.status);
    }

    return {
      data: mangas.slice(start, start + limit),
      total: mangas.length,
      page,
      limit,
    };
  }

  findOne(id: number): Manga {
    const manga = this.storage
      .read<Manga[]>('mangas.json')
      .find((m) => m.id === id);

    if (!manga) {
      throw new NotFoundException(`Manga with id ${id} not found`);
    }

    return manga;
  }

  search(q: string): Manga[] {
    const term = q.toLowerCase();
    return this.storage
      .read<Manga[]>('mangas.json')
      .filter(
        (m) =>
          m.title.toLowerCase().includes(term) ||
          m.author.toLowerCase().includes(term) ||
          m.synopsis.toLowerCase().includes(term),
      );
  }

  create(dto: CreateMangaDto): Manga {
    const mangas = this.storage.read<Manga[]>('mangas.json');

    if (mangas.some((m) => m.title.toLowerCase() === dto.title.toLowerCase())) {
      throw new NotFoundException(
        `Manga with title "${dto.title}" already exists`,
      );
    }

    const nextId = Math.max(...mangas.map((m) => m.id), 0) + 1;
    const newManga: Manga = { id: nextId, ...dto };

    this.storage.write('mangas.json', [...mangas, newManga]);
    return newManga;
  }

  replace(id: number, dto: CreateMangaDto): Manga {
    const mangas = this.storage.read<Manga[]>('mangas.json');
    const index = mangas.findIndex((m) => m.id === id);
    if (index === -1)
      throw new NotFoundException(`Manga with id ${id} not found`);

    const updated = { id, ...dto };
    mangas[index] = updated;
    this.storage.write('mangas.json', mangas);
    return updated;
  }

  update(id: number, dto: UpdateMangaDto): Manga {
    // PATCH : fusion partielle
    const mangas = this.storage.read<Manga[]>('mangas.json');
    const index = mangas.findIndex((m) => m.id === id);
    if (index === -1)
      throw new NotFoundException(`Manga with id ${id} not found`);

    const updated = { ...mangas[index], ...dto }; // spread : seuls les champs fournis sont modifiés
    mangas[index] = updated;
    this.storage.write('mangas.json', mangas);
    return updated;
  }

  remove(id: number): void {
    const mangas = this.storage.read<Manga[]>('mangas.json');
    const index = mangas.findIndex((m) => m.id === id);
    if (index === -1)
      throw new NotFoundException(`Manga with id ${id} not found`);
    mangas.splice(index, 1);
    this.storage.write('mangas.json', mangas);
  }
}
