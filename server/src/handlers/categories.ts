import { db } from '../db';
import { categoriesTable, postsTable } from '../db/schema';
import { type CreateCategoryInput, type UpdateCategoryInput, type Category } from '../schema';
import { eq, isNull, SQL } from 'drizzle-orm';

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  try {
    // Validate parent category exists if provided
    if (input.parent_id) {
      const parentCategory = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.parent_id))
        .execute();
      
      if (parentCategory.length === 0) {
        throw new Error(`Parent category with ID ${input.parent_id} does not exist`);
      }
    }

    // Insert category record
    const result = await db.insert(categoriesTable)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        parent_id: input.parent_id || null,
        meta_title: input.meta_title || null,
        meta_description: input.meta_description || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category creation failed:', error);
    throw error;
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const result = await db.select()
      .from(categoriesTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Categories fetch failed:', error);
    throw error;
  }
}

export async function getCategoryById(id: number): Promise<Category | null> {
  try {
    const result = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Category fetch by ID failed:', error);
    throw error;
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const result = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, slug))
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Category fetch by slug failed:', error);
    throw error;
  }
}

export async function updateCategory(input: UpdateCategoryInput): Promise<Category> {
  try {
    // Validate category exists
    const existingCategory = await getCategoryById(input.id);
    if (!existingCategory) {
      throw new Error(`Category with ID ${input.id} not found`);
    }

    // Validate parent category exists if provided
    if (input.parent_id !== undefined && input.parent_id !== null) {
      if (input.parent_id === input.id) {
        throw new Error('Category cannot be its own parent');
      }

      const parentCategory = await getCategoryById(input.parent_id);
      if (!parentCategory) {
        throw new Error(`Parent category with ID ${input.parent_id} does not exist`);
      }

      // Check for circular reference by checking if the new parent is a descendant
      const descendants = await getCategoryDescendants(input.id);
      const descendantIds = descendants.map(d => d.id);
      if (descendantIds.includes(input.parent_id)) {
        throw new Error('Cannot set parent category: would create circular reference');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.parent_id !== undefined) updateData.parent_id = input.parent_id;
    if (input.meta_title !== undefined) updateData.meta_title = input.meta_title;
    if (input.meta_description !== undefined) updateData.meta_description = input.meta_description;

    const result = await db.update(categoriesTable)
      .set(updateData)
      .where(eq(categoriesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category update failed:', error);
    throw error;
  }
}

export async function deleteCategory(id: number): Promise<boolean> {
  try {
    // Validate category exists
    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      throw new Error(`Category with ID ${id} not found`);
    }

    // Update any posts using this category to have no category
    await db.update(postsTable)
      .set({ category_id: null })
      .where(eq(postsTable.category_id, id))
      .execute();

    // Update any child categories to have no parent
    await db.update(categoriesTable)
      .set({ parent_id: null })
      .where(eq(categoriesTable.parent_id, id))
      .execute();

    // Delete the category
    await db.delete(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
}

export async function getCategoryTree(): Promise<Category[]> {
  try {
    // Get all categories
    const allCategories = await getCategories();
    
    // Build a tree structure
    const categoryMap = new Map<number, Category & { children?: Category[] }>();
    const rootCategories: Category[] = [];

    // First, create a map of all categories
    for (const category of allCategories) {
      categoryMap.set(category.id, { ...category, children: [] });
    }

    // Then, organize them into a tree structure
    for (const category of allCategories) {
      const categoryWithChildren = categoryMap.get(category.id)!;
      
      if (category.parent_id === null) {
        // Root level category
        rootCategories.push(categoryWithChildren);
      } else {
        // Child category - add to parent's children array
        const parent = categoryMap.get(category.parent_id);
        if (parent && parent.children) {
          parent.children.push(categoryWithChildren);
        }
      }
    }

    return rootCategories;
  } catch (error) {
    console.error('Category tree fetch failed:', error);
    throw error;
  }
}

// Helper function to get all descendants of a category (for circular reference checking)
async function getCategoryDescendants(categoryId: number): Promise<Category[]> {
  try {
    const descendants: Category[] = [];
    const toProcess = [categoryId];
    const processed = new Set<number>();

    while (toProcess.length > 0) {
      const currentId = toProcess.shift()!;
      if (processed.has(currentId)) continue;
      
      processed.add(currentId);

      // Get direct children
      const children = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.parent_id, currentId))
        .execute();

      for (const child of children) {
        descendants.push(child);
        toProcess.push(child.id);
      }
    }

    return descendants;
  } catch (error) {
    console.error('Get category descendants failed:', error);
    throw error;
  }
}