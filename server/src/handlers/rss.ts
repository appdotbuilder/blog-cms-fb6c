import { db } from '../db';
import { postsTable, usersTable, categoriesTable, tagsTable, postTagsTable } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { type RssConfig } from '../schema';

// Helper function to escape XML characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper function to get published posts with authors
async function getPublishedPosts(limit = 20) {
  const results = await db.select({
    id: postsTable.id,
    title: postsTable.title,
    slug: postsTable.slug,
    excerpt: postsTable.excerpt,
    content: postsTable.content,
    published_at: postsTable.published_at,
    created_at: postsTable.created_at,
    updated_at: postsTable.updated_at,
    author_name: usersTable.username,
    author_email: usersTable.email
  })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.author_id, usersTable.id))
    .where(eq(postsTable.status, 'published'))
    .orderBy(desc(postsTable.published_at))
    .limit(limit)
    .execute();

  return results;
}

// Helper function to get posts by category
async function getPostsByCategory(categoryId: number, limit = 20) {
  const results = await db.select({
    id: postsTable.id,
    title: postsTable.title,
    slug: postsTable.slug,
    excerpt: postsTable.excerpt,
    content: postsTable.content,
    published_at: postsTable.published_at,
    created_at: postsTable.created_at,
    updated_at: postsTable.updated_at,
    author_name: usersTable.username,
    author_email: usersTable.email,
    category_name: categoriesTable.name
  })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.author_id, usersTable.id))
    .innerJoin(categoriesTable, eq(postsTable.category_id, categoriesTable.id))
    .where(and(
      eq(postsTable.status, 'published'),
      eq(postsTable.category_id, categoryId)
    ))
    .orderBy(desc(postsTable.published_at))
    .limit(limit)
    .execute();

  return results;
}

// Helper function to get posts by tag
async function getPostsByTag(tagId: number, limit = 20) {
  const results = await db.select({
    id: postsTable.id,
    title: postsTable.title,
    slug: postsTable.slug,
    excerpt: postsTable.excerpt,
    content: postsTable.content,
    published_at: postsTable.published_at,
    created_at: postsTable.created_at,
    updated_at: postsTable.updated_at,
    author_name: usersTable.username,
    author_email: usersTable.email,
    tag_name: tagsTable.name
  })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.author_id, usersTable.id))
    .innerJoin(postTagsTable, eq(postsTable.id, postTagsTable.post_id))
    .innerJoin(tagsTable, eq(postTagsTable.tag_id, tagsTable.id))
    .where(and(
      eq(postsTable.status, 'published'),
      eq(postTagsTable.tag_id, tagId)
    ))
    .orderBy(desc(postsTable.published_at))
    .limit(limit)
    .execute();

  return results;
}

// Helper function to get posts by author
async function getPostsByAuthor(authorId: number, limit = 20) {
  const results = await db.select({
    id: postsTable.id,
    title: postsTable.title,
    slug: postsTable.slug,
    excerpt: postsTable.excerpt,
    content: postsTable.content,
    published_at: postsTable.published_at,
    created_at: postsTable.created_at,
    updated_at: postsTable.updated_at,
    author_name: usersTable.username,
    author_email: usersTable.email
  })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.author_id, usersTable.id))
    .where(and(
      eq(postsTable.status, 'published'),
      eq(postsTable.author_id, authorId)
    ))
    .orderBy(desc(postsTable.published_at))
    .limit(limit)
    .execute();

  return results;
}

