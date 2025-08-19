import { db } from '../db';
import { tagsTable, postTagsTable } from '../db/schema';
import { type CreateTagInput, type UpdateTagInput, type Tag } from '../schema';
import { eq, count, desc, asc, ilike, sql } from 'drizzle-orm';

export async function createTag(input: CreateTagInput): Promise<Tag> {
  try {
    const result = await db.insert(tagsTable)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Tag creation failed:', error);
    throw error;
  }
}

export async function getTags(): Promise<Tag[]> {
  try {
    const tags = await db.select()
      .from(tagsTable)
      .orderBy(asc(tagsTable.name))
      .execute();

    return tags;
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    throw error;
  }
}

export async function getTagById(id: number): Promise<Tag | null> {
  try {
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, id))
      .execute();

    return tags[0] || null;
  } catch (error) {
    console.error('Failed to fetch tag by ID:', error);
    throw error;
  }
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  try {
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.slug, slug))
      .execute();

    return tags[0] || null;
  } catch (error) {
    console.error('Failed to fetch tag by slug:', error);
    throw error;
  }
}

export async function updateTag(input: UpdateTagInput): Promise<Tag> {
  try {
    const updateData: Partial<typeof tagsTable.$inferInsert> = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.description !== undefined) updateData.description = input.description;
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const result = await db.update(tagsTable)
      .set(updateData)
      .where(eq(tagsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Tag with ID ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Tag update failed:', error);
    throw error;
  }
}

export async function deleteTag(id: number): Promise<boolean> {
  try {
    // First, delete all post-tag associations
    await db.delete(postTagsTable)
      .where(eq(postTagsTable.tag_id, id))
      .execute();

    // Then delete the tag itself
    const result = await db.delete(tagsTable)
      .where(eq(tagsTable.id, id))
      .returning({ id: tagsTable.id })
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Tag deletion failed:', error);
    throw error;
  }
}

export async function getPopularTags(limit: number = 10): Promise<Array<Tag & { post_count: number }>> {
  try {
    const result = await db.select({
      id: tagsTable.id,
      name: tagsTable.name,
      slug: tagsTable.slug,
      description: tagsTable.description,
      created_at: tagsTable.created_at,
      updated_at: tagsTable.updated_at,
      post_count: count(postTagsTable.post_id)
    })
      .from(tagsTable)
      .leftJoin(postTagsTable, eq(tagsTable.id, postTagsTable.tag_id))
      .groupBy(tagsTable.id)
      .orderBy(desc(count(postTagsTable.post_id)), asc(tagsTable.name))
      .limit(limit)
      .execute();

    return result.map(tag => ({
      ...tag,
      post_count: Number(tag.post_count)
    }));
  } catch (error) {
    console.error('Failed to fetch popular tags:', error);
    throw error;
  }
}

export async function searchTags(query: string): Promise<Tag[]> {
  try {
    const tags = await db.select()
      .from(tagsTable)
      .where(ilike(tagsTable.name, `%${query}%`))
      .orderBy(asc(tagsTable.name))
      .limit(20)
      .execute();

    return tags;
  } catch (error) {
    console.error('Tag search failed:', error);
    throw error;
  }
}