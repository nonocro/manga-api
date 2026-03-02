import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request } from 'express';
import { RegisterUserDto } from './dto/register-user.dto';
import { Public } from 'src/common/guards/decorators/public-decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() body: RegisterUserDto) {
    return this.authService.register(body.email);
  }

  @Get('me')
  getMe(@Req() req: Request) {
    const user = (req as any).user;
    return this.authService.findByApiKey(user.apiKey);
  }

  @Post('regenerate-key')
  regenerateKey(@Req() req: Request) {
    return this.authService.regenerateKey((req as any).user.apiKey);
  }

  @Delete('account')
  @HttpCode(204)
  deleteAccount(@Req() req: Request) {
    this.authService.deleteAccount((req as any).user.apiKey);
  }
}
