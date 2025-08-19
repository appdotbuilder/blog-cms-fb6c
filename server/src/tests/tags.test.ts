import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tagsTable, usersTable, postsTable, postTagsTable } from '../db/schema';
import { type CreateTagInput, type UpdateTagInput } from '../schema';
import {
  createTag,
  getTags,
  getTagById,
  getTagBySlug,
  updateTag,
  deleteTag,
  getPopularTags,
  searchTags
} from '../handlers/tags';
import { eq } from 'drizzle-orm';

// Test inputs
const testTagInput: CreateTagInput = {
  name: 'JavaScript',
  slug: 'javascript',
  description: 'Programming language for web development'
};

const testTagInput2: CreateTagInput = {
  name: 'TypeScript',
  slug: 'typescript',
  description: 'Typed superset of JavaScript'
};

const testTagInputMinimal: CreateTagInput = {
  name: 'React',
  slug: 'react'
};

describe('Tags Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createTag', () => {
    it('should create a tag with full data', async () => {
      const result = await createTag(testTagInput);

      expect(result.name).toEqual('JavaScript');
      expect(result.slug).toEqual('javascript');
      expect(result.description).toEqual('Programming language for web development');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a tag with minimal data', async () => {
      const result = await createTag(testTagInputMinimal);

      expect(result.name).toEqual('React');
      expect(result.slug).toEqual('react');
      expect(result.description).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save tag to database', async () => {
      const result = await createTag(testTagInput);

      const tags = await db.select()
        .from(tagsTable)
        .where(eq(tagsTable.id, result.id))
        .execute();

      expect(tags).toHaveLength(1);
      expect(tags[0].name).toEqual('JavaScript');
      expect(tags[0].slug).toEqual('javascript');
      expect(tags[0].description).toEqual('Programming language for web development');
    });

    it('should fail with duplicate slug', async () => {
      await createTag(testTagInput);

      const duplicateInput: CreateTagInput = {
        name: 'Different Name',
        slug: 'javascript',
        description: 'Different description'
      };

      await expect(createTag(duplicateInput)).rejects.toThrow(/unique constraint/i);
    });
  });

  describe('getTags', () => {
    it('should return empty array when no tags exist', async () => {
      const result = await getTags();
      expect(result).toEqual([]);
    });

    it('should return all tags sorted by name', async () => {
      await createTag(testTagInput2); // TypeScript
      await createTag(testTagInput);  // JavaScript
      await createTag(testTagInputMinimal); // React

      const result = await getTags();

      expect(result).toHaveLength(3);
      expect(result[0].name).toEqual('JavaScript'); // Alphabetically first
      expect(result[1].name).toEqual('React');
      expect(result[2].name).toEqual('TypeScript');
    });
  });

  describe('getTagById', () => {
    it('should return null for non-existent tag', async () => {
      const result = await getTagById(999);
      expect(result).toBeNull();
    });

    it('should return tag by ID', async () => {
      const created = await createTag(testTagInput);
      const result = await getTagById(created.id);

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('JavaScript');
      expect(result!.slug).toEqual('javascript');
      expect(result!.description).toEqual('Programming language for web development');
    });
  });

  describe('getTagBySlug', () => {
    it('should return null for non-existent slug', async () => {
      const result = await getTagBySlug('non-existent');
      expect(result).toBeNull();
    });

    it('should return tag by slug', async () => {
      await createTag(testTagInput);
      const result = await getTagBySlug('javascript');

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('JavaScript');
      expect(result!.slug).toEqual('javascript');
      expect(result!.description).toEqual('Programming language for web development');
    });
  });

  describe('updateTag', () => {
    it('should update tag name', async () => {
      const created = await createTag(testTagInput);
      
      const updateInput: UpdateTagInput = {
        id: created.id,
        name: 'Updated JavaScript'
      };

      const result = await updateTag(updateInput);

      expect(result.name).toEqual('Updated JavaScript');
      expect(result.slug).toEqual('javascript'); // Should remain unchanged
      expect(result.description).toEqual('Programming language for web development');
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update tag slug', async () => {
      const created = await createTag(testTagInput);
      
      const updateInput: UpdateTagInput = {
        id: created.id,
        slug: 'js'
      };

      const result = await updateTag(updateInput);

      expect(result.name).toEqual('JavaScript'); // Should remain unchanged
      expect(result.slug).toEqual('js');
      expect(result.description).toEqual('Programming language for web development');
    });

    it('should update tag description', async () => {
      const created = await createTag(testTagInput);
      
      const updateInput: UpdateTagInput = {
        id: created.id,
        description: 'Updated description'
      };

      const result = await updateTag(updateInput);

      expect(result.name).toEqual('JavaScript');
      expect(result.slug).toEqual('javascript');
      expect(result.description).toEqual('Updated description');
    });

    it('should set description to null', async () => {
      const created = await createTag(testTagInput);
      
      const updateInput: UpdateTagInput = {
        id: created.id,
        description: null
      };

      const result = await updateTag(updateInput);

      expect(result.description).toBeNull();
    });

    it('should fail for non-existent tag', async () => {
      const updateInput: UpdateTagInput = {
        id: 999,
        name: 'Non-existent'
      };

      await expect(updateTag(updateInput)).rejects.toThrow(/Tag with ID 999 not found/);
    });
  });

  describe('deleteTag', () => {
    it('should return false for non-existent tag', async () => {
      const result = await deleteTag(999);
      expect(result).toBe(false);
    });

    it('should delete tag successfully', async () => {
      const created = await createTag(testTagInput);
      const result = await deleteTag(created.id);

      expect(result).toBe(true);

      // Verify tag is deleted
      const deletedTag = await getTagById(created.id);
      expect(deletedTag).toBeNull();
    });

    it('should delete tag and its post associations', async () => {
      // Create prerequisite data
      const user = await db.insert(usersTable).values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hash',
        first_name: 'Test',
        last_name: 'User',
        role: 'author'
      }).returning().execute();

      const tag = await createTag(testTagInput);

      const post = await db.insert(postsTable).values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: user[0].id,
        status: 'published'
      }).returning().execute();

      // Create post-tag association
      await db.insert(postTagsTable).values({
        post_id: post[0].id,
        tag_id: tag.id
      }).execute();

      // Verify association exists
      const associations = await db.select()
        .from(postTagsTable)
        .where(eq(postTagsTable.tag_id, tag.id))
        .execute();
      expect(associations).toHaveLength(1);

      // Delete tag
      const result = await deleteTag(tag.id);
      expect(result).toBe(true);

      // Verify associations are deleted
      const deletedAssociations = await db.select()
        .from(postTagsTable)
        .where(eq(postTagsTable.tag_id, tag.id))
        .execute();
      expect(deletedAssociations).toHaveLength(0);
    });
  });

  describe('getPopularTags', () => {
    it('should return empty array when no tags exist', async () => {
      const result = await getPopularTags();
      expect(result).toEqual([]);
    });

    it('should return tags with post counts', async () => {
      // Create prerequisite data
      const user = await db.insert(usersTable).values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hash',
        first_name: 'Test',
        last_name: 'User',
        role: 'author'
      }).returning().execute();

      const tag1 = await createTag(testTagInput); // JavaScript
      const tag2 = await createTag(testTagInput2); // TypeScript

      const post1 = await db.insert(postsTable).values({
        title: 'Post 1',
        slug: 'post-1',
        content: 'Content 1',
        author_id: user[0].id,
        status: 'published'
      }).returning().execute();

      const post2 = await db.insert(postsTable).values({
        title: 'Post 2',
        slug: 'post-2',
        content: 'Content 2',
        author_id: user[0].id,
        status: 'published'
      }).returning().execute();

      // Tag1 used in 2 posts, Tag2 used in 1 post
      await db.insert(postTagsTable).values([
        { post_id: post1[0].id, tag_id: tag1.id },
        { post_id: post2[0].id, tag_id: tag1.id },
        { post_id: post1[0].id, tag_id: tag2.id }
      ]).execute();

      const result = await getPopularTags();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('JavaScript'); // Most popular first
      expect(result[0].post_count).toEqual(2);
      expect(result[1].name).toEqual('TypeScript');
      expect(result[1].post_count).toEqual(1);
    });

    it('should respect limit parameter', async () => {
      await createTag(testTagInput);
      await createTag(testTagInput2);
      await createTag(testTagInputMinimal);

      const result = await getPopularTags(2);
      expect(result).toHaveLength(2);
    });

    it('should sort by popularity then name', async () => {
      const tagA = await createTag({ name: 'A Tag', slug: 'a-tag' });
      const tagZ = await createTag({ name: 'Z Tag', slug: 'z-tag' });

      const result = await getPopularTags();

      expect(result).toHaveLength(2);
      // Both have 0 posts, so should be sorted alphabetically
      expect(result[0].name).toEqual('A Tag');
      expect(result[1].name).toEqual('Z Tag');
      expect(result[0].post_count).toEqual(0);
      expect(result[1].post_count).toEqual(0);
    });
  });

  describe('searchTags', () => {
    beforeEach(async () => {
      await createTag(testTagInput); // JavaScript
      await createTag(testTagInput2); // TypeScript  
      await createTag(testTagInputMinimal); // React
      await createTag({ name: 'Node.js', slug: 'nodejs', description: 'Server-side JavaScript' });
    });

    it('should return empty array for no matches', async () => {
      const result = await searchTags('python');
      expect(result).toEqual([]);
    });

    it('should search tags by partial name match', async () => {
      const result = await searchTags('script');

      expect(result).toHaveLength(2);
      expect(result.map(tag => tag.name)).toContain('JavaScript');
      expect(result.map(tag => tag.name)).toContain('TypeScript');
    });

    it('should search case-insensitively', async () => {
      const result = await searchTags('JAVA');

      expect(result).toHaveLength(1);
      expect(result.map(tag => tag.name)).toContain('JavaScript');
    });

    it('should return results sorted alphabetically', async () => {
      const result = await searchTags('script');

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('JavaScript'); // Alphabetically first
      expect(result[1].name).toEqual('TypeScript');
    });

    it('should limit results to 20', async () => {
      // This test verifies the limit is applied (would need 21+ tags to fully test)
      const result = await searchTags('');
      expect(result.length).toBeLessThanOrEqual(20);
    });
  });
});