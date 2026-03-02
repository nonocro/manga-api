import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { QueryMangaDto } from './dto/query-manga.dto';
import { Manga } from './manga.interface';

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
}