export async function generateRSSFeed(config?: RssConfig): Promise<string> {
  try {
    const posts = await getPublishedPosts();
    
    const defaultConfig = {
      title: 'Blog RSS Feed',
      description: 'Latest blog posts',
      link: 'https://example.com',
      language: 'en'
    };
    
    const feedConfig = { ...defaultConfig, ...config };
    
    const items = posts.map(post => {
      const pubDate = post.published_at ? new Date(post.published_at) : new Date(post.created_at);
      const link = `${feedConfig.link}/posts/${post.slug}`;
      
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <description>${escapeXml(post.excerpt || (post.content.length > 147 ? post.content.substring(0, 147) + '...' : post.content))}</description>
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
      <link>${link}</link>
      <guid>${link}</guid>
      <author>${escapeXml(post.author_email)} (${escapeXml(post.author_name)})</author>
      <pubDate>${pubDate.toUTCString()}</pubDate>
    </item>`;
    }).join('\n');

    const lastBuildDate = posts.length > 0 && posts[0].published_at
      ? new Date(posts[0].published_at).toUTCString()
      : new Date().toUTCString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(feedConfig.title)}</title>
    <description>${escapeXml(feedConfig.description)}</description>
    <link>${feedConfig.link}</link>
    <language>${feedConfig.language}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>Blog CMS</generator>
${feedConfig.copyright ? `    <copyright>${escapeXml(feedConfig.copyright)}</copyright>\n` : ''}${feedConfig.managingEditor ? `    <managingEditor>${escapeXml(feedConfig.managingEditor)}</managingEditor>\n` : ''}${feedConfig.webMaster ? `    <webMaster>${escapeXml(feedConfig.webMaster)}</webMaster>\n` : ''}${items}
  </channel>
</rss>`;
  } catch (error) {
    console.error('RSS feed generation failed:', error);
    throw error;
  }
}

export async function generateAtomFeed(config?: RssConfig): Promise<string> {
  try {
    const posts = await getPublishedPosts();
    
    const defaultConfig = {
      title: 'Blog Atom Feed',
      description: 'Latest blog posts',
      link: 'https://example.com',
      language: 'en'
    };
    
    const feedConfig = { ...defaultConfig, ...config };
    
    const entries = posts.map(post => {
      const published = post.published_at ? new Date(post.published_at) : new Date(post.created_at);
      const updated = new Date(post.updated_at);
      const link = `${feedConfig.link}/posts/${post.slug}`;
      
      return `    <entry>
      <title>${escapeXml(post.title)}</title>
      <link href="${link}" />
      <id>${link}</id>
      <published>${published.toISOString()}</published>
      <updated>${updated.toISOString()}</updated>
      <author>
        <name>${escapeXml(post.author_name)}</name>
        <email>${escapeXml(post.author_email)}</email>
      </author>
      <summary>${escapeXml(post.excerpt || (post.content.length > 147 ? post.content.substring(0, 147) + '...' : post.content))}</summary>
      <content type="html"><![CDATA[${post.content}]]></content>
    </entry>`;
    }).join('\n');

    const updated = posts.length > 0 && posts[0].published_at
      ? new Date(posts[0].published_at).toISOString()
      : new Date().toISOString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(feedConfig.title)}</title>
  <link href="${feedConfig.link}" />
  <link href="${feedConfig.link}/atom.xml" rel="self" />
  <updated>${updated}</updated>
  <id>${feedConfig.link}</id>
  <subtitle>${escapeXml(feedConfig.description)}</subtitle>
  <generator>Blog CMS</generator>
${entries}
</feed>`;
  } catch (error) {
    console.error('Atom feed generation failed:', error);
    throw error;
  }
}

export async function generateCategoryRSSFeed(categoryId: number, config?: RssConfig): Promise<string> {
  try {
    const posts = await getPostsByCategory(categoryId);
    
    if (posts.length === 0) {
      throw new Error(`No posts found for category ID ${categoryId}`);
    }

    const categoryName = posts[0].category_name;
    
    const defaultConfig = {
      title: `${categoryName} - Category RSS Feed`,
      description: `Posts from ${categoryName} category`,
      link: 'https://example.com',
      language: 'en'
    };
    
    // For category feeds, use category-specific title and description
    const feedConfig = { 
      ...defaultConfig, 
      ...config,
      title: `${categoryName} - Category RSS Feed`,
      description: `Posts from ${categoryName} category`
    };
    
    const items = posts.map(post => {
      const pubDate = post.published_at ? new Date(post.published_at) : new Date(post.created_at);
      const link = `${feedConfig.link}/posts/${post.slug}`;
      
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <description>${escapeXml(post.excerpt || (post.content.length > 147 ? post.content.substring(0, 147) + '...' : post.content))}</description>
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
      <link>${link}</link>
      <guid>${link}</guid>
      <author>${escapeXml(post.author_email)} (${escapeXml(post.author_name)})</author>
      <category>${escapeXml(categoryName)}</category>
      <pubDate>${pubDate.toUTCString()}</pubDate>
    </item>`;
    }).join('\n');

    const lastBuildDate = posts.length > 0 && posts[0].published_at
      ? new Date(posts[0].published_at).toUTCString()
      : new Date().toUTCString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(feedConfig.title)}</title>
    <description>${escapeXml(feedConfig.description)}</description>
    <link>${feedConfig.link}/categories/${categoryId}</link>
    <language>${feedConfig.language}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>Blog CMS</generator>
