import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable, usersTable, categoriesTable, tagsTable, postTagsTable } from '../db/schema';
import { type SearchPostsInput } from '../schema';
import { getPosts } from '../handlers/posts';
import { eq } from 'drizzle-orm';

describe('getPosts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty results when no posts exist', async () => {
    const input: SearchPostsInput = {
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getPosts(input);

    expect(result.posts).toHaveLength(0);
    expect(result.pagination.total).toEqual(0);
    expect(result.pagination.total_pages).toEqual(0);
    expect(result.pagination.has_prev).toBe(false);
    expect(result.pagination.has_next).toBe(false);
  });

  it('should return all posts with basic pagination', async () => {
    // Create prerequisite user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      })
      .returning()
      .execute();

    // Create test posts one by one to ensure different timestamps
    const [post1] = await db.insert(postsTable)
      .values({
        title: 'First Post',
        slug: 'first-post',
        content: 'Content of first post',
        author_id: user.id,
        status: 'published'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    const [post2] = await db.insert(postsTable)
      .values({
        title: 'Second Post',
        slug: 'second-post',
        content: 'Content of second post',
        author_id: user.id,
        status: 'published'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    const [post3] = await db.insert(postsTable)
      .values({
        title: 'Third Post',
        slug: 'third-post',
        content: 'Content of third post',
        author_id: user.id,
        status: 'draft'
      })
      .returning()
      .execute();

    const input: SearchPostsInput = {
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getPosts(input);

    expect(result.posts).toHaveLength(3);
    expect(result.pagination.total).toEqual(3);
    expect(result.pagination.total_pages).toEqual(1);
    expect(result.pagination.has_prev).toBe(false);
    expect(result.pagination.has_next).toBe(false);
    
    // Verify posts are returned (order may vary due to same timestamps)
    const titles = result.posts.map(p => p.title);
    expect(titles).toContain('First Post');
    expect(titles).toContain('Second Post');
    expect(titles).toContain('Third Post');
    
    // Verify that the most recently created post appears first when sorted by created_at desc
    expect(result.posts[0].created_at.getTime()).toBeGreaterThanOrEqual(result.posts[1].created_at.getTime());
    expect(result.posts[1].created_at.getTime()).toBeGreaterThanOrEqual(result.posts[2].created_at.getTime());
  });

  it('should filter posts by text query', async () => {
    // Create prerequisite user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      })
      .returning()
      .execute();

    // Create posts with different content
    await db.insert(postsTable)
      .values([
        {
          title: 'JavaScript Tutorial',
          slug: 'js-tutorial',
          content: 'Learn JavaScript programming',
          author_id: user.id,
          status: 'published'
        },
        {
          title: 'Python Guide',
          slug: 'python-guide',
          content: 'Python programming basics',
          author_id: user.id,
          status: 'published'
        },
        {
          title: 'Web Development',
          slug: 'web-dev',
          content: 'Complete guide to web development',
          excerpt: 'JavaScript and Python are popular languages',
          author_id: user.id,
          status: 'published'
        }
      ])
      .execute();

    const input: SearchPostsInput = {
      query: 'JavaScript',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getPosts(input);

    expect(result.posts).toHaveLength(2);
    expect(result.posts.some(p => p.title === 'JavaScript Tutorial')).toBe(true);
    expect(result.posts.some(p => p.title === 'Web Development')).toBe(true);
    expect(result.posts.some(p => p.title === 'Python Guide')).toBe(false);
  });

  it('should filter posts by status', async () => {
    // Create prerequisite user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      })
      .returning()
      .execute();

    // Create posts with different statuses
    await db.insert(postsTable)
      .values([
        {
          title: 'Published Post',
          slug: 'published-post',
          content: 'Published content',
          author_id: user.id,
          status: 'published'
        },
        {
          title: 'Draft Post',
          slug: 'draft-post',
          content: 'Draft content',
          author_id: user.id,
          status: 'draft'
        },
        {
          title: 'Archived Post',
          slug: 'archived-post',
          content: 'Archived content',
          author_id: user.id,
          status: 'archived'
        }
      ])
      .execute();

    const input: SearchPostsInput = {
      status: 'published',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getPosts(input);

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toEqual('Published Post');
    expect(result.posts[0].status).toEqual('published');
  });

  it('should filter posts by author', async () => {
    // Create multiple users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'author1@example.com',
        username: 'author1',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'author2@example.com',
        username: 'author2',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'author'
      })
      .returning()
      .execute();

    // Create posts by different authors
    await db.insert(postsTable)
      .values([
        {
          title: 'Post by Author 1',
          slug: 'post-by-author-1',
          content: 'Content by author 1',
          author_id: user1.id,
          status: 'published'
        },
        {
          title: 'Post by Author 2',
          slug: 'post-by-author-2',
          content: 'Content by author 2',
          author_id: user2.id,
          status: 'published'
        },
        {
          title: 'Another Post by Author 1',
          slug: 'another-post-by-author-1',
          content: 'More content by author 1',
          author_id: user1.id,
          status: 'published'
        }
      ])
      .execute();

    const input: SearchPostsInput = {
      author_id: user1.id,
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getPosts(input);

    expect(result.posts).toHaveLength(2);
    expect(result.posts.every(p => p.author_id === user1.id)).toBe(true);
  });

  it('should filter posts by category', async () => {
    // Create prerequisite user and category
    const [user] = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      })
      .returning()
      .execute();

    const [category1] = await db.insert(categoriesTable)
      .values({
        name: 'Technology',
        slug: 'technology'
      })
      .returning()
      .execute();

    const [category2] = await db.insert(categoriesTable)
      .values({
        name: 'Lifestyle',
        slug: 'lifestyle'
      })
      .returning()
      .execute();

    // Create posts in different categories
    await db.insert(postsTable)
      .values([
        {
          title: 'Tech Post',
          slug: 'tech-post',
          content: 'Technology content',
          author_id: user.id,
          category_id: category1.id,
          status: 'published'
        },
        {
          title: 'Lifestyle Post',
          slug: 'lifestyle-post',
          content: 'Lifestyle content',
          author_id: user.id,
          category_id: category2.id,
          status: 'published'
        },
        {
          title: 'Uncategorized Post',
          slug: 'uncategorized-post',
          content: 'Uncategorized content',
          author_id: user.id,
          status: 'published'
        }
      ])
      .execute();

    const input: SearchPostsInput = {
      category_id: category1.id,
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getPosts(input);

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toEqual('Tech Post');
    expect(result.posts[0].category_id).toEqual(category1.id);
  });

  it('should filter posts by tags', async () => {
    // Create prerequisite user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      })
      .returning()
      .execute();

    // Create tags
    const [tag1] = await db.insert(tagsTable)
      .values({
        name: 'JavaScript',
        slug: 'javascript'
      })
      .returning()
      .execute();

    const [tag2] = await db.insert(tagsTable)
      .values({
        name: 'Python',
        slug: 'python'
      })
      .returning()
      .execute();

    // Create posts
    const [post1] = await db.insert(postsTable)
      .values({
        title: 'JS Post',
        slug: 'js-post',
        content: 'JavaScript content',
        author_id: user.id,
        status: 'published'
      })
      .returning()
      .execute();

    const [post2] = await db.insert(postsTable)
      .values({
        title: 'Python Post',
        slug: 'python-post',
        content: 'Python content',
        author_id: user.id,
        status: 'published'
      })
      .returning()
      .execute();

    const [post3] = await db.insert(postsTable)
      .values({
        title: 'Mixed Post',
        slug: 'mixed-post',
        content: 'Mixed content',
        author_id: user.id,
        status: 'published'
      })
      .returning()
      .execute();

    // Create post-tag associations
    await db.insert(postTagsTable)
      .values([
        { post_id: post1.id, tag_id: tag1.id },
        { post_id: post2.id, tag_id: tag2.id },
        { post_id: post3.id, tag_id: tag1.id },
        { post_id: post3.id, tag_id: tag2.id }
      ])
      .execute();

    const input: SearchPostsInput = {
      tag_ids: [tag1.id],
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getPosts(input);

    expect(result.posts).toHaveLength(2);
    expect(result.posts.some(p => p.title === 'JS Post')).toBe(true);
    expect(result.posts.some(p => p.title === 'Mixed Post')).toBe(true);
    expect(result.posts.some(p => p.title === 'Python Post')).toBe(false);
  });

  it('should handle pagination correctly', async () => {
    // Create prerequisite user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      })
      .returning()
      .execute();

    // Create 5 posts
    const postPromises = [];
    for (let i = 1; i <= 5; i++) {
      postPromises.push(
        db.insert(postsTable)
          .values({
            title: `Post ${i}`,
            slug: `post-${i}`,
            content: `Content ${i}`,
            author_id: user.id,
            status: 'published'
          })
          .execute()
      );
    }
    await Promise.all(postPromises);

    // Test first page
    const page1Input: SearchPostsInput = {
      page: 1,
      limit: 2,
      sort_by: 'created_at',
      sort_order: 'asc'
    };

    const page1Result = await getPosts(page1Input);

    expect(page1Result.posts).toHaveLength(2);
    expect(page1Result.pagination.total).toEqual(5);
    expect(page1Result.pagination.total_pages).toEqual(3);
    expect(page1Result.pagination.has_prev).toBe(false);
    expect(page1Result.pagination.has_next).toBe(true);

    // Test second page
    const page2Input: SearchPostsInput = {
      page: 2,
      limit: 2,
      sort_by: 'created_at',
      sort_order: 'asc'
    };

    const page2Result = await getPosts(page2Input);

    expect(page2Result.posts).toHaveLength(2);
    expect(page2Result.pagination.has_prev).toBe(true);
    expect(page2Result.pagination.has_next).toBe(true);

    // Test last page
    const page3Input: SearchPostsInput = {
      page: 3,
      limit: 2,
      sort_by: 'created_at',
      sort_order: 'asc'
    };

    const page3Result = await getPosts(page3Input);

    expect(page3Result.posts).toHaveLength(1);
    expect(page3Result.pagination.has_prev).toBe(true);
    expect(page3Result.pagination.has_next).toBe(false);
  });

  it('should sort posts correctly', async () => {
    // Create prerequisite user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      })
      .returning()
      .execute();

    // Create posts with different titles and dates
    await db.insert(postsTable)
      .values([
        {
          title: 'Apple Post',
          slug: 'apple-post',
          content: 'Apple content',
          author_id: user.id,
          status: 'published'
        },
        {
          title: 'Zebra Post',
          slug: 'zebra-post',
          content: 'Zebra content',
          author_id: user.id,
          status: 'published'
        },
        {
          title: 'Bear Post',
          slug: 'bear-post',
          content: 'Bear content',
          author_id: user.id,
          status: 'published'
        }
      ])
      .execute();

    // Test sorting by title ascending
    const titleAscInput: SearchPostsInput = {
      page: 1,
      limit: 10,
      sort_by: 'title',
      sort_order: 'asc'
    };

    const titleAscResult = await getPosts(titleAscInput);

    expect(titleAscResult.posts).toHaveLength(3);
    expect(titleAscResult.posts[0].title).toEqual('Apple Post');
    expect(titleAscResult.posts[1].title).toEqual('Bear Post');
    expect(titleAscResult.posts[2].title).toEqual('Zebra Post');

    // Test sorting by title descending
    const titleDescInput: SearchPostsInput = {
      page: 1,
      limit: 10,
      sort_by: 'title',
      sort_order: 'desc'
    };

    const titleDescResult = await getPosts(titleDescInput);

    expect(titleDescResult.posts).toHaveLength(3);
    expect(titleDescResult.posts[0].title).toEqual('Zebra Post');
    expect(titleDescResult.posts[1].title).toEqual('Bear Post');
    expect(titleDescResult.posts[2].title).toEqual('Apple Post');
  });

  it('should combine multiple filters correctly', async () => {
    // Create prerequisite user and category
    const [user] = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      })
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Technology',
        slug: 'technology'
      })
      .returning()
      .execute();

    // Create posts with different combinations of attributes
    await db.insert(postsTable)
      .values([
        {
          title: 'JavaScript Guide',
          slug: 'js-guide',
          content: 'JavaScript programming guide',
          author_id: user.id,
          category_id: category.id,
          status: 'published'
        },
        {
          title: 'Python Guide',
          slug: 'python-guide',
          content: 'Python programming guide',
          author_id: user.id,
          category_id: category.id,
          status: 'draft'
        },
        {
          title: 'JavaScript Tutorial',
          slug: 'js-tutorial',
          content: 'JavaScript tutorial',
          author_id: user.id,
          status: 'published'
        }
      ])
      .execute();

    const input: SearchPostsInput = {
      query: 'JavaScript',
      category_id: category.id,
      status: 'published',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getPosts(input);

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toEqual('JavaScript Guide');
    expect(result.posts[0].category_id).toEqual(category.id);
    expect(result.posts[0].status).toEqual('published');
  });
});