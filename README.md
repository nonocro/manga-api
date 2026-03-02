# MangaAPI — Cours NestJS · M2 Ingénierie Logicielle

Ce cours consiste à construire une application NestJS permettant de fournir des données métier via une API REST professionnelle.
Le README consigne chaque étape avec les commandes CLI, les extraits de code produits et les liens vers la documentation officielle NestJS.

> **Dépôt de référence :** https://github.com/nicoHersant/nest-api
> En cas de blocage, récupérer la branche de l'étape courante (voir tableau ci-dessous).

---

## Stack technique

| Outil | Version | Rôle |
|---|---|---|
| Node.js | 22 LTS | Runtime |
| NestJS | 11 | Framework |
| TypeScript | 5 | Langage |
| class-validator / class-transformer | — | Validation des DTOs |
| @nestjs/throttler | — | Rate limiting |
| @nestjs/swagger | — | Génération spec OpenAPI |
| Scalar | — | UI documentation |

---

## Branches pédagogiques

Chaque branche est un état **stable et fonctionnel** de l'application.

```bash
git clone https://github.com/nicoHersant/nest-api.git
cd nest-api
git fetch origin
git checkout step/XX-nom-etape
npm install && npm run start:dev
```

| Branche | Contenu |
|---|---|
| `main` | Scaffold initial NestJS |
| `step/01-setup` | Configuration globale : prefix, CORS, throttler, ValidationPipe |
| `step/02-storage` | JsonStorageService + mangas.json (50 mangas) + users.json |
| `step/03-mangas-read` | GET /mangas, GET /mangas/:id, HEAD, search, pagination |
| `step/04-auth` | POST /auth/register, GET /auth/me, regenerate-key, delete account |
| `step/05-api-key-guard` | Guard API key global + décorateur @Public |
| `step/06-mangas-write` | POST / PUT / PATCH / DELETE mangas avec persistence JSON |
| `step/07-admin-guard` | Guard admin + RBAC sur le CRUD mangas |
| `step/08-validation` | DTOs complets, class-validator, PartialType |
| `step/09-error-handling` | ExceptionFilter global, messages d'erreur sécurisés |
| `step/10-documentation` | @nestjs/swagger + Scalar UI |

---

## Prérequis

```bash
node --version   # v22.x
npm --version    # v10.x
nest --version   # v11.x

# Installer le CLI NestJS globalement si besoin
npm install -g @nestjs/cli
```

---

## Installation (consultation / rattrapage)

```bash
git clone https://github.com/nicoHersant/nest-api.git
cd nest-api
git checkout -b prenom/nom
npm install
npm run start:dev
```

L'API est disponible sur `http://localhost:3000/api`

---

## Étapes du cours

---

### Étape 0 — Scaffold du projet (`main`)

> 📖 [NestJS — First steps](https://docs.nestjs.com/first-steps) · [CLI overview](https://docs.nestjs.com/cli/overview)

```bash
nest new manga-api --package-manager npm
cd manga-api
git init
```

Le CLI génère la structure minimale :

```
src/
├── app.controller.ts   ← route GET / par défaut
├── app.module.ts       ← module racine
├── app.service.ts
└── main.ts             ← point d'entrée, bootstrap()
```

`main.ts` initial :

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

---

### Étape 1 — Configuration globale (`step/01-setup`)

> 📖 [NestJS — Pipes](https://docs.nestjs.com/pipes) · [Rate limiting](https://docs.nestjs.com/security/rate-limiting)

```bash
npm install @nestjs/throttler
```

**`src/main.ts`** — prefix global, CORS, ValidationPipe :

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');    // toutes les routes → /api/...
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // supprime les champs non déclarés dans les DTOs
      forbidNonWhitelisted: true, // rejette la requête si des champs inconnus sont présents
      transform: true,            // convertit automatiquement les types (ex: "1" → 1)
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

**`src/app.module.ts`** — ThrottlerModule (100 req/min par IP) :

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000, // fenêtre de 1 minute en ms
          limit: 100, // max 100 requêtes par fenêtre par IP
        },
      ],
    }),
  ],
})
export class AppModule {}
```

```bash
npm run start:dev
# GET http://localhost:3000/api → 404 attendu (pas encore de route)
```

---

### Étape 2 — Stockage JSON (`step/02-storage`)

> 📖 [NestJS — Modules](https://docs.nestjs.com/modules) · [Providers](https://docs.nestjs.com/providers)

```bash
nest generate module storage
nest generate service storage/storage --flat
```

**`src/storage/storage.module.ts`** — module `@Global()` : injecté partout sans import explicite :

```typescript
import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';

