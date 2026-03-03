import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { MangaStatus } from './create-manga.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMangaDto {
  @ApiPropertyOptional({
    description: 'Numéro de la page pour la pagination',
    example: 1,
    minimum: 1,
    type: Number,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: "Nombre d'éléments par page",
    example: 10,
    minimum: 1,
    maximum: 50,
    type: Number,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filtrer par genre de manga',
    example: 'Shōnen',
    type: String,
  })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par statut de publication',
    enum: MangaStatus,
    example: MangaStatus.ONGOING,
    enumName: 'MangaStatus',
  })
  @IsOptional()
  @IsEnum(MangaStatus)
  status?: MangaStatus;
}
