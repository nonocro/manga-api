import { MangaStatus } from './dto/create-manga.dto';

export interface Manga {
  id: number;
  title: string;
  author: string;
  genres: string[];
  status: MangaStatus;
  volumes: number;
  startYear: number;
  publisher: string;
  synopsis: string;
}