${items}
  </channel>
</rss>`;
  } catch (error) {
    console.error('Category RSS feed generation failed:', error);
    throw error;
  }
}

export async function generateTagRSSFeed(tagId: number, config?: RssConfig): Promise<string> {
  try {
    const posts = await getPostsByTag(tagId);
    
    if (posts.length === 0) {
      throw new Error(`No posts found for tag ID ${tagId}`);
    }

    const tagName = posts[0].tag_name;
    
    const defaultConfig = {
      title: `${tagName} - Tag RSS Feed`,
      description: `Posts tagged with ${tagName}`,
      link: 'https://example.com',
      language: 'en'
    };
    
    // For tag feeds, use tag-specific title and description
    const feedConfig = { 
      ...defaultConfig, 
      ...config,
      title: `${tagName} - Tag RSS Feed`,
      description: `Posts tagged with ${tagName}`
    };
    
    const items = posts.map(post => {
      const pubDate = post.published_at ? new Date(post.published_at) : new Date(post.created_at);
      const link = `${feedConfig.link}/posts/${post.slug}`;
      
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <description>${escapeXml(post.excerpt || (post.content.length > 147 ? post.content.substring(0, 147) + '...' : post.content))}</description>
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
      <link>${link}</link>
      <guid>${link}</guid>
      <author>${escapeXml(post.author_email)} (${escapeXml(post.author_name)})</author>
      <category>${escapeXml(tagName)}</category>
      <pubDate>${pubDate.toUTCString()}</pubDate>
    </item>`;
    }).join('\n');

    const lastBuildDate = posts.length > 0 && posts[0].published_at
      ? new Date(posts[0].published_at).toUTCString()
      : new Date().toUTCString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(feedConfig.title)}</title>
    <description>${escapeXml(feedConfig.description)}</description>
    <link>${feedConfig.link}/tags/${tagId}</link>
    <language>${feedConfig.language}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>Blog CMS</generator>
${items}
  </channel>
</rss>`;
  } catch (error) {
    console.error('Tag RSS feed generation failed:', error);
    throw error;
  }
}

export async function generateAuthorRSSFeed(authorId: number, config?: RssConfig): Promise<string> {
  try {
    const posts = await getPostsByAuthor(authorId);
    
    if (posts.length === 0) {
      throw new Error(`No posts found for author ID ${authorId}`);
    }

    const authorName = posts[0].author_name;
    
    const defaultConfig = {
      title: `${authorName} - Author RSS Feed`,
      description: `Posts by ${authorName}`,
      link: 'https://example.com',
      language: 'en'
    };
    
    // For author feeds, use author-specific title and description
    const feedConfig = { 
      ...defaultConfig, 
      ...config,
      title: `${authorName} - Author RSS Feed`,
      description: `Posts by ${authorName}`
    };
    
    const items = posts.map(post => {
      const pubDate = post.published_at ? new Date(post.published_at) : new Date(post.created_at);
      const link = `${feedConfig.link}/posts/${post.slug}`;
      
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <description>${escapeXml(post.excerpt || (post.content.length > 147 ? post.content.substring(0, 147) + '...' : post.content))}</description>
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
      <link>${link}</link>
      <guid>${link}</guid>
      <author>${escapeXml(post.author_email)} (${escapeXml(post.author_name)})</author>
      <pubDate>${pubDate.toUTCString()}</pubDate>
    </item>`;
    }).join('\n');

    const lastBuildDate = posts.length > 0 && posts[0].published_at
      ? new Date(posts[0].published_at).toUTCString()
      : new Date().toUTCString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(feedConfig.title)}</title>
    <description>${escapeXml(feedConfig.description)}</description>
    <link>${feedConfig.link}/authors/${authorId}</link>
    <language>${feedConfig.language}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>Blog CMS</generator>
${items}
  </channel>
</rss>`;
  } catch (error) {
    console.error('Author RSS feed generation failed:', error);
    throw error;
  }
}