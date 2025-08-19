import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  postsTable, 
  categoriesTable, 
  tagsTable, 
  postTagsTable 
} from '../db/schema';
import { 
  searchPosts, 
  searchSuggestions, 
  getSearchAnalytics,
  indexPostForSearch,
  removePostFromSearchIndex,
  rebuildSearchIndex 
} from '../handlers/search';
import { type SearchPostsInput, type Post } from '../schema';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'author@test.com',
  username: 'testauthor',
  password_hash: 'hashed_password',
  first_name: 'Test',
  last_name: 'Author',
  role: 'author' as const
};

const testCategory = {
  name: 'Technology',
  slug: 'technology',
  description: 'Tech articles'
};

const testTag1 = {
  name: 'JavaScript',
  slug: 'javascript',
  description: 'JS articles'
};

const testTag2 = {
  name: 'React',
  slug: 'react',
  description: 'React articles'
};

const testPost1 = {
  title: 'Introduction to JavaScript',
  slug: 'intro-to-javascript',
  content: 'This is a comprehensive guide to JavaScript programming language.',
  excerpt: 'Learn the basics of JavaScript',
  status: 'published' as const,
  author_id: 1,
  category_id: 1
};

const testPost2 = {
  title: 'Advanced React Patterns',
  slug: 'advanced-react-patterns',
  content: 'Deep dive into React hooks and advanced patterns for building scalable applications.',
  excerpt: 'Master React development',
  status: 'published' as const,
  author_id: 1,
  category_id: 1
};

const testPost3 = {
  title: 'Database Design Principles',
  slug: 'database-design',
  content: 'Understanding relational database design and normalization principles.',
  excerpt: 'Learn database fundamentals',
  status: 'draft' as const,
  author_id: 1,
  category_id: 1
};

describe('searchPosts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();
    const [tag1] = await db.insert(tagsTable).values(testTag1).returning().execute();
    const [tag2] = await db.insert(tagsTable).values(testTag2).returning().execute();

    const [post1] = await db.insert(postsTable).values({
      ...testPost1,
      author_id: user.id,
      category_id: category.id
    }).returning().execute();

    const [post2] = await db.insert(postsTable).values({
      ...testPost2,
      author_id: user.id,
      category_id: category.id
    }).returning().execute();

    const [post3] = await db.insert(postsTable).values({
      ...testPost3,
      author_id: user.id,
      category_id: category.id
    }).returning().execute();

    // Associate tags with posts
    await db.insert(postTagsTable).values([
      { post_id: post1.id, tag_id: tag1.id },
      { post_id: post2.id, tag_id: tag2.id }
    ]).execute();
  });

  it('should search posts by text query', async () => {
    const input: SearchPostsInput = {
      query: 'JavaScript',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await searchPosts(input);

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toEqual('Introduction to JavaScript');
    expect(result.pagination.total).toEqual(1);
    expect(result.pagination.page).toEqual(1);
    expect(result.pagination.has_prev).toBe(false);
    expect(result.pagination.has_next).toBe(false);
  });

  it('should search posts by content', async () => {
    const input: SearchPostsInput = {
      query: 'React hooks',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await searchPosts(input);

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toEqual('Advanced React Patterns');
  });

  it('should filter posts by category', async () => {
    const input: SearchPostsInput = {
      category_id: 1,
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await searchPosts(input);

    // Should return 2 published posts (draft post excluded by default in search)
    expect(result.posts.length).toBeGreaterThanOrEqual(2);
    result.posts.forEach(post => {
      expect(post.category_id).toEqual(1);
    });
  });

  it('should filter posts by author', async () => {
    const input: SearchPostsInput = {
      author_id: 1,
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await searchPosts(input);

    expect(result.posts.length).toBeGreaterThanOrEqual(2);
    result.posts.forEach(post => {
      expect(post.author_id).toEqual(1);
    });
  });

  it('should filter posts by status', async () => {
    const input: SearchPostsInput = {
      status: 'published',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await searchPosts(input);

    expect(result.posts.length).toBeGreaterThanOrEqual(2);
    result.posts.forEach(post => {
      expect(post.status).toEqual('published');
    });
  });

  it('should filter posts by tags', async () => {
    const input: SearchPostsInput = {
      tag_ids: [1], // JavaScript tag
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await searchPosts(input);

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toEqual('Introduction to JavaScript');
  });

  it('should handle pagination correctly', async () => {
    const input: SearchPostsInput = {
      page: 1,
      limit: 1,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await searchPosts(input);

    expect(result.posts).toHaveLength(1);
    expect(result.pagination.limit).toEqual(1);
    expect(result.pagination.total).toBeGreaterThanOrEqual(2);
    expect(result.pagination.total_pages).toBeGreaterThanOrEqual(2);
    expect(result.pagination.has_next).toBe(true);
  });

  it('should sort posts by different fields', async () => {
    const input: SearchPostsInput = {
      page: 1,
      limit: 10,
      sort_by: 'title',
      sort_order: 'asc'
    };

    const result = await searchPosts(input);

    expect(result.posts.length).toBeGreaterThanOrEqual(2);
    
    // Check if titles are sorted alphabetically
    for (let i = 1; i < result.posts.length; i++) {
      expect(result.posts[i].title >= result.posts[i - 1].title).toBe(true);
    }
  });

  it('should return empty results for no matches', async () => {
    const input: SearchPostsInput = {
      query: 'nonexistent content',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await searchPosts(input);

    expect(result.posts).toHaveLength(0);
    expect(result.pagination.total).toEqual(0);
    expect(result.pagination.total_pages).toEqual(0);
  });
});

describe('searchSuggestions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();
    await db.insert(tagsTable).values([testTag1, testTag2]).execute();

    await db.insert(postsTable).values([
      { ...testPost1, author_id: user.id, category_id: category.id },
      { ...testPost2, author_id: user.id, category_id: category.id }
    ]).execute();
  });

  it('should return post title suggestions', async () => {
    const suggestions = await searchSuggestions('JavaScript', 5);

    expect(suggestions).toContain('Introduction to JavaScript');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });

  it('should return tag suggestions', async () => {
    const suggestions = await searchSuggestions('Java', 5);

    expect(suggestions).toContain('JavaScript');
  });

  it('should return category suggestions', async () => {
    const suggestions = await searchSuggestions('Tech', 5);

    expect(suggestions).toContain('Technology');
  });

  it('should limit results correctly', async () => {
    const suggestions = await searchSuggestions('a', 2);

    expect(suggestions.length).toBeLessThanOrEqual(2);
  });

  it('should return empty array for empty query', async () => {
    const suggestions = await searchSuggestions('', 5);

    expect(suggestions).toEqual([]);
  });

  it('should return empty array for whitespace query', async () => {
    const suggestions = await searchSuggestions('   ', 5);

    expect(suggestions).toEqual([]);
  });
});

describe('getSearchAnalytics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();

    await db.insert(postsTable).values([
      { ...testPost1, author_id: user.id, category_id: category.id },
      { ...testPost2, author_id: user.id, category_id: category.id }
    ]).execute();
  });

  it('should return search analytics data', async () => {
    const analytics = await getSearchAnalytics();

    expect(Array.isArray(analytics)).toBe(true);
    expect(analytics.length).toBeGreaterThan(0);
    
    analytics.forEach(item => {
      expect(typeof item.query).toBe('string');
      expect(typeof item.count).toBe('number');
      expect(item.last_searched).toBeInstanceOf(Date);
    });
  });

  it('should limit results to reasonable number', async () => {
    const analytics = await getSearchAnalytics();

    expect(analytics.length).toBeLessThanOrEqual(10);
  });
});

