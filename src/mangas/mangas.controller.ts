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
import { AdminOnly } from '../common/guards/decorators/admin.decorators';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Mangas')
@ApiSecurity('api-key')
@Controller('mangas')
export class MangasController {
  constructor(private readonly mangasService: MangasService) {}

  @ApiOperation({
    summary: 'Liste paginée des mangas',
    description:
      'Récupère la liste de tous les mangas avec support de la pagination. Par défaut, retourne 10 mangas par page.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Numéro de page (commence à 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: "Nombre d'éléments par page",
  })
  @ApiResponse({
    status: 200,
    description:
      'Liste retournée avec succès. Inclut les métadonnées de pagination.',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 100 },
            totalPages: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Header X-API-Key absent ou invalide',
  })
  @Get()
  findAll(@Query() query: QueryMangaDto) {
    return this.mangasService.findAll(query);
  }

  @ApiOperation({
    summary: 'Recherche de mangas par titre',
    description:
      'Effectue une recherche textuelle sur les titres de mangas. La recherche est insensible à la casse.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    example: 'One Piece',
    description: 'Terme de recherche pour filtrer les mangas par titre',
  })
  @ApiResponse({
    status: 200,
    description: 'Résultats de la recherche retournés avec succès',
    schema: {
      type: 'array',
      items: { type: 'object' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètre de requête "q" manquant ou vide',
  })
  @ApiResponse({
    status: 401,
    description: 'Header X-API-Key absent ou invalide',
  })
  @Get('search')
  search(@Query('q') q: string) {
    if (!q?.trim())
      throw new BadRequestException('Query parameter "q" is required');

    return this.mangasService.search(q.trim());
  }

  @ApiOperation({
    summary: "Détails d'un manga par ID",
    description:
      "Récupère les informations complètes d'un manga spécifique via son identifiant unique.",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identifiant unique du manga',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Détails du manga retournés avec succès',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        title: { type: 'string', example: 'One Piece' },
        author: { type: 'string', example: 'Eiichiro Oda' },
        year: { type: 'number', example: 1997 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalide (doit être un nombre)',
  })
  @ApiResponse({
    status: 401,
    description: 'Header X-API-Key absent ou invalide',
  })
  @ApiResponse({ status: 404, description: 'Manga non trouvé avec cet ID' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mangasService.findOne(id);
  }

  @ApiOperation({
    summary: "Vérification de l'existence d'un manga par ID",
    description:
      "Vérifie l'existence d'un manga sans retourner son contenu. Utile pour les vérifications légères.",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identifiant unique du manga',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Le manga existe (aucun corps de réponse)',
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalide (doit être un nombre)',
  })
  @ApiResponse({
    status: 401,
    description: 'Header X-API-Key absent ou invalide',
  })
  @ApiResponse({ status: 404, description: 'Manga non trouvé avec cet ID' })
  @Head(':id')
  @HttpCode(200)
  headOne(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    this.mangasService.findOne(id);
    res.status(200).send();
  }

  @ApiOperation({
    summary: '[Admin] Créer un nouveau manga',
    description:
      'Crée un nouveau manga dans la base de données. Nécessite les droits administrateur.',
  })
  @ApiBody({
    type: CreateMangaDto,
    description: 'Données du manga à créer',
    examples: {
      example1: {
        summary: 'Exemple de création',
        value: {
          title: 'Naruto',
          author: 'Masashi Kishimoto',
          year: 1999,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Manga créé avec succès',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 123 },
        title: { type: 'string', example: 'Naruto' },
        author: { type: 'string', example: 'Masashi Kishimoto' },
        year: { type: 'number', example: 1999 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données de requête invalides (validation échouée)',
  })
  @ApiResponse({
    status: 401,
    description: 'Header X-API-Key absent ou invalide',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Rôle administrateur requis',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflit - Un manga avec ce titre existe déjà',
  })
  @AdminOnly()
  @Post()
  @HttpCode(201)
  create(@Body() body: CreateMangaDto) {
    return this.mangasService.create(body);
  }

  @ApiOperation({
    summary: '[Admin] Remplacer un manga',
    description:
      'Remplace complètement un manga existant. Toutes les propriétés doivent être fournies. Nécessite les droits administrateur.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identifiant unique du manga à remplacer',
    example: 1,
  })
  @ApiBody({
    type: CreateMangaDto,
    description: 'Nouvelles données complètes du manga',
    examples: {
      example1: {
        summary: 'Exemple de remplacement',
        value: {
          title: 'Bleach',
          author: 'Tite Kubo',
          year: 2001,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Manga remplacé avec succès',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        title: { type: 'string', example: 'Bleach' },
        author: { type: 'string', example: 'Tite Kubo' },
        year: { type: 'number', example: 2001 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou ID incorrect',
  })
  @ApiResponse({
    status: 401,
    description: 'Header X-API-Key absent ou invalide',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Rôle administrateur requis',
  })
  @ApiResponse({ status: 404, description: 'Manga non trouvé avec cet ID' })
  @ApiResponse({
    status: 409,
    description: 'Conflit - Un autre manga avec ce titre existe déjà',
  })
  @AdminOnly()
  @Put(':id')
  replace(@Param('id', ParseIntPipe) id: number, @Body() body: CreateMangaDto) {
    return this.mangasService.replace(id, body);
  }

  @ApiOperation({
    summary: '[Admin] Mettre à jour partiellement un manga',
    description:
      "Met à jour partiellement les propriétés d'un manga existant. Seules les propriétés fournies seront modifiées. Nécessite les droits administrateur.",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identifiant unique du manga à mettre à jour',
    example: 1,
  })
  @ApiBody({
    type: UpdateMangaDto,
    description: 'Propriétés partielles à mettre à jour',
    examples: {
      example1: {
        summary: 'Mise à jour du titre uniquement',
        value: {
          title: 'One Piece (Édition reliée)',
        },
      },
      example2: {
        summary: "Mise à jour de l'auteur et année",
        value: {
          author: 'Eiichiro Oda',
          year: 1997,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Manga mis à jour avec succès',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        title: { type: 'string', example: 'One Piece (Édition reliée)' },
        author: { type: 'string', example: 'Eiichiro Oda' },
        year: { type: 'number', example: 1997 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou ID incorrect',
  })
  @ApiResponse({
    status: 401,
    description: 'Header X-API-Key absent ou invalide',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Rôle administrateur requis',
  })
  @ApiResponse({ status: 404, description: 'Manga non trouvé avec cet ID' })
  @ApiResponse({
    status: 409,
    description: 'Conflit - Un autre manga avec ce titre existe déjà',
  })
  @AdminOnly()
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateMangaDto) {
    return this.mangasService.update(id, body);
  }

  @ApiOperation({
    summary: '[Admin] Supprimer un manga',
    description:
      'Supprime définitivement un manga de la base de données. Cette action est irréversible. Nécessite les droits administrateur.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identifiant unique du manga à supprimer',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Manga supprimé avec succès (aucun corps de réponse)',
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalide (doit être un nombre)',
  })
  @ApiResponse({
    status: 401,
    description: 'Header X-API-Key absent ou invalide',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Rôle administrateur requis',
  })
  @ApiResponse({ status: 404, description: 'Manga non trouvé avec cet ID' })
  @AdminOnly()
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    this.mangasService.remove(id);
  }
}
