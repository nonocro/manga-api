import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Head,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { MangasService } from './mangas.service';
import { QueryMangaDto } from './dto/query-manga.dto';
import type { Response } from 'express';
import { CreateMangaDto } from './dto/create-manga.dto';
import { UpdateMangaDto } from './dto/update-manga.dto';
import { AdminOnly } from 'src/common/guards/decorators/admin.decorators';

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

  @AdminOnly()
  @Post()
  @HttpCode(201)
  create(@Body() body: CreateMangaDto) {
    return this.mangasService.create(body);
  }

  @AdminOnly()
  @Put(':id')
  replace(@Param('id', ParseIntPipe) id: number, @Body() body: CreateMangaDto) {
    return this.mangasService.replace(id, body);
  }

  @AdminOnly()
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateMangaDto) {
    return this.mangasService.update(id, body);
  }

  @AdminOnly()
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    this.mangasService.remove(id);
  }
}