@Global()   // ← rend StorageService disponible dans toute l'application
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

**`src/storage/storage.service.ts`** — lecture et écriture synchrones :

```typescript
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly dataDir = path.join(__dirname, '..', 'data');

  read<T>(filename: string): T {
    const filePath = path.join(this.dataDir, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  }

  write<T>(filename: string, data: T): void {
    const filePath = path.join(this.dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
```

> ⚠️ **Piège NestJS — assets non copiés dans `dist/`**
> Par défaut, NestJS ne copie pas les fichiers non-TypeScript lors de la compilation.
> `__dirname` pointe vers `dist/storage/` : sans configuration, `dist/data/` n'existe pas → **500 au démarrage**.
>
> **Correction dans `nest-cli.json`** :

```json
{
  "compilerOptions": {
    "assets": ["**/*.json"],
    "watchAssets": true
  }
}
```

**`src/data/users.json`** — compte admin pré-seedé :

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000001",
    "email": "admin@mangaapi.dev",
    "role": "admin",
    "apiKey": "admin-manga-api-key-dev-only",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

**`src/data/mangas.json`** — structure d'une entrée (50 mangas dans le dépôt de référence) :

```json
{
  "id": 1,
  "title": "Berserk",
  "author": "Kentaro Miura",
  "genres": ["Dark Fantasy", "Action"],
  "status": "hiatus",
  "volumes": 41,
  "startYear": 1989,
  "publisher": "Hakusensha",
  "synopsis": "..."
}
```

---

### Étape 3 — Lecture des mangas (`step/03-mangas-read`)

