export interface JwtPayload {
  sub: string; // user id (Mongo ObjectId as string)
  email: string;
  rol: 'ADMIN' | 'CLIENTE';
}