describe('indexPostForSearch', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();

    await db.insert(postsTable).values({
      ...testPost1,
      author_id: user.id,
      category_id: category.id
    }).execute();
  });

  it('should successfully index existing post', async () => {
    const [post] = await db.select().from(postsTable).limit(1).execute();
    
    const result = await indexPostForSearch(post as Post);

    expect(result).toBe(true);
  });

  it('should handle non-existent post', async () => {
    const fakePost: Post = {
      id: 99999,
      title: 'Non-existent',
      slug: 'non-existent',
      excerpt: null,
      content: 'content',
      status: 'published',
      featured_image_id: null,
      author_id: 1,
      category_id: null,
      meta_title: null,
      meta_description: null,
      canonical_url: null,
      published_at: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await indexPostForSearch(fakePost);

    expect(result).toBe(false);
  });
});

describe('removePostFromSearchIndex', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();

    await db.insert(postsTable).values({
      ...testPost1,
      author_id: user.id,
      category_id: category.id
    }).execute();
  });

  it('should successfully remove existing post from index', async () => {
    const [post] = await db.select().from(postsTable).limit(1).execute();
    
    const result = await removePostFromSearchIndex(post.id);

    expect(result).toBe(true);
  });

  it('should handle non-existent post removal', async () => {
    const result = await removePostFromSearchIndex(99999);

    expect(result).toBe(false);
  });
});

describe('rebuildSearchIndex', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();

    await db.insert(postsTable).values([
      { ...testPost1, author_id: user.id, category_id: category.id },
      { ...testPost2, author_id: user.id, category_id: category.id }
    ]).execute();
  });

  it('should successfully rebuild index when posts exist', async () => {
    const result = await rebuildSearchIndex();

    expect(result).toBe(true);
  });

  it('should handle empty database', async () => {
    // Clear all posts
    await db.delete(postsTable).execute();

    const result = await rebuildSearchIndex();

    expect(result).toBe(false);
  });
});