import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signAuthToken(payload) {
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: config.auth.tokenTtlSeconds });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, config.auth.jwtSecret);
}

