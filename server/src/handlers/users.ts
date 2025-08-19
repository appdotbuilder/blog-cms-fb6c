import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Hash the password (in a real app, use bcrypt)
    const password_hash = `hashed_${input.password}`;

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        username: input.username,
        password_hash,
        first_name: input.first_name,
        last_name: input.last_name,
        role: input.role,
        bio: input.bio || null,
        avatar_url: input.avatar_url || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const users = await db.select()
      .from(usersTable)
      .execute();

    return users;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};

export const getUserById = async (id: number): Promise<User | null> => {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return users[0] || null;
  } catch (error) {
    console.error('Failed to fetch user by id:', error);
    throw error;
  }
};

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    
    if (input.email !== undefined) updateData.email = input.email;
    if (input.username !== undefined) updateData.username = input.username;
    if (input.first_name !== undefined) updateData.first_name = input.first_name;
    if (input.last_name !== undefined) updateData.last_name = input.last_name;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.bio !== undefined) updateData.bio = input.bio;
    if (input.avatar_url !== undefined) updateData.avatar_url = input.avatar_url;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};

export const deleteUser = async (id: number): Promise<boolean> => {
  try {
    const result = await db.delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id })
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
};