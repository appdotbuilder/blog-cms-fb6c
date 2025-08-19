import { db } from '../db';
import { 
  postsTable, 
  usersTable, 
  categoriesTable, 
  tagsTable, 
  postTagsTable,
  mediaTable 
} from '../db/schema';
import { type SearchPostsInput, type PostsResponse, type Post } from '../schema';
import { 
  sql, 
  eq, 
  and, 
  or, 
  inArray, 
  count, 
  desc, 
  asc, 
  ilike, 
  type SQL 
} from 'drizzle-orm';

export async function searchPosts(input: SearchPostsInput): Promise<PostsResponse> {
  try {
    // Calculate offset for pagination
    const offset = (input.page - 1) * input.limit;

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Text search across multiple fields
    if (input.query) {
      const searchPattern = `%${input.query}%`;
      conditions.push(
        or(
          ilike(postsTable.title, searchPattern),
          ilike(postsTable.content, searchPattern),
          ilike(postsTable.excerpt, searchPattern)
        )!
      );
    }

    // Filter by category
    if (input.category_id) {
      conditions.push(eq(postsTable.category_id, input.category_id));
    }

    // Filter by author
    if (input.author_id) {
      conditions.push(eq(postsTable.author_id, input.author_id));
    }

    // Filter by status
    if (input.status) {
      conditions.push(eq(postsTable.status, input.status));
    }

    // Filter by tags - need to join with post_tags table
    if (input.tag_ids && input.tag_ids.length > 0) {
      // Use subquery to find posts with matching tags
      const postsWithTags = db
        .select({ post_id: postTagsTable.post_id })
        .from(postTagsTable)
        .where(inArray(postTagsTable.tag_id, input.tag_ids));

      conditions.push(
        inArray(postsTable.id, postsWithTags)
      );
    }

    // Determine sort direction
    const sortColumn = postsTable[input.sort_by];
    const sortOrder = input.sort_order === 'desc' ? desc(sortColumn) : asc(sortColumn);

    // Build and execute main query
    const baseQuery = db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        slug: postsTable.slug,
        excerpt: postsTable.excerpt,
        content: postsTable.content,
        status: postsTable.status,
        featured_image_id: postsTable.featured_image_id,
        author_id: postsTable.author_id,
        category_id: postsTable.category_id,
        meta_title: postsTable.meta_title,
        meta_description: postsTable.meta_description,
        canonical_url: postsTable.canonical_url,
        published_at: postsTable.published_at,
        created_at: postsTable.created_at,
        updated_at: postsTable.updated_at
      })
      .from(postsTable);

    // Execute query with conditions
    const posts = conditions.length > 0
      ? await baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(sortOrder)
          .limit(input.limit)
          .offset(offset)
          .execute()
      : await baseQuery
          .orderBy(sortOrder)
          .limit(input.limit)
          .offset(offset)
          .execute();

    // Get total count for pagination
    const countQuery = db
      .select({ count: count() })
      .from(postsTable);

    const [{ count: total }] = conditions.length > 0
      ? await countQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await countQuery.execute();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / input.limit);
    const hasPrev = input.page > 1;
    const hasNext = input.page < totalPages;

    return {
      posts,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        total_pages: totalPages,
        has_prev: hasPrev,
        has_next: hasNext
      }
    };
  } catch (error) {
    console.error('Search posts failed:', error);
    throw error;
  }
}

export async function searchSuggestions(query: string, limit: number = 5): Promise<string[]> {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchPattern = `%${query.trim()}%`;
    const suggestions = new Set<string>();

    // Get title suggestions from posts
    const titleSuggestions = await db
      .select({ title: postsTable.title })
      .from(postsTable)
      .where(
        and(
          ilike(postsTable.title, searchPattern),
          eq(postsTable.status, 'published')
        )
      )
      .limit(limit)
      .execute();

    titleSuggestions.forEach(post => {
      if (suggestions.size < limit) {
        suggestions.add(post.title);
      }
    });

    // Get tag suggestions if we still have space
    if (suggestions.size < limit) {
      const tagSuggestions = await db
        .select({ name: tagsTable.name })
        .from(tagsTable)
        .where(ilike(tagsTable.name, searchPattern))
        .limit(limit - suggestions.size)
        .execute();

      tagSuggestions.forEach(tag => {
        if (suggestions.size < limit) {
          suggestions.add(tag.name);
        }
      });
    }

    // Get category suggestions if we still have space
    if (suggestions.size < limit) {
      const categorySuggestions = await db
        .select({ name: categoriesTable.name })
        .from(categoriesTable)
        .where(ilike(categoriesTable.name, searchPattern))
        .limit(limit - suggestions.size)
        .execute();

      categorySuggestions.forEach(category => {
        if (suggestions.size < limit) {
          suggestions.add(category.name);
        }
      });
    }

    return Array.from(suggestions).slice(0, limit);
  } catch (error) {
    console.error('Search suggestions failed:', error);
    throw error;
  }
}

export async function getSearchAnalytics(): Promise<Array<{ query: string; count: number; last_searched: Date }>> {
  try {
    // This would typically require a separate search_analytics table to track searches
    // For now, we'll return popular post titles as a proxy for search analytics
    const popularPosts = await db
      .select({
        query: postsTable.title,
        count: sql<number>`1`, // Placeholder - would be actual search count
        last_searched: postsTable.updated_at
      })
      .from(postsTable)
      .where(eq(postsTable.status, 'published'))
      .orderBy(desc(postsTable.updated_at))
      .limit(10)
      .execute();

    return popularPosts.map(post => ({
      query: post.query,
      count: 1, // Placeholder value
      last_searched: post.last_searched
    }));
  } catch (error) {
    console.error('Get search analytics failed:', error);
    throw error;
  }
}

export async function indexPostForSearch(post: Post): Promise<boolean> {
  try {
    // In a real implementation, this would update a search index
    // For now, we'll verify the post exists and is searchable
    const existingPost = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    return existingPost.length > 0;
  } catch (error) {
    console.error('Index post for search failed:', error);
    throw error;
  }
}

export async function removePostFromSearchIndex(postId: number): Promise<boolean> {
  try {
    // In a real implementation, this would remove from search index
    // For now, we'll verify the post exists
    const existingPost = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    return existingPost.length > 0;
  } catch (error) {
    console.error('Remove post from search index failed:', error);
    throw error;
  }
}

export async function rebuildSearchIndex(): Promise<boolean> {
  try {
    // In a real implementation, this would rebuild the entire search index
    // For now, we'll count all published posts as a verification
    const [{ count: totalPosts }] = await db
      .select({ count: count() })
      .from(postsTable)
      .where(eq(postsTable.status, 'published'))
      .execute();

    // Return true if we have posts to index
    return totalPosts > 0;
  } catch (error) {
    console.error('Rebuild search index failed:', error);
    throw error;
  }
}