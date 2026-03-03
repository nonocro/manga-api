import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MangaStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  HIATUS = 'hiatus',
}

export class CreateMangaDto {
  @ApiProperty({
    description: 'Titre du manga',
    example: 'One Piece',
    maxLength: 200,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: "Nom de l'auteur ou du mangaka",
    example: 'Eiichiro Oda',
    maxLength: 200,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  author: string;

  @ApiProperty({
    description: 'Liste des genres du manga',
    example: ['Shōnen', 'Aventure', 'Fantasy'],
    type: [String],
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  genres: string[];

  @ApiProperty({
    description: 'Statut de publication du manga',
    enum: MangaStatus,
    example: MangaStatus.ONGOING,
    enumName: 'MangaStatus',
  })
  @IsEnum(MangaStatus, {
    message: 'status must be one of: ongoing, completed, hiatus',
  })
  status: MangaStatus;

  @ApiProperty({
    description: 'Nombre de volumes publiés',
    example: 105,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  volumes: number;

  @ApiProperty({
    description: 'Année de début de publication',
    example: 1997,
    minimum: 1900,
    maximum: new Date().getFullYear(),
    type: Number,
  })
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  startYear: number;

  @ApiProperty({
    description: "Nom de l'éditeur du manga",
    example: 'Shueisha',
    maxLength: 200,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  publisher: string;

  @ApiProperty({
    description: 'Résumé ou description du manga',
    example:
      "L'histoire suit Monkey D. Luffy, un jeune homme dont le corps a acquis les propriétés du caoutchouc après avoir mangé un fruit du démon...",
    maxLength: 2000,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  synopsis: string;
}
