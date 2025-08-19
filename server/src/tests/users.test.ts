import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { createUser, getUsers, getUserById, updateUser, deleteUser } from '../handlers/users';
import { eq } from 'drizzle-orm';

// Test input data
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User',
  role: 'author',
  bio: 'Test bio',
  avatar_url: 'https://example.com/avatar.jpg'
};

const minimalUserInput: CreateUserInput = {
  email: 'minimal@example.com',
  username: 'minimal',
  password: 'password123',
  first_name: 'Min',
  last_name: 'User',
  role: 'editor'
};

describe('User Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUser', () => {
    it('should create a user with all fields', async () => {
      const result = await createUser(testUserInput);

      expect(result.email).toEqual('test@example.com');
      expect(result.username).toEqual('testuser');
      expect(result.password_hash).toContain('hashed_');
      expect(result.first_name).toEqual('Test');
      expect(result.last_name).toEqual('User');
      expect(result.role).toEqual('author');
      expect(result.bio).toEqual('Test bio');
      expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
      expect(result.is_active).toEqual(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a user with minimal fields', async () => {
      const result = await createUser(minimalUserInput);

      expect(result.email).toEqual('minimal@example.com');
      expect(result.username).toEqual('minimal');
      expect(result.first_name).toEqual('Min');
      expect(result.last_name).toEqual('User');
      expect(result.role).toEqual('editor');
      expect(result.bio).toBeNull();
      expect(result.avatar_url).toBeNull();
      expect(result.is_active).toEqual(true);
    });

    it('should save user to database', async () => {
      const result = await createUser(testUserInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].email).toEqual('test@example.com');
      expect(users[0].username).toEqual('testuser');
      expect(users[0].role).toEqual('author');
    });

    it('should reject duplicate email', async () => {
      await createUser(testUserInput);

      const duplicateUser: CreateUserInput = {
        ...testUserInput,
        username: 'different'
      };

      expect(createUser(duplicateUser)).rejects.toThrow();
    });

    it('should reject duplicate username', async () => {
      await createUser(testUserInput);

      const duplicateUser: CreateUserInput = {
        ...testUserInput,
        email: 'different@example.com'
      };

      expect(createUser(duplicateUser)).rejects.toThrow();
    });
  });

  describe('getUsers', () => {
    it('should return empty array when no users exist', async () => {
      const result = await getUsers();
      expect(result).toHaveLength(0);
    });

    it('should return all users', async () => {
      await createUser(testUserInput);
      await createUser(minimalUserInput);

      const result = await getUsers();

      expect(result).toHaveLength(2);
      expect(result[0].email).toEqual('test@example.com');
      expect(result[1].email).toEqual('minimal@example.com');
    });

    it('should return users with all fields populated', async () => {
      await createUser(testUserInput);

      const result = await getUsers();

      expect(result).toHaveLength(1);
      const user = result[0];
      expect(user.id).toBeDefined();
      expect(user.email).toEqual('test@example.com');
      expect(user.username).toEqual('testuser');
      expect(user.first_name).toEqual('Test');
      expect(user.last_name).toEqual('User');
      expect(user.role).toEqual('author');
      expect(user.bio).toEqual('Test bio');
      expect(user.avatar_url).toEqual('https://example.com/avatar.jpg');
      expect(user.is_active).toEqual(true);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getUserById', () => {
    it('should return null for non-existent user', async () => {
      const result = await getUserById(999);
      expect(result).toBeNull();
    });

    it('should return user when found', async () => {
      const createdUser = await createUser(testUserInput);

      const result = await getUserById(createdUser.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdUser.id);
      expect(result!.email).toEqual('test@example.com');
      expect(result!.username).toEqual('testuser');
      expect(result!.role).toEqual('author');
    });

    it('should return user with all fields populated', async () => {
      const createdUser = await createUser(testUserInput);

      const result = await getUserById(createdUser.id);

      expect(result!.bio).toEqual('Test bio');
      expect(result!.avatar_url).toEqual('https://example.com/avatar.jpg');
      expect(result!.is_active).toEqual(true);
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('updateUser', () => {
    let createdUser: any;

    beforeEach(async () => {
      createdUser = await createUser(testUserInput);
    });

    it('should update single field', async () => {
      const updateInput: UpdateUserInput = {
        id: createdUser.id,
        first_name: 'Updated'
      };

      const result = await updateUser(updateInput);

      expect(result.first_name).toEqual('Updated');
      expect(result.last_name).toEqual('User'); // Unchanged
      expect(result.email).toEqual('test@example.com'); // Unchanged
    });

    it('should update multiple fields', async () => {
      const updateInput: UpdateUserInput = {
        id: createdUser.id,
        first_name: 'Updated',
        last_name: 'Name',
        bio: 'Updated bio',
        is_active: false
      };

      const result = await updateUser(updateInput);

      expect(result.first_name).toEqual('Updated');
      expect(result.last_name).toEqual('Name');
      expect(result.bio).toEqual('Updated bio');
      expect(result.is_active).toEqual(false);
      expect(result.email).toEqual('test@example.com'); // Unchanged
    });

    it('should update nullable fields to null', async () => {
      const updateInput: UpdateUserInput = {
        id: createdUser.id,
        bio: null,
        avatar_url: null
      };

      const result = await updateUser(updateInput);

      expect(result.bio).toBeNull();
      expect(result.avatar_url).toBeNull();
    });

    it('should update updated_at timestamp', async () => {
      const originalUpdatedAt = createdUser.updated_at;
      
      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updateInput: UpdateUserInput = {
        id: createdUser.id,
        first_name: 'Updated'
      };

      const result = await updateUser(updateInput);

      expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should save updates to database', async () => {
      const updateInput: UpdateUserInput = {
        id: createdUser.id,
        first_name: 'Updated',
        role: 'admin'
      };

      await updateUser(updateInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, createdUser.id))
        .execute();

      expect(users[0].first_name).toEqual('Updated');
      expect(users[0].role).toEqual('admin');
    });

    it('should throw error for non-existent user', async () => {
      const updateInput: UpdateUserInput = {
        id: 999,
        first_name: 'Updated'
      };

      expect(updateUser(updateInput)).rejects.toThrow(/not found/i);
    });

    it('should reject duplicate email when updating', async () => {
      // Create second user
      const secondUser = await createUser(minimalUserInput);

      const updateInput: UpdateUserInput = {
        id: secondUser.id,
        email: 'test@example.com' // Duplicate of first user's email
      };

      expect(updateUser(updateInput)).rejects.toThrow();
    });

    it('should reject duplicate username when updating', async () => {
      // Create second user
      const secondUser = await createUser(minimalUserInput);

      const updateInput: UpdateUserInput = {
        id: secondUser.id,
        username: 'testuser' // Duplicate of first user's username
      };

      expect(updateUser(updateInput)).rejects.toThrow();
    });
  });

  describe('deleteUser', () => {
    it('should return false for non-existent user', async () => {
      const result = await deleteUser(999);
      expect(result).toEqual(false);
    });

    it('should delete existing user and return true', async () => {
      const createdUser = await createUser(testUserInput);

      const result = await deleteUser(createdUser.id);

      expect(result).toEqual(true);
    });

    it('should remove user from database', async () => {
      const createdUser = await createUser(testUserInput);

      await deleteUser(createdUser.id);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, createdUser.id))
        .execute();

      expect(users).toHaveLength(0);
    });

    it('should not affect other users', async () => {
      const user1 = await createUser(testUserInput);
      const user2 = await createUser(minimalUserInput);

      await deleteUser(user1.id);

      const remainingUsers = await getUsers();
      expect(remainingUsers).toHaveLength(1);
      expect(remainingUsers[0].id).toEqual(user2.id);
    });
  });
});