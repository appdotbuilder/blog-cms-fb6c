import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, postsTable, usersTable } from '../db/schema';
import { type CreateCategoryInput, type UpdateCategoryInput } from '../schema';
import { 
  createCategory, 
  getCategories, 
  getCategoryById, 
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  getCategoryTree
} from '../handlers/categories';
import { eq } from 'drizzle-orm';

// Test inputs
const testCategoryInput: CreateCategoryInput = {
  name: 'Technology',
  slug: 'technology',
  description: 'Articles about technology and innovation',
  parent_id: null,
  meta_title: 'Technology Articles',
  meta_description: 'Read the latest technology articles'
};

const childCategoryInput: CreateCategoryInput = {
  name: 'Web Development',
  slug: 'web-development',
  description: 'Web development tutorials and guides',
  parent_id: 1, // Will be set dynamically in tests
  meta_title: 'Web Development Guides',
  meta_description: 'Learn web development'
};

describe('Categories Handler', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createCategory', () => {
    it('should create a category with all fields', async () => {
      const result = await createCategory(testCategoryInput);

      expect(result.name).toEqual('Technology');
      expect(result.slug).toEqual('technology');
      expect(result.description).toEqual('Articles about technology and innovation');
      expect(result.parent_id).toBeNull();
      expect(result.meta_title).toEqual('Technology Articles');
      expect(result.meta_description).toEqual('Read the latest technology articles');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a category with minimal fields', async () => {
      const minimalInput: CreateCategoryInput = {
        name: 'Simple Category',
        slug: 'simple-category'
      };

      const result = await createCategory(minimalInput);

      expect(result.name).toEqual('Simple Category');
      expect(result.slug).toEqual('simple-category');
      expect(result.description).toBeNull();
      expect(result.parent_id).toBeNull();
      expect(result.meta_title).toBeNull();
      expect(result.meta_description).toBeNull();
    });

    it('should create a child category with valid parent', async () => {
      // Create parent category first
      const parentCategory = await createCategory(testCategoryInput);
      
      const childInput: CreateCategoryInput = {
        ...childCategoryInput,
        parent_id: parentCategory.id
      };

      const result = await createCategory(childInput);

      expect(result.name).toEqual('Web Development');
      expect(result.parent_id).toEqual(parentCategory.id);
    });

    it('should save category to database', async () => {
      const result = await createCategory(testCategoryInput);

      const categories = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, result.id))
        .execute();

      expect(categories).toHaveLength(1);
      expect(categories[0].name).toEqual('Technology');
      expect(categories[0].slug).toEqual('technology');
    });

    it('should throw error for non-existent parent category', async () => {
      const invalidInput: CreateCategoryInput = {
        ...testCategoryInput,
        parent_id: 999
      };

      await expect(createCategory(invalidInput)).rejects.toThrow(/Parent category with ID 999 does not exist/);
    });

    it('should throw error for duplicate slug', async () => {
      await createCategory(testCategoryInput);

      await expect(createCategory(testCategoryInput)).rejects.toThrow();
    });
  });

  describe('getCategories', () => {
    it('should return empty array when no categories exist', async () => {
      const result = await getCategories();
      expect(result).toEqual([]);
    });

    it('should return all categories', async () => {
      await createCategory(testCategoryInput);
      await createCategory({
        name: 'Sports',
        slug: 'sports',
        description: 'Sports articles'
      });

      const result = await getCategories();

      expect(result).toHaveLength(2);
      expect(result.map(c => c.name)).toContain('Technology');
      expect(result.map(c => c.name)).toContain('Sports');
    });

    it('should return categories with all fields', async () => {
      await createCategory(testCategoryInput);

      const result = await getCategories();

      expect(result[0].name).toEqual('Technology');
      expect(result[0].slug).toEqual('technology');
      expect(result[0].description).toEqual('Articles about technology and innovation');
      expect(result[0].meta_title).toEqual('Technology Articles');
      expect(result[0].created_at).toBeInstanceOf(Date);
    });
  });

  describe('getCategoryById', () => {
    it('should return null for non-existent category', async () => {
      const result = await getCategoryById(999);
      expect(result).toBeNull();
    });

    it('should return category by ID', async () => {
      const created = await createCategory(testCategoryInput);

      const result = await getCategoryById(created.id);

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('Technology');
      expect(result!.slug).toEqual('technology');
      expect(result!.id).toEqual(created.id);
    });
  });

  describe('getCategoryBySlug', () => {
    it('should return null for non-existent slug', async () => {
      const result = await getCategoryBySlug('non-existent');
      expect(result).toBeNull();
    });

    it('should return category by slug', async () => {
      await createCategory(testCategoryInput);

      const result = await getCategoryBySlug('technology');

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('Technology');
      expect(result!.slug).toEqual('technology');
    });
  });

  describe('updateCategory', () => {
    it('should update category with all fields', async () => {
      const created = await createCategory(testCategoryInput);

      const updateInput: UpdateCategoryInput = {
        id: created.id,
        name: 'Updated Technology',
        slug: 'updated-technology',
        description: 'Updated description',
        meta_title: 'Updated Meta Title',
        meta_description: 'Updated meta description'
      };

      const result = await updateCategory(updateInput);

      expect(result.name).toEqual('Updated Technology');
      expect(result.slug).toEqual('updated-technology');
      expect(result.description).toEqual('Updated description');
      expect(result.meta_title).toEqual('Updated Meta Title');
      expect(result.meta_description).toEqual('Updated meta description');
      expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
    });

    it('should update category with partial fields', async () => {
      const created = await createCategory(testCategoryInput);

      const updateInput: UpdateCategoryInput = {
        id: created.id,
        name: 'Partially Updated'
      };

      const result = await updateCategory(updateInput);

      expect(result.name).toEqual('Partially Updated');
      expect(result.slug).toEqual('technology'); // Should remain unchanged
      expect(result.description).toEqual('Articles about technology and innovation'); // Should remain unchanged
    });

    it('should update parent category', async () => {
      const parentCategory = await createCategory(testCategoryInput);
      const childCategory = await createCategory({
        name: 'Child Category',
        slug: 'child-category'
      });

      const updateInput: UpdateCategoryInput = {
        id: childCategory.id,
        parent_id: parentCategory.id
      };

      const result = await updateCategory(updateInput);

      expect(result.parent_id).toEqual(parentCategory.id);
    });

    it('should remove parent by setting null', async () => {
      const parentCategory = await createCategory(testCategoryInput);
      const childCategory = await createCategory({
        name: 'Child Category',
        slug: 'child-category',
        parent_id: parentCategory.id
      });

      const updateInput: UpdateCategoryInput = {
        id: childCategory.id,
        parent_id: null
      };

      const result = await updateCategory(updateInput);

      expect(result.parent_id).toBeNull();
    });

    it('should throw error for non-existent category', async () => {
      const updateInput: UpdateCategoryInput = {
        id: 999,
        name: 'Non-existent'
      };

      await expect(updateCategory(updateInput)).rejects.toThrow(/Category with ID 999 not found/);
    });

    it('should throw error for non-existent parent category', async () => {
      const created = await createCategory(testCategoryInput);

      const updateInput: UpdateCategoryInput = {
        id: created.id,
        parent_id: 999
      };

      await expect(updateCategory(updateInput)).rejects.toThrow(/Parent category with ID 999 does not exist/);
    });

    it('should throw error for self-parent assignment', async () => {
      const created = await createCategory(testCategoryInput);

      const updateInput: UpdateCategoryInput = {
        id: created.id,
        parent_id: created.id
      };

      await expect(updateCategory(updateInput)).rejects.toThrow(/Category cannot be its own parent/);
    });

    it('should throw error for circular reference', async () => {
      const parentCategory = await createCategory(testCategoryInput);
      const childCategory = await createCategory({
        name: 'Child Category',
        slug: 'child-category',
        parent_id: parentCategory.id
      });

      // Try to make parent a child of its own child (circular reference)
      const updateInput: UpdateCategoryInput = {
        id: parentCategory.id,
        parent_id: childCategory.id
      };

      await expect(updateCategory(updateInput)).rejects.toThrow(/would create circular reference/);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category and return true', async () => {
      const created = await createCategory(testCategoryInput);

      const result = await deleteCategory(created.id);

      expect(result).toBe(true);

      // Verify category is deleted
      const deletedCategory = await getCategoryById(created.id);
      expect(deletedCategory).toBeNull();
    });

    it('should throw error for non-existent category', async () => {
      await expect(deleteCategory(999)).rejects.toThrow(/Category with ID 999 not found/);
    });

    it('should update child categories to have no parent', async () => {
      const parentCategory = await createCategory(testCategoryInput);
      const childCategory = await createCategory({
        name: 'Child Category',
        slug: 'child-category',
        parent_id: parentCategory.id
      });

      await deleteCategory(parentCategory.id);

      const updatedChild = await getCategoryById(childCategory.id);
      expect(updatedChild).not.toBeNull();
      expect(updatedChild!.parent_id).toBeNull();
    });

    it('should update posts to have no category', async () => {
      // First create a user for the post
      const user = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          username: 'testuser',
          password_hash: 'hashedpassword',
          first_name: 'Test',
          last_name: 'User',
          role: 'author'
        })
        .returning()
        .execute();

      const created = await createCategory(testCategoryInput);

      // Create a post with this category
      const post = await db.insert(postsTable)
        .values({
          title: 'Test Post',
          slug: 'test-post',
          content: 'Test content',
          author_id: user[0].id,
          category_id: created.id,
          status: 'published'
        })
        .returning()
        .execute();

      await deleteCategory(created.id);

      // Check that post's category_id is now null
      const updatedPosts = await db.select()
        .from(postsTable)
        .where(eq(postsTable.id, post[0].id))
        .execute();

      expect(updatedPosts[0].category_id).toBeNull();
    });
  });

  describe('getCategoryTree', () => {
    it('should return empty array when no categories exist', async () => {
      const result = await getCategoryTree();
      expect(result).toEqual([]);
    });

    it('should return flat structure for categories without parents', async () => {
      await createCategory(testCategoryInput);
      await createCategory({
        name: 'Sports',
        slug: 'sports'
      });

      const result = await getCategoryTree();

      expect(result).toHaveLength(2);
      expect(result.map(c => c.name)).toContain('Technology');
      expect(result.map(c => c.name)).toContain('Sports');
    });

    it('should return hierarchical structure with nested children', async () => {
      const parentCategory = await createCategory(testCategoryInput);
      await createCategory({
        name: 'Web Development',
        slug: 'web-development',
        parent_id: parentCategory.id
      });
      await createCategory({
        name: 'Mobile Development',
        slug: 'mobile-development',
        parent_id: parentCategory.id
      });

      const result = await getCategoryTree();

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Technology');
      
      const techCategory = result[0] as any;
      expect(techCategory.children).toHaveLength(2);
      expect(techCategory.children.map((c: any) => c.name)).toContain('Web Development');
      expect(techCategory.children.map((c: any) => c.name)).toContain('Mobile Development');
    });

    it('should handle multi-level hierarchy', async () => {
      const parentCategory = await createCategory(testCategoryInput);
      const webDevCategory = await createCategory({
        name: 'Web Development',
        slug: 'web-development',
        parent_id: parentCategory.id
      });
      await createCategory({
        name: 'Frontend',
        slug: 'frontend',
        parent_id: webDevCategory.id
      });

      const result = await getCategoryTree();

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Technology');
      
      const techCategory = result[0] as any;
      expect(techCategory.children).toHaveLength(1);
      expect(techCategory.children[0].name).toEqual('Web Development');
      expect(techCategory.children[0].children).toHaveLength(1);
      expect(techCategory.children[0].children[0].name).toEqual('Frontend');
    });
  });
});