import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

export async function verifyToken(token) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) return null;

    // In production, verify signature with Auth0 public key
    // For now, just decode and validate structure
    return decoded.payload;
  } catch (error) {
    return null;
  }
}

export async function getOrCreateUser(auth0Id, email) {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE auth0_id = $1',
      [auth0Id]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    const newUser = await pool.query(
      'INSERT INTO users (auth0_id, email) VALUES ($1, $2) RETURNING *',
      [auth0Id, email]
    );

    return newUser.rows[0];
  } catch (error) {
    console.error('Error managing user:', error);
    return null;
  }
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);

  if (decoded) {
    req.user = decoded;
  }

  next();
}
