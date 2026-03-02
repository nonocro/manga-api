import {
  BadRequestException,
  Controller,
  Get,
  Head,
  HttpCode,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import { MangasService } from './mangas.service';
import { QueryMangaDto } from './dto/query-manga.dto';
import type { Response } from 'express';

@Controller('mangas')
export class MangasController {
  constructor(private readonly mangasService: MangasService) {}

  @Get()
  findAll(@Query() query: QueryMangaDto) {
    return this.mangasService.findAll(query);
  }

  @Get('search')
  search(@Query('q') q: string) {
    if (!q?.trim())
      throw new BadRequestException('Query parameter "q" is required');

    return this.mangasService.search(q.trim());
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mangasService.findOne(id);
  }

  @Head(':id')
  @HttpCode(200)
  headOne(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    this.mangasService.findOne(id);
    res.status(200).send();
  }
}
