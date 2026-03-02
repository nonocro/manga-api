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
