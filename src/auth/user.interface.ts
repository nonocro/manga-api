export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  apiKey: string;
  createAt: string;
}
