import { ConflictException, Injectable } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.interface';

@Injectable()
export class AuthService {
  constructor(private readonly storage: StorageService) {}

  register(email: string): { apiKey: string } {
    const users = this.storage.read<User[]>('users.json');

    if (users.some((u) => u.email === email)) {
      throw new ConflictException(`Email ${email} already exists`);
    }

    const newUser: User = {
      id: uuidv4(),
      email,
      role: 'user',
      apiKey: uuidv4(),
      createAt: new Date().toISOString(),
    };

    this.storage.write('users.json', [...users, newUser]);
    return { apiKey: newUser.apiKey };
  }

  regenerateKey(apiKey: string): { apiKey: string } {
    const users = this.storage.read<User[]>('users.json');
    const index = users.findIndex((u) => u.apiKey === apiKey);

    if (index === -1) {
      throw new ConflictException(`API key ${apiKey} not found`);
    }

    const newKey = uuidv4();
    users[index] = { ...users[index], apiKey: newKey };
    this.storage.write('users.json', users);
    return { apiKey: newKey };
  }

  findByApiKey(apiKey: string): User | undefined {
    return this.storage
      .read<User[]>('users.json')
      .find((u) => u.apiKey === apiKey);
  }

  deleteAccount(apiKey: string): void {
    const users = this.storage.read<User[]>('users.json');
    const index = users.findIndex((u) => u.apiKey === apiKey);

    if (index === -1) {
      throw new ConflictException(`API key ${apiKey} not found`);
    }

    users.splice(index, 1);
    this.storage.write('users.json', users);
  }
}
