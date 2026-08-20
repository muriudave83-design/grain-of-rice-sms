import bcrypt from "bcryptjs";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const hashPassword = (password: string) => {
  return bcrypt.hash(password, 10);
};

export const verifyPassword = (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};
