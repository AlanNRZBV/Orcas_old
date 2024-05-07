import { Model } from 'mongoose';

export interface IUser {
  email: string;
  password: string;
  avatar: string | null;
  firstName: string;
  lastName: string;
}

export interface UserFields {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  token: string;
  role: string;
  googleID: string;
  avatar: string;
}

export interface UserMethods {
  checkPassword(password: string): Promise<boolean>;
  generateToken(): void;
}

type UserModel = Model<UserFields, object, UserMethods>;
