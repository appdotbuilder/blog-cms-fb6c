import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing using built-in crypto (for demonstration purposes)
// In production, use bcrypt or similar
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
};

// Simple JWT implementation (for demonstration purposes)
// In production, use proper JWT library
const createToken = (payload: any): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = btoa(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }));
  const signature = btoa(`${header}.${payloadB64}.secret`);
  return `${header}.${payloadB64}.${signature}`;
};

const verifyTokenInternal = (token: string): any | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    if (payload.exp < Date.now()) return null;
    
    // Verify signature (simplified)
    const expectedSignature = btoa(`${parts[0]}.${parts[1]}.secret`);
    if (parts[2] !== expectedSignature) return null;
    
    return payload;
  } catch {
    return null;
  }
};

export async function loginUser(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by email
    const userResults = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (userResults.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = userResults[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword as User,
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    // Verify token
    const decoded = verifyTokenInternal(token);
    if (!decoded) return null;
    
    // Find user by ID
    const userResults = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .execute();

    if (userResults.length === 0 || !userResults[0].is_active) {
      return null;
    }

    const { password_hash, ...user } = userResults[0];
    return user as User;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function refreshToken(token: string): Promise<{ token: string } | null> {
  try {
    // Parse token without verification (to allow expired tokens)
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Find user by ID to ensure they still exist and are active
    const userResults = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .execute();

    if (userResults.length === 0 || !userResults[0].is_active) {
      return null;
    }

    const user = userResults[0];

    // Generate new token
    const newToken = createToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return { token: newToken };
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}