> 📖 [NestJS — Controllers](https://docs.nestjs.com/controllers) · [Providers](https://docs.nestjs.com/providers)

```bash
nest generate module mangas
nest generate controller mangas
nest generate service mangas
```

**`src/mangas/mangas.service.ts`** — logique métier de lecture :

```typescript
@Injectable()
export class MangasService {
  constructor(private readonly storage: StorageService) {}

  findAll(query: QueryMangaDto) {
    let mangas = this.storage.read<Manga[]>('mangas.json');

    if (query.genre) {
      mangas = mangas.filter((m) =>
        m.genres.some((g) => g.toLowerCase().includes(query.genre!.toLowerCase())),
      );
    }
    if (query.status) {
      mangas = mangas.filter((m) => m.status === query.status);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const start = (page - 1) * limit;

    return { data: mangas.slice(start, start + limit), total: mangas.length, page, limit };
  }

  findOne(id: number): Manga {
    const manga = this.storage.read<Manga[]>('mangas.json').find((m) => m.id === id);
    if (!manga) throw new NotFoundException(`Manga with id ${id} not found`); // → 404
    return manga;
  }

  search(q: string): Manga[] {
    const term = q.toLowerCase();
    return this.storage.read<Manga[]>('mangas.json').filter(
      (m) =>
        m.title.toLowerCase().includes(term) ||
        m.author.toLowerCase().includes(term) ||
        m.synopsis.toLowerCase().includes(term),
    );
  }
}
```

**`src/mangas/mangas.controller.ts`** — endpoints de lecture :

```typescript
@Controller('mangas')
export class MangasController {
  constructor(private readonly mangasService: MangasService) {}

  @Get()
  findAll(@Query() query: QueryMangaDto) {
    return this.mangasService.findAll(query);
  }

  @Get('search')                         // ← déclaré AVANT :id pour éviter le conflit de routing
  search(@Query('q') q: string) {
    if (!q?.trim()) throw new BadRequestException('Query param "q" is required');
    return this.mangasService.search(q.trim());
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {  // ParseIntPipe → 400 si non-entier
    return this.mangasService.findOne(id);
  }

  @Head(':id')
  @HttpCode(200)
  headOne(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    this.mangasService.findOne(id); // lève 404 si absent
    res.status(200).send();         // HEAD : statut uniquement, pas de body
  }
}
```

Endpoints disponibles :

```
GET  /api/mangas?page=1&limit=10&genre=Action&status=completed
GET  /api/mangas/search?q=naruto
GET  /api/mangas/:id
HEAD /api/mangas/:id
```

Codes HTTP couverts : `200`, `400`, `404`.

---

### Étape 4 — Authentification (`step/04-auth`)

> 📖 [NestJS — Controllers](https://docs.nestjs.com/controllers) · [Exception filters](https://docs.nestjs.com/exception-filters)

```bash
npm install uuid && npm install -D @types/uuid
nest generate module auth
nest generate controller auth
nest generate service auth
```

**`src/auth/auth.service.ts`** — création de compte et gestion de la clef :

```typescript
@Injectable()
export class AuthService {
  constructor(private readonly storage: StorageService) {}

  register(email: string): { apiKey: string } {
    const users = this.storage.read<User[]>('users.json');

    if (users.some((u) => u.email === email)) {
      throw new ConflictException(`Email ${email} is already registered`); // → 409
    }

    const newUser: User = {
      id: uuidv4(),
      email,
      role: 'user',
      apiKey: uuidv4(),   // clef unique générée à l'inscription
      createdAt: new Date().toISOString(),
    };

    this.storage.write('users.json', [...users, newUser]);
    return { apiKey: newUser.apiKey };
  }

  regenerateKey(apiKey: string): { apiKey: string } {
    const users = this.storage.read<User[]>('users.json');
    const index = users.findIndex((u) => u.apiKey === apiKey);
    if (index === -1) throw new NotFoundException('User not found');

    const newKey = uuidv4();
    users[index] = { ...users[index], apiKey: newKey };
    this.storage.write('users.json', users);
    return { apiKey: newKey };
  }

  findByApiKey(apiKey: string): User | undefined {
    return this.storage.read<User[]>('users.json').find((u) => u.apiKey === apiKey);
  }
}
```

**`src/auth/auth.controller.ts`** :

```typescript
@Controller('auth')
export class AuthController {
  @Post('register')          // route publique — pas encore de guard global à cette étape
  register(@Body() body: RegisterDto) {
    return this.authService.register(body.email);  // → 201 { apiKey }
  }

  @Get('me')
  getMe(@Request() req: ExpressRequest) {
    const user = (req as any).user;                // peuplé par le guard (étape 5)
    return this.authService.getMe(user.apiKey);    // → 200
  }

  @Post('regenerate-key')
  regenerateKey(@Request() req: ExpressRequest) {
    return this.authService.regenerateKey((req as any).user.apiKey); // → 200 { apiKey }
  }

  @Delete('account')
  @HttpCode(204)
  deleteAccount(@Request() req: ExpressRequest) {
    this.authService.deleteAccount((req as any).user.apiKey);        // → 204
  }
}
```

Codes HTTP couverts : `201`, `204`, `409`.

---

### Étape 5 — Guard API Key (`step/05-api-key-guard`)

> 📖 [NestJS — Guards](https://docs.nestjs.com/guards) · [Custom decorators](https://docs.nestjs.com/custom-decorators) · [Execution context](https://docs.nestjs.com/fundamentals/execution-context)

```bash
nest generate guard common/guards/api-key --flat
```

**`src/common/decorators/public.decorator.ts`** — décorateur `@Public()` :

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marque une route comme publique : le guard API key ne s'applique pas.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**`src/common/guards/api-key.guard.ts`** :

```typescript
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,    // lit les métadonnées posées par @Public()
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      throw new UnauthorizedException('Missing API key. Add header X-API-Key.'); // → 401
    }

    const user = this.authService.findByApiKey(apiKey);
    if (!user) {
      throw new ForbiddenException('Invalid API key.'); // → 403
    }

    (request as any).user = user;  // attacher l'utilisateur pour les handlers suivants
    return true;
  }
}
```

**`src/app.module.ts`** — enregistrement global via `APP_GUARD` :

```typescript
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiKeyGuard } from './common/guards/api-key.guard';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // exécuté en 1er
    { provide: APP_GUARD, useClass: ApiKeyGuard },    // exécuté en 2nd
  ],
})
export class AppModule {}
```

Marquer `POST /auth/register` comme public :

```typescript
@Public()
@Post('register')
register(@Body() body: RegisterDto) { ... }
```

Codes HTTP couverts : `401` (clef absente), `403` (clef invalide).

---

### Étape 6 — CRUD mangas avec persistence (`step/06-mangas-write`)

> 📖 [NestJS — Controllers](https://docs.nestjs.com/controllers)

**`src/mangas/mangas.service.ts`** — méthodes d'écriture :

```typescript
create(dto: CreateMangaDto): Manga {
  const mangas = this.storage.read<Manga[]>('mangas.json');

  if (mangas.some((m) => m.title.toLowerCase() === dto.title.toLowerCase())) {
    throw new ConflictException(`A manga titled "${dto.title}" already exists`); // → 409
  }

  const nextId = Math.max(...mangas.map((m) => m.id), 0) + 1;
  const newManga: Manga = { id: nextId, ...dto };

  this.storage.write('mangas.json', [...mangas, newManga]);
  return newManga;
}

replace(id: number, dto: CreateMangaDto): Manga {  // PUT : remplacement complet
  const mangas = this.storage.read<Manga[]>('mangas.json');
  const index = mangas.findIndex((m) => m.id === id);
  if (index === -1) throw new NotFoundException(`Manga with id ${id} not found`);

  const updated = { id, ...dto };    // l'id est conservé, tout le reste est remplacé
  mangas[index] = updated;
  this.storage.write('mangas.json', mangas);
  return updated;
}

update(id: number, dto: UpdateMangaDto): Manga {   // PATCH : fusion partielle
  const mangas = this.storage.read<Manga[]>('mangas.json');
  const index = mangas.findIndex((m) => m.id === id);
  if (index === -1) throw new NotFoundException(`Manga with id ${id} not found`);

  const updated = { ...mangas[index], ...dto };    // spread : seuls les champs fournis sont modifiés
  mangas[index] = updated;
  this.storage.write('mangas.json', mangas);
  return updated;
}

remove(id: number): void {
  const mangas = this.storage.read<Manga[]>('mangas.json');
  const index = mangas.findIndex((m) => m.id === id);
  if (index === -1) throw new NotFoundException(`Manga with id ${id} not found`);
  mangas.splice(index, 1);
  this.storage.write('mangas.json', mangas);
}
```

**`src/mangas/mangas.controller.ts`** — ajout des verbes d'écriture :

```typescript
@Post()
@HttpCode(201)
create(@Body() body: CreateMangaDto) {
  return this.mangasService.create(body);
}

@Put(':id')    // remplacement complet — body doit contenir TOUS les champs
replace(@Param('id', ParseIntPipe) id: number, @Body() body: CreateMangaDto) {
  return this.mangasService.replace(id, body);
}

@Patch(':id')  // mise à jour partielle — seuls les champs fournis sont modifiés
update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateMangaDto) {
  return this.mangasService.update(id, body);
}

@Delete(':id')
@HttpCode(204)  // pas de body en réponse
remove(@Param('id', ParseIntPipe) id: number) {
  this.mangasService.remove(id);
}
```

Codes HTTP couverts : `201`, `204`, `409`.

---

### Étape 7 — Guard Admin et RBAC (`step/07-admin-guard`)

> 📖 [NestJS — Guards](https://docs.nestjs.com/guards) · [Custom decorators](https://docs.nestjs.com/custom-decorators)

```bash
nest generate guard common/guards/admin --flat
```

**`src/common/decorators/admin.decorator.ts`** :

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_ADMIN_KEY = 'isAdmin';
export const AdminOnly = () => SetMetadata(IS_ADMIN_KEY, true);
```

**`src/common/guards/admin.guard.ts`** — vérifie le rôle après `ApiKeyGuard` :

```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresAdmin = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresAdmin) return true; // route sans @AdminOnly() → laissée passer

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as User; // garanti non-null par ApiKeyGuard

    if (user.role !== 'admin') {
      throw new ForbiddenException('This action requires administrator privileges.'); // → 403
    }
    return true;
  }
}
```

**`src/app.module.ts`** — ordre des guards (important) :

```typescript
providers: [
  { provide: APP_GUARD, useClass: ThrottlerGuard }, // 1. rate limit
  { provide: APP_GUARD, useClass: ApiKeyGuard },    // 2. authentification (peuple req.user)
  { provide: APP_GUARD, useClass: AdminGuard },     // 3. autorisation (lit req.user.role)
],
```

Décorer les routes d'écriture :

```typescript
@AdminOnly()
@Post()
create(...) { ... }

@AdminOnly()
@Put(':id')
replace(...) { ... }

@AdminOnly()
@Patch(':id')
update(...) { ... }

@AdminOnly()
@Delete(':id')
remove(...) { ... }
```

Codes HTTP couverts : `403` (authentifié mais rôle insuffisant).

---

### Étape 8 — Validation (`step/08-validation`)

> 📖 [NestJS — Validation](https://docs.nestjs.com/techniques/validation) · [class-validator decorators](https://github.com/typestack/class-validator#validation-decorators)

```bash
npm install class-validator class-transformer
npm install @nestjs/mapped-types
```

**`src/mangas/dto/create-manga.dto.ts`** — DTO avec décorateurs de validation :

```typescript
import { IsString, IsNotEmpty, IsArray, ArrayNotEmpty,
         IsEnum, IsInt, Min, Max, MaxLength } from 'class-validator';

export enum MangaStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  HIATUS = 'hiatus',
}

export class CreateMangaDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  author: string;

  @IsArray() @ArrayNotEmpty() @IsString({ each: true })
  genres: string[];

  @IsEnum(MangaStatus, { message: 'status must be one of: ongoing, completed, hiatus' })
  status: MangaStatus;

  @IsInt() @Min(1)
  volumes: number;

  @IsInt() @Min(1900) @Max(new Date().getFullYear())
  startYear: number;

  @IsString() @IsNotEmpty() @MaxLength(200)
  publisher: string;

  @IsString() @IsNotEmpty() @MaxLength(2000)
  synopsis: string;
}
```

**`src/mangas/dto/update-manga.dto.ts`** — `PartialType` : tous les champs deviennent optionnels, les validateurs sont conservés :

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateMangaDto } from './create-manga.dto';

export class UpdateMangaDto extends PartialType(CreateMangaDto) {}
```

