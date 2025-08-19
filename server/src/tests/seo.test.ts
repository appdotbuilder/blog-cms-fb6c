import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable, categoriesTable, usersTable, siteSettingsTable } from '../db/schema';
import { type Post } from '../schema';
import {
  generateSitemap,
  generateRobotsTxt,
  generatePostMetadata,
  generateStructuredData,
  analyzePostSEO,
  generateCanonicalUrl
} from '../handlers/seo';

describe('SEO Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create site settings
    const siteSettings = await db.insert(siteSettingsTable)
      .values({
        site_title: 'Test Blog',
        site_description: 'A test blog for testing',
        site_url: 'https://testblog.com',
        admin_email: 'admin@testblog.com'
      })
      .returning()
      .execute();

    // Create a user
    const users = await db.insert(usersTable)
      .values({
        email: 'author@test.com',
        username: 'testauthor',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Author',
        role: 'author'
      })
      .returning()
      .execute();

    // Create a category
    const categories = await db.insert(categoriesTable)
      .values({
        name: 'Technology',
        slug: 'technology',
        description: 'Tech articles'
      })
      .returning()
      .execute();

    // Create published posts
    const posts = await db.insert(postsTable)
      .values([
        {
          title: 'First Published Post',
          slug: 'first-published-post',
          content: 'This is the content of the first published post.',
          status: 'published',
          author_id: users[0].id,
          category_id: categories[0].id,
          excerpt: 'This is the excerpt of the first post',
          meta_title: 'Custom Meta Title',
          meta_description: 'Custom meta description for the first post',
          published_at: new Date('2023-01-01')
        },
        {
          title: 'Second Published Post',
          slug: 'second-published-post',
          content: 'Content of the second post.',
          status: 'published',
          author_id: users[0].id,
          published_at: new Date('2023-01-02')
        },
        {
          title: 'Draft Post',
          slug: 'draft-post',
          content: 'This is a draft post.',
          status: 'draft',
          author_id: users[0].id
        }
      ])
      .returning()
      .execute();

    return { siteSettings: siteSettings[0], users, categories, posts };
  };

  describe('generateSitemap', () => {
    it('should generate XML sitemap with published posts and categories', async () => {
      const { categories } = await createTestData();

      const sitemap = await generateSitemap();

      // Should be valid XML
      expect(sitemap).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
      expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(sitemap).toContain('</urlset>');

      // Should contain home page
      expect(sitemap).toContain('<loc>https://testblog.com</loc>');
      expect(sitemap).toContain('<priority>1.0</priority>');

      // Should contain published posts
      expect(sitemap).toContain('<loc>https://testblog.com/posts/first-published-post</loc>');
      expect(sitemap).toContain('<loc>https://testblog.com/posts/second-published-post</loc>');
      
      // Should NOT contain draft posts
      expect(sitemap).not.toContain('<loc>https://testblog.com/posts/draft-post</loc>');

      // Should contain categories
      expect(sitemap).toContain('<loc>https://testblog.com/categories/technology</loc>');
      expect(sitemap).toContain('<priority>0.7</priority>');
    });

    it('should handle empty database gracefully', async () => {
      const sitemap = await generateSitemap();

      expect(sitemap).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
      expect(sitemap).toContain('<loc>https://example.com</loc>'); // Default URL when no settings
    });
  });

  describe('generateRobotsTxt', () => {
    it('should generate robots.txt with sitemap URL', async () => {
      await createTestData();

      const robotsTxt = await generateRobotsTxt();

      expect(robotsTxt).toContain('User-agent: *');
      expect(robotsTxt).toContain('Allow: /');
      expect(robotsTxt).toContain('Disallow: /admin/');
      expect(robotsTxt).toContain('Disallow: /login/');
      expect(robotsTxt).toContain('Disallow: /dashboard/');
      expect(robotsTxt).toContain('Sitemap: https://testblog.com/sitemap.xml');
    });

    it('should use default URL when no settings exist', async () => {
      const robotsTxt = await generateRobotsTxt();

      expect(robotsTxt).toContain('Sitemap: https://example.com/sitemap.xml');
    });
  });

  describe('generatePostMetadata', () => {
    it('should generate complete metadata for post with custom fields', async () => {
      const { posts } = await createTestData();
      const post = posts[0]; // First post has custom meta fields

      const metadata = await generatePostMetadata(post);

      expect(metadata.title).toBe('Custom Meta Title');
      expect(metadata.description).toBe('Custom meta description for the first post');
      expect(metadata.canonical).toBe('https://testblog.com/posts/first-published-post');

      // Open Graph
      expect(metadata.openGraph['og:title']).toBe('First Published Post');
      expect(metadata.openGraph['og:description']).toBe('Custom meta description for the first post');
      expect(metadata.openGraph['og:type']).toBe('article');
      expect(metadata.openGraph['og:url']).toBe('https://testblog.com/posts/first-published-post');
      expect(metadata.openGraph['og:site_name']).toBe('Test Blog');
      expect(metadata.openGraph['og:published_time']).toBe('2023-01-01T00:00:00.000Z');

      // Twitter
      expect(metadata.twitter['twitter:card']).toBe('summary_large_image');
      expect(metadata.twitter['twitter:title']).toBe('First Published Post');
      expect(metadata.twitter['twitter:description']).toBe('Custom meta description for the first post');
    });

    it('should generate metadata with fallbacks for post without custom fields', async () => {
      const { posts } = await createTestData();
      const post = posts[1]; // Second post has no custom meta fields

      const metadata = await generatePostMetadata(post);

      expect(metadata.title).toBe('Second Published Post | Test Blog');
      expect(metadata.description).toBe('Content of the second post.'); // Falls back to content
      expect(metadata.canonical).toBe('https://testblog.com/posts/second-published-post');
    });

    it('should handle post with custom canonical URL', async () => {
      const { users } = await createTestData();
      
      const posts = await db.insert(postsTable)
        .values({
          title: 'Post with Canonical',
          slug: 'post-with-canonical',
          content: 'Content',
          status: 'published',
          author_id: users[0].id,
          canonical_url: 'https://external.com/original-post'
        })
        .returning()
        .execute();

      const metadata = await generatePostMetadata(posts[0]);

      expect(metadata.canonical).toBe('https://external.com/original-post');
      expect(metadata.openGraph['og:url']).toBe('https://external.com/original-post');
    });
  });

  describe('generateStructuredData', () => {
    it('should generate JSON-LD structured data', async () => {
      const { posts } = await createTestData();
      const post = posts[0];

      const structuredData = await generateStructuredData(post);

      expect(structuredData['@context']).toBe('https://schema.org');
      expect(structuredData['@type']).toBe('BlogPosting');
      expect(structuredData['headline']).toBe('First Published Post');
      expect(structuredData['description']).toBe('This is the excerpt of the first post');
      expect(structuredData['url']).toBe('https://testblog.com/posts/first-published-post');
      expect(structuredData['datePublished']).toBe('2023-01-01T00:00:00.000Z');
      
      expect(structuredData['publisher']).toEqual({
        '@type': 'Organization',
        'name': 'Test Blog',
        'url': 'https://testblog.com'
      });

      expect(structuredData['author']).toEqual({
        '@type': 'Person',
        'name': 'Author'
      });

      expect(structuredData['mainEntityOfPage']).toEqual({
        '@type': 'WebPage',
        '@id': 'https://testblog.com/posts/first-published-post'
      });
    });

    it('should handle post without excerpt', async () => {
      const { posts } = await createTestData();
      const post = posts[1]; // No excerpt

      const structuredData = await generateStructuredData(post);

      expect(structuredData['description']).toBe('Content of the second post.');
    });
  });

  describe('analyzePostSEO', () => {
    it('should give high score for well-optimized post', async () => {
      const { posts } = await createTestData();
      const post = posts[0]; // Well-optimized post

      const analysis = await analyzePostSEO(post);

      expect(analysis.score).toBeGreaterThan(80);
      expect(analysis.issues).toHaveLength(0);
      // The first post has optimal fields but might still get some recommendations
      expect(analysis.recommendations.length).toBeLessThanOrEqual(4);
    });

    it('should identify missing meta description', async () => {
      const { users } = await createTestData();
      
      const posts = await db.insert(postsTable)
        .values({
          title: 'Post Without Meta Description',
          slug: 'no-meta-desc',
          content: 'Some content here',
          status: 'published',
          author_id: users[0].id
          // No meta_description or excerpt
        })
        .returning()
        .execute();

      const analysis = await analyzePostSEO(posts[0]);

      expect(analysis.score).toBeLessThan(100);
      expect(analysis.issues).toContain('Missing meta description and excerpt');
    });

    it('should identify short content', async () => {
      const { users } = await createTestData();
      
      const posts = await db.insert(postsTable)
        .values({
          title: 'Short Post',
          slug: 'short-post',
          content: 'Too short', // Very short content
          status: 'published',
          author_id: users[0].id
        })
        .returning()
        .execute();

      const analysis = await analyzePostSEO(posts[0]);

      expect(analysis.score).toBeLessThan(90);
      expect(analysis.recommendations).toContain('Content is quite short - consider adding more detail');
    });

    it('should identify title length issues', async () => {
      const { users } = await createTestData();
      
      // Test short title
      const shortTitlePosts = await db.insert(postsTable)
        .values({
          title: 'Short', // Too short
          slug: 'short-title',
          content: 'Some decent content here that is long enough for good SEO analysis',
          status: 'published',
          author_id: users[0].id
        })
        .returning()
        .execute();

      const shortAnalysis = await analyzePostSEO(shortTitlePosts[0]);
      expect(shortAnalysis.recommendations).toContain('Consider making title longer (30-60 characters optimal)');

      // Test long title
      const longTitlePosts = await db.insert(postsTable)
        .values({
          title: 'This is a very long title that exceeds the recommended length for SEO', // Too long
          slug: 'long-title',
          content: 'Some decent content here that is long enough for good SEO analysis',
          status: 'published',
          author_id: users[0].id
        })
        .returning()
        .execute();

      const longAnalysis = await analyzePostSEO(longTitlePosts[0]);
      expect(longAnalysis.recommendations).toContain('Title may be too long (30-60 characters optimal)');
    });

    it('should identify meta description length issues', async () => {
      const { users } = await createTestData();
      
      const posts = await db.insert(postsTable)
        .values({
          title: 'Post with Long Meta Description',
          slug: 'long-meta-desc',
          content: 'Some content here that is adequate length',
          status: 'published',
          author_id: users[0].id,
          meta_description: 'This is a very long meta description that exceeds the recommended 160 character limit for search engines which may cause truncation in search results. This sentence makes it even longer.'
        })
        .returning()
        .execute();

      const analysis = await analyzePostSEO(posts[0]);

      expect(analysis.issues).toContain('Meta description too long (may be truncated in search results)');
    });

    it('should handle missing required fields', async () => {
      const { users } = await createTestData();
      
      const posts = await db.insert(postsTable)
        .values({
          title: '', // Empty title
          slug: '', // Empty slug
          content: '', // Empty content
          status: 'published',
          author_id: users[0].id
        })
        .returning()
        .execute();

      const analysis = await analyzePostSEO(posts[0]);

      expect(analysis.score).toBeLessThan(50);
      expect(analysis.issues).toContain('Missing title');
      expect(analysis.issues).toContain('Missing URL slug');
      expect(analysis.issues).toContain('Missing content');
    });

    it('should recommend hyphens over underscores in slug', async () => {
      const { users } = await createTestData();
      
      const posts = await db.insert(postsTable)
        .values({
          title: 'Post with Underscore Slug',
          slug: 'post_with_underscores', // Has underscores
          content: 'Some content here that is adequate length for testing',
          status: 'published',
          author_id: users[0].id
        })
        .returning()
        .execute();

      const analysis = await analyzePostSEO(posts[0]);

      expect(analysis.recommendations).toContain('Use hyphens instead of underscores in URL slug');
    });
  });

  describe('generateCanonicalUrl', () => {
    it('should return existing canonical URL if set', async () => {
      const { users } = await createTestData();
      
      const posts = await db.insert(postsTable)
        .values({
          title: 'Post with Canonical',
          slug: 'post-with-canonical',
          content: 'Content',
          status: 'published',
          author_id: users[0].id,
          canonical_url: 'https://external.com/original-post'
        })
        .returning()
        .execute();

      const canonicalUrl = await generateCanonicalUrl(posts[0]);

      expect(canonicalUrl).toBe('https://external.com/original-post');
    });

    it('should generate canonical URL from site settings and slug', async () => {
      const { posts } = await createTestData();
      const post = posts[0]; // No canonical_url set

      const canonicalUrl = await generateCanonicalUrl(post);

      expect(canonicalUrl).toBe('https://testblog.com/posts/first-published-post');
    });

    it('should use default URL when no settings exist', async () => {
      // Create minimal test data without site settings
      const users = await db.insert(usersTable)
        .values({
          email: 'author@test.com',
          username: 'testauthor',
          password_hash: 'hashedpassword',
          first_name: 'Test',
          last_name: 'Author',
          role: 'author'
        })
        .returning()
        .execute();

      const posts = await db.insert(postsTable)
        .values({
          title: 'Test Post',
          slug: 'test-post',
          content: 'Content',
          status: 'published',
          author_id: users[0].id
        })
        .returning()
        .execute();

      const canonicalUrl = await generateCanonicalUrl(posts[0]);

      expect(canonicalUrl).toBe('https://example.com/posts/test-post');
    });
  });
});