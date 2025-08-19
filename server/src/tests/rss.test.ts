import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, tagsTable, postsTable, postTagsTable } from '../db/schema';
import { type CreateUserInput, type CreateCategoryInput, type CreateTagInput, type CreatePostInput, type RssConfig } from '../schema';
import { 
  generateRSSFeed, 
  generateAtomFeed, 
  generateCategoryRSSFeed, 
  generateTagRSSFeed, 
  generateAuthorRSSFeed 
} from '../handlers/rss';

// Test data setup
const testUser: CreateUserInput = {
  email: 'author@example.com',
  username: 'testauthor',
  password: 'password123',
  first_name: 'Test',
  last_name: 'Author',
  role: 'author'
};

const testCategory: CreateCategoryInput = {
  name: 'Technology',
  slug: 'technology',
  description: 'Tech articles'
};

const testTag: CreateTagInput = {
  name: 'JavaScript',
  slug: 'javascript',
  description: 'JavaScript programming'
};

const testRssConfig: RssConfig = {
  title: 'Test Blog',
  description: 'A test blog for RSS feeds',
  link: 'https://testblog.com',
  language: 'en',
  copyright: '2024 Test Blog',
  managingEditor: 'editor@testblog.com',
  webMaster: 'webmaster@testblog.com'
};