**`src/mangas/dto/query-manga.dto.ts`** — query params typés avec transformation automatique :

```typescript
import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMangaDto {
  @IsOptional()
  @Type(() => Number)  // transforme la string "1" du query param en nombre 1
  @IsInt() @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(1) @Max(50)
  limit?: number;

  @IsOptional() @IsString()
  genre?: string;

  @IsOptional() @IsEnum(MangaStatus)
  status?: MangaStatus;
}
```

> Le `ValidationPipe` global (configuré à l'étape 1 avec `transform: true`) déclenche automatiquement la validation sur tous les DTOs. Les erreurs produisent un `400 Bad Request` avec le détail des contraintes violées.

---

### Étape 9 — Gestion des erreurs (`step/09-error-handling`)

> 📖 [NestJS — Exception filters](https://docs.nestjs.com/exception-filters) · [Built-in HTTP exceptions](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)

**`src/common/filters/http-exception.filter.ts`** — filtre catch-all :

```typescript
@Catch()  // sans argument = capture TOUTES les exceptions (HTTP et non-HTTP)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  // l'argument host de la fonction catch() est une abstraction générique que NestJS utilise dans les filtres et interceptors.
  // NestJS peut fonctionner sur plusieurs protocoles : HTTP, WebSockets, microservices (TCP, Redis...)
  catch(exception: unknown, host: ArgumentsHost): void {
    // préciser quel est le protocole de communication utilisé.
    // ctx est une convention pour context, ici : "tout ce dont j'ai besoin pour interagir avec la requête HTTP en cours".
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      // class-validator retourne ses messages dans body.message (tableau de strings)
      message = typeof body === 'string' ? body : (body as any).message ?? exception.message;
      error = this.statusToError(status);
    } else {
      // Erreur interne non anticipée
      status = 500;
      error = 'Internal Server Error';
      message = 'An unexpected error occurred. Please contact support.';
      // Détail de l'erreur loggé côté serveur uniquement — jamais exposé au client
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

Enregistrement dans **`src/main.ts`** :

```typescript
app.useGlobalFilters(new HttpExceptionFilter());
```

Format de réponse d'erreur uniforme :

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Manga with id 999 not found",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/mangas/999"
}
```

> **Principe de sécurité** : les erreurs `5xx` ne retournent jamais les détails internes au client. Le message réel est uniquement loggé côté serveur via `this.logger.error`.

Codes HTTP couverts : `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.

---

### Étape 10 — Documentation (`step/10-documentation`)

> 📖 [NestJS — OpenAPI / Swagger](https://docs.nestjs.com/openapi/introduction) · [Scalar NestJS](https://guides.scalar.com/scalar/scalar-api-references/integrations/nestjs)

```bash
npm install @nestjs/swagger
npm install @scalar/nestjs-api-reference
```

**`src/main.ts`** — configuration Swagger et montage de l'UI Scalar :

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const swaggerConfig = new DocumentBuilder()
  .setTitle('MangaAPI')
  .setDescription('API REST professionnelle servant des données de mangas.')
  .setVersion('1.0')
  .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
  .build();

const document = SwaggerModule.createDocument(app, swaggerConfig);

// Spec JSON brute + UI Swagger classique (backup)
SwaggerModule.setup('api/swagger', app, document, {
  jsonDocumentUrl: 'api/docs-json',
});

// UI Scalar — moderne, dark mode natif, Try it out intégré
const { apiReference } = await import('@scalar/nestjs-api-reference');
app.use('/api/docs', apiReference({ url: '/api/docs-json' }));
```

**Décorateurs Swagger sur les controllers** :

```typescript
@ApiTags('Mangas')          // groupe les endpoints dans la doc
@ApiSecurity('api-key')     // indique que toutes les routes nécessitent X-API-Key
@Controller('mangas')
export class MangasController {

  @ApiOperation({ summary: 'Liste paginée des mangas' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Liste retournée avec pagination' })
  @ApiResponse({ status: 401, description: 'Header X-API-Key absent' })
  @Get()
  findAll(@Query() query: QueryMangaDto) { ... }

  @ApiOperation({ summary: '[Admin] Créer un manga' })
  @ApiResponse({ status: 201, description: 'Manga créé' })
  @ApiResponse({ status: 403, description: 'Accès réservé aux administrateurs' })
  @ApiResponse({ status: 409, description: 'Titre déjà existant' })
  @AdminOnly()
  @Post()
  @HttpCode(201)
  create(@Body() body: CreateMangaDto) { ... }
}
```

**Décorateurs Swagger sur les DTOs** :

```typescript
export class CreateMangaDto {
  @ApiProperty({ example: 'Berserk', maxLength: 200 })
  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @ApiProperty({ enum: MangaStatus, example: MangaStatus.ONGOING })
  @IsEnum(MangaStatus)
  status: MangaStatus;
}
```

URLs disponibles après cette étape :

| URL | Contenu |
|---|---|
| `http://localhost:3000/api/docs` | UI Scalar (documentation interactive) |
| `http://localhost:3000/api/docs-json` | Spec OpenAPI brute (JSON) |
| `http://localhost:3000/api/swagger` | UI Swagger classique (backup) |

---

## Structure finale du projet

```
src/
├── main.ts
├── app.module.ts
├── app.controller.ts           ← health check GET /api
├── data/
│   ├── mangas.json
│   └── users.json
├── storage/
│   ├── storage.module.ts       ← @Global()
│   └── storage.service.ts      ← read<T> / write<T>
├── mangas/
│   ├── mangas.module.ts
│   ├── mangas.controller.ts
│   ├── mangas.service.ts
│   └── dto/
│       ├── create-manga.dto.ts
│       ├── update-manga.dto.ts  ← PartialType(CreateMangaDto)
│       └── query-manga.dto.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── dto/
│       └── register.dto.ts
└── common/
    ├── guards/
    │   ├── api-key.guard.ts
    │   └── admin.guard.ts
    ├── filters/
    │   └── http-exception.filter.ts
    └── decorators/
        ├── public.decorator.ts
        └── admin.decorator.ts
```

---

## Tester l'API

### Compte admin (disponible dès le démarrage)

```
X-API-Key: admin-manga-api-key-dev-only
```

### Workflow de test avec Postman ou Scalar

```
1. POST /api/auth/register        body: { "email": "dev@example.com" }
                                  → 201 { "apiKey": "..." }

2. Ajouter le header X-API-Key: <apiKey> à toutes les requêtes suivantes

3. GET  /api/mangas               → 200 liste paginée
4. GET  /api/mangas/search?q=ber  → 200 résultats
5. GET  /api/mangas/1             → 200 détail
6. HEAD /api/mangas/1             → 200 sans body

# Routes admin uniquement (utiliser X-API-Key: admin-manga-api-key-dev-only)
7. POST   /api/mangas             body: { "title": "...", "author": "...", ... }  → 201
8. PATCH  /api/mangas/1           body: { "status": "completed" }  → 200
9. PUT    /api/mangas/1           body: { tous les champs }  → 200
10. DELETE /api/mangas/1          → 204
```

---

## Codes HTTP de référence

| Code | Signification | Contexte dans l'API |
|---|---|---|
| 200 | OK | Lecture ou mise à jour réussie |
| 201 | Created | Ressource créée (POST) |
| 204 | No Content | Suppression réussie (pas de body) |
| 400 | Bad Request | Paramètre ou body invalide |
| 401 | Unauthorized | Header `X-API-Key` absent |
| 403 | Forbidden | Clef valide mais rôle insuffisant |
| 404 | Not Found | Ressource inexistante |
| 409 | Conflict | Email ou titre de manga déjà utilisé |
| 422 | Unprocessable Entity | Données invalides sémantiquement |
| 429 | Too Many Requests | Rate limit dépassé (100 req/min) |
| 500 | Internal Server Error | Erreur serveur non anticipée |

---

## Liens documentation officielle NestJS

| Concept | Lien |
|---|---|
| Vue d'ensemble & First steps | [docs.nestjs.com/first-steps](https://docs.nestjs.com/first-steps) |
| Modules | [docs.nestjs.com/modules](https://docs.nestjs.com/modules) |
| Controllers | [docs.nestjs.com/controllers](https://docs.nestjs.com/controllers) |
| Providers / Services | [docs.nestjs.com/providers](https://docs.nestjs.com/providers) |
| Pipes & Validation | [docs.nestjs.com/pipes](https://docs.nestjs.com/pipes) |
| Guards | [docs.nestjs.com/guards](https://docs.nestjs.com/guards) |
| Exception Filters | [docs.nestjs.com/exception-filters](https://docs.nestjs.com/exception-filters) |
| Custom Decorators | [docs.nestjs.com/custom-decorators](https://docs.nestjs.com/custom-decorators) |
| Execution Context | [docs.nestjs.com/fundamentals/execution-context](https://docs.nestjs.com/fundamentals/execution-context) |
| Validation (class-validator) | [docs.nestjs.com/techniques/validation](https://docs.nestjs.com/techniques/validation) |
| Rate Limiting | [docs.nestjs.com/security/rate-limiting](https://docs.nestjs.com/security/rate-limiting) |
| OpenAPI / Swagger | [docs.nestjs.com/openapi/introduction](https://docs.nestjs.com/openapi/introduction) |
| CLI | [docs.nestjs.com/cli/overview](https://docs.nestjs.com/cli/overview) |
