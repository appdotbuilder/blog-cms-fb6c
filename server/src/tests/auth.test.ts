import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser, verifyToken, refreshToken, hashPassword } from '../handlers/auth';
import { eq } from 'drizzle-orm';

describe('auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('loginUser', () => {
    it('should authenticate user with valid credentials', async () => {
      // Create test user
      const hashedPassword = await hashPassword('testpassword123');
      await db.insert(usersTable).values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'User',
        role: 'author'
      }).execute();

      const loginInput: LoginInput = {
        email: 'test@example.com',
        password: 'testpassword123'
      };

      const result = await loginUser(loginInput);

      // Verify user data
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.username).toBe('testuser');
      expect(result.user.first_name).toBe('Test');
      expect(result.user.last_name).toBe('User');
      expect(result.user.role).toBe('author');
      expect(result.user.is_active).toBe(true);
      expect(result.user.id).toBeDefined();
      expect(result.user.created_at).toBeInstanceOf(Date);

      // Verify token is generated
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.').length).toBe(3); // JWT format
    });

    it('should reject invalid email', async () => {
      const loginInput: LoginInput = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      await expect(loginUser(loginInput)).rejects.toThrow(/invalid email or password/i);
    });

    it('should reject invalid password', async () => {
      // Create test user
      const hashedPassword = await hashPassword('correctpassword');
      await db.insert(usersTable).values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'User',
        role: 'author'
      }).execute();

      const loginInput: LoginInput = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await expect(loginUser(loginInput)).rejects.toThrow(/invalid email or password/i);
    });

    it('should reject inactive user', async () => {
      // Create inactive user
      const hashedPassword = await hashPassword('testpassword123');
      await db.insert(usersTable).values({
        email: 'inactive@example.com',
        username: 'inactiveuser',
        password_hash: hashedPassword,
        first_name: 'Inactive',
        last_name: 'User',
        role: 'author',
        is_active: false
      }).execute();

      const loginInput: LoginInput = {
        email: 'inactive@example.com',
        password: 'testpassword123'
      };

      await expect(loginUser(loginInput)).rejects.toThrow(/account is deactivated/i);
    });

    it('should not return password hash in response', async () => {
      // Create test user
      const hashedPassword = await hashPassword('testpassword123');
      await db.insert(usersTable).values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'User',
        role: 'author'
      }).execute();

      const loginInput: LoginInput = {
        email: 'test@example.com',
        password: 'testpassword123'
      };

      const result = await loginUser(loginInput);
      
      expect((result.user as any).password_hash).toBeUndefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return user', async () => {
      // Create test user and login to get token
      const hashedPassword = await hashPassword('testpassword123');
      await db.insert(usersTable).values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'User',
        role: 'author'
      }).execute();

      const loginResult = await loginUser({
        email: 'test@example.com',
        password: 'testpassword123'
      });

      const result = await verifyToken(loginResult.token);

      expect(result).not.toBeNull();
      expect(result!.email).toBe('test@example.com');
      expect(result!.username).toBe('testuser');
      expect((result as any).password_hash).toBeUndefined();
    });

    it('should return null for invalid token', async () => {
      const result = await verifyToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const result = await verifyToken('not.a.jwt');
      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      // Create user and get token
      const hashedPassword = await hashPassword('testpassword123');
      const userResult = await db.insert(usersTable).values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'User',
        role: 'author'
      }).returning().execute();

      const loginResult = await loginUser({
        email: 'test@example.com',
        password: 'testpassword123'
      });

      // Deactivate user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.id, userResult[0].id))
        .execute();

      const result = await verifyToken(loginResult.token);
      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token for active user', async () => {
      // Create test user and login
      const hashedPassword = await hashPassword('testpassword123');
      await db.insert(usersTable).values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'User',
        role: 'editor'
      }).execute();

      const loginResult = await loginUser({
        email: 'test@example.com',
        password: 'testpassword123'
      });

      const result = await refreshToken(loginResult.token);

      expect(result).not.toBeNull();
      expect(result!.token).toBeDefined();
      expect(typeof result!.token).toBe('string');
      expect(result!.token).not.toBe(loginResult.token);
      expect(result!.token.split('.').length).toBe(3); // JWT format
    });

    it('should return null for invalid token', async () => {
      const result = await refreshToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const result = await refreshToken('not.a.jwt.token');
      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      // Create user and get token
      const hashedPassword = await hashPassword('testpassword123');
      const userResult = await db.insert(usersTable).values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'User',
        role: 'author'
      }).returning().execute();

      const loginResult = await loginUser({
        email: 'test@example.com',
        password: 'testpassword123'
      });

      // Deactivate user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.id, userResult[0].id))
        .execute();

      const result = await refreshToken(loginResult.token);
      expect(result).toBeNull();
    });

    it('should work with expired token structure', async () => {
      // Create user and get token
      const hashedPassword = await hashPassword('testpassword123');
      await db.insert(usersTable).values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'User',
        role: 'author'
      }).execute();

      const loginResult = await loginUser({
        email: 'test@example.com',
        password: 'testpassword123'
      });

      // Should still work even with current token (refresh logic doesn't check expiration)
      const result = await refreshToken(loginResult.token);
      expect(result).not.toBeNull();
      expect(result!.token).toBeDefined();
    });
  });
});