describe('RSS Feed Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let categoryId: number;
  let tagId: number;
  let postId: number;

  beforeEach(async () => {
    // Create test user
    const userResults = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();
    userId = userResults[0].id;

    // Create test category
    const categoryResults = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        slug: testCategory.slug,
        description: testCategory.description
      })
      .returning()
      .execute();
    categoryId = categoryResults[0].id;

    // Create test tag
    const tagResults = await db.insert(tagsTable)
      .values({
        name: testTag.name,
        slug: testTag.slug,
        description: testTag.description
      })
      .returning()
      .execute();
    tagId = tagResults[0].id;

    // Create published test post
    const postResults = await db.insert(postsTable)
      .values({
        title: 'Test Blog Post',
        slug: 'test-blog-post',
        content: 'This is a test blog post content with <strong>HTML</strong> & special characters.',
        excerpt: 'A test excerpt',
        status: 'published',
        author_id: userId,
        category_id: categoryId,
        published_at: new Date('2024-01-15T10:00:00Z')
      })
      .returning()
      .execute();
    postId = postResults[0].id;

    // Associate post with tag
    await db.insert(postTagsTable)
      .values({
        post_id: postId,
        tag_id: tagId
      })
      .execute();
  });

  describe('generateRSSFeed', () => {
    it('should generate valid RSS feed with default config', async () => {
      const rss = await generateRSSFeed();

      expect(rss).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rss).toContain('<rss version="2.0"');
      expect(rss).toContain('<title>Blog RSS Feed</title>');
      expect(rss).toContain('<description>Latest blog posts</description>');
      expect(rss).toContain('<link>https://example.com</link>');
      expect(rss).toContain('<generator>Blog CMS</generator>');
    });

    it('should generate RSS feed with custom config', async () => {
      const rss = await generateRSSFeed(testRssConfig);

      expect(rss).toContain('<title>Test Blog</title>');
      expect(rss).toContain('<description>A test blog for RSS feeds</description>');
      expect(rss).toContain('<link>https://testblog.com</link>');
      expect(rss).toContain('<copyright>2024 Test Blog</copyright>');
      expect(rss).toContain('<managingEditor>editor@testblog.com</managingEditor>');
      expect(rss).toContain('<webMaster>webmaster@testblog.com</webMaster>');
    });

    it('should include published posts in RSS feed', async () => {
      const rss = await generateRSSFeed(testRssConfig);

      expect(rss).toContain('<item>');
      expect(rss).toContain('<title>Test Blog Post</title>');
      expect(rss).toContain('<description>A test excerpt</description>');
      expect(rss).toContain('<content:encoded><![CDATA[This is a test blog post content with <strong>HTML</strong> & special characters.]]></content:encoded>');
      expect(rss).toContain('<link>https://testblog.com/posts/test-blog-post</link>');
      expect(rss).toContain('<author>author@example.com (testauthor)</author>');
      expect(rss).toContain('<pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>');
    });

    it('should properly escape XML characters', async () => {
      // Create post with special characters
      await db.insert(postsTable)
        .values({
          title: 'Post with <special> & "quoted" content',
          slug: 'special-post',
          content: 'Content with <tags> & "quotes"',
          excerpt: 'Excerpt with & characters',
          status: 'published',
          author_id: userId,
          published_at: new Date()
        })
        .execute();

      const rss = await generateRSSFeed();

      expect(rss).toContain('&lt;special&gt; &amp; &quot;quoted&quot;');
      expect(rss).not.toContain('<special>');
      expect(rss).not.toContain('& "quoted"');
    });

    it('should handle empty posts list', async () => {
      // Delete the test post
      await db.delete(postsTable).execute();

      const rss = await generateRSSFeed();

      expect(rss).toContain('<rss version="2.0"');
      expect(rss).toContain('<channel>');
      expect(rss).not.toContain('<item>');
    });
  });

  describe('generateAtomFeed', () => {
    it('should generate valid Atom feed with default config', async () => {
      const atom = await generateAtomFeed();

      expect(atom).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(atom).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
      expect(atom).toContain('<title>Blog Atom Feed</title>');
      expect(atom).toContain('<subtitle>Latest blog posts</subtitle>');
      expect(atom).toContain('<link href="https://example.com" />');
      expect(atom).toContain('<generator>Blog CMS</generator>');
    });

    it('should generate Atom feed with custom config', async () => {
      const atom = await generateAtomFeed(testRssConfig);

      expect(atom).toContain('<title>Test Blog</title>');
      expect(atom).toContain('<subtitle>A test blog for RSS feeds</subtitle>');
      expect(atom).toContain('<link href="https://testblog.com" />');
    });

    it('should include published posts in Atom feed', async () => {
      const atom = await generateAtomFeed(testRssConfig);

      expect(atom).toContain('<entry>');
      expect(atom).toContain('<title>Test Blog Post</title>');
      expect(atom).toContain('<link href="https://testblog.com/posts/test-blog-post" />');
      expect(atom).toContain('<published>2024-01-15T10:00:00.000Z</published>');
      expect(atom).toContain('<name>testauthor</name>');
      expect(atom).toContain('<email>author@example.com</email>');
      expect(atom).toContain('<summary>A test excerpt</summary>');
      expect(atom).toContain('<content type="html"><![CDATA[This is a test blog post content with <strong>HTML</strong> & special characters.]]></content>');
    });
  });

  describe('generateCategoryRSSFeed', () => {
    it('should generate RSS feed for specific category', async () => {
      const rss = await generateCategoryRSSFeed(categoryId, testRssConfig);

      expect(rss).toContain('<rss version="2.0"');
      expect(rss).toContain('<title>Technology - Category RSS Feed</title>');
      expect(rss).toContain('<description>Posts from Technology category</description>');
      expect(rss).toContain(`<link>https://testblog.com/categories/${categoryId}</link>`);
      expect(rss).toContain('<category>Technology</category>');
      expect(rss).toContain('<title>Test Blog Post</title>');
    });

    it('should throw error for non-existent category', async () => {
      await expect(generateCategoryRSSFeed(9999)).rejects.toThrow(/No posts found for category ID 9999/);
    });

    it('should handle category with no published posts', async () => {
      // Update post to draft status
      await db.update(postsTable)
        .set({ status: 'draft' })
        .execute();

      await expect(generateCategoryRSSFeed(categoryId)).rejects.toThrow(/No posts found for category ID/);
    });
  });

  describe('generateTagRSSFeed', () => {
    it('should generate RSS feed for specific tag', async () => {
      const rss = await generateTagRSSFeed(tagId, testRssConfig);

      expect(rss).toContain('<rss version="2.0"');
      expect(rss).toContain('<title>JavaScript - Tag RSS Feed</title>');
      expect(rss).toContain('<description>Posts tagged with JavaScript</description>');
      expect(rss).toContain(`<link>https://testblog.com/tags/${tagId}</link>`);
      expect(rss).toContain('<category>JavaScript</category>');
      expect(rss).toContain('<title>Test Blog Post</title>');
    });

    it('should throw error for non-existent tag', async () => {
      await expect(generateTagRSSFeed(9999)).rejects.toThrow(/No posts found for tag ID 9999/);
    });

    it('should handle tag with no published posts', async () => {
      // Update post to draft status
      await db.update(postsTable)
        .set({ status: 'draft' })
        .execute();

      await expect(generateTagRSSFeed(tagId)).rejects.toThrow(/No posts found for tag ID/);
    });
  });

  describe('generateAuthorRSSFeed', () => {
    it('should generate RSS feed for specific author', async () => {
      const rss = await generateAuthorRSSFeed(userId, testRssConfig);

      expect(rss).toContain('<rss version="2.0"');
      expect(rss).toContain('<title>testauthor - Author RSS Feed</title>');
      expect(rss).toContain('<description>Posts by testauthor</description>');
      expect(rss).toContain(`<link>https://testblog.com/authors/${userId}</link>`);
      expect(rss).toContain('<author>author@example.com (testauthor)</author>');
      expect(rss).toContain('<title>Test Blog Post</title>');
    });

    it('should throw error for non-existent author', async () => {
      await expect(generateAuthorRSSFeed(9999)).rejects.toThrow(/No posts found for author ID 9999/);
    });

    it('should handle author with no published posts', async () => {
      // Update post to draft status
      await db.update(postsTable)
        .set({ status: 'draft' })
        .execute();

      await expect(generateAuthorRSSFeed(userId)).rejects.toThrow(/No posts found for author ID/);
    });
  });

  describe('RSS feed ordering and limits', () => {
    beforeEach(async () => {
      // Create multiple posts with different published dates
      const posts = [
        {
          title: 'Latest Post',
          slug: 'latest-post',
          published_at: new Date('2024-01-20T10:00:00Z')
        },
        {
          title: 'Middle Post',
          slug: 'middle-post',
          published_at: new Date('2024-01-18T10:00:00Z')
        },
        {
          title: 'Oldest Post',
          slug: 'oldest-post',
          published_at: new Date('2024-01-16T10:00:00Z')
        }
      ];

      for (const post of posts) {
        await db.insert(postsTable)
          .values({
            title: post.title,
            slug: post.slug,
            content: `Content for ${post.title}`,
            status: 'published',
            author_id: userId,
            category_id: categoryId,
            published_at: post.published_at
          })
          .execute();
      }
    });

    it('should order posts by published date descending', async () => {
      const rss = await generateRSSFeed();
      
      const latestIndex = rss.indexOf('<title>Latest Post</title>');
      const middleIndex = rss.indexOf('<title>Middle Post</title>');
      const oldestIndex = rss.indexOf('<title>Oldest Post</title>');
      const testIndex = rss.indexOf('<title>Test Blog Post</title>');

      expect(latestIndex).toBeLessThan(middleIndex);
      expect(middleIndex).toBeLessThan(oldestIndex);
      expect(oldestIndex).toBeLessThan(testIndex);
    });

    it('should include all posts within limit', async () => {
      const rss = await generateRSSFeed();

      expect(rss).toContain('<title>Latest Post</title>');
      expect(rss).toContain('<title>Middle Post</title>');
      expect(rss).toContain('<title>Oldest Post</title>');
      expect(rss).toContain('<title>Test Blog Post</title>');
    });
  });

  describe('RSS feed content handling', () => {
    it('should use excerpt when available, otherwise content preview', async () => {
      // Create post without excerpt
      await db.insert(postsTable)
        .values({
          title: 'No Excerpt Post',
          slug: 'no-excerpt-post',
          content: 'This is a very long content that should be truncated when used as description in RSS feed because there is no excerpt available for this particular post.',
          status: 'published',
          author_id: userId,
          published_at: new Date()
        })
        .execute();

      const rss = await generateRSSFeed();

      expect(rss).toContain('This is a very long content that should be truncated when used as description in RSS feed because there is no excerpt available for this particular...');
    });

    it('should handle posts with null published_at using created_at', async () => {
      await db.insert(postsTable)
        .values({
          title: 'No Published Date Post',
          slug: 'no-published-date',
          content: 'Content without published date',
          status: 'published',
          author_id: userId,
          published_at: null
        })
        .execute();

      const rss = await generateRSSFeed();

      expect(rss).toContain('<title>No Published Date Post</title>');
      expect(rss).toContain('<pubDate>');
    });
  });
});