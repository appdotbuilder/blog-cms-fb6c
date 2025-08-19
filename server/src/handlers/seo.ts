import { db } from '../db';
import { postsTable, categoriesTable, siteSettingsTable } from '../db/schema';
import { type Post } from '../schema';
import { eq } from 'drizzle-orm';

export async function generateSitemap(): Promise<string> {
  try {
    // Get site settings for base URL
    const settings = await db.select()
      .from(siteSettingsTable)
      .limit(1)
      .execute();
    
    const baseUrl = settings[0]?.site_url || 'https://example.com';
    
    // Get all published posts
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.status, 'published'))
      .execute();
    
    // Get all categories
    const categories = await db.select()
      .from(categoriesTable)
      .execute();
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;
    
    // Add category URLs
    categories.forEach(category => {
      sitemap += `
  <url>
    <loc>${baseUrl}/categories/${category.slug}</loc>
    <lastmod>${category.updated_at.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });
    
    // Add post URLs
    posts.forEach(post => {
      const lastmod = post.published_at || post.updated_at;
      sitemap += `
  <url>
    <loc>${baseUrl}/posts/${post.slug}</loc>
    <lastmod>${lastmod.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
    
    sitemap += `
</urlset>`;
    
    return sitemap;
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    throw error;
  }
}

export async function generateRobotsTxt(): Promise<string> {
  try {
    // Get site settings for sitemap URL
    const settings = await db.select()
      .from(siteSettingsTable)
      .limit(1)
      .execute();
    
    const baseUrl = settings[0]?.site_url || 'https://example.com';
    
    return `User-agent: *
Allow: /

# Disallow admin areas
Disallow: /admin/
Disallow: /login/
Disallow: /dashboard/

# Allow search engines to access sitemap
Sitemap: ${baseUrl}/sitemap.xml`;
  } catch (error) {
    console.error('Robots.txt generation failed:', error);
    throw error;
  }
}

export async function generatePostMetadata(post: Post): Promise<{
  title: string;
  description: string;
  canonical: string;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
}> {
  try {
    // Get site settings for base URL and title
    const settings = await db.select()
      .from(siteSettingsTable)
      .limit(1)
      .execute();
    
    const baseUrl = settings[0]?.site_url || 'https://example.com';
    const siteTitle = settings[0]?.site_title || 'Blog';
    
    const canonicalUrl = post.canonical_url || `${baseUrl}/posts/${post.slug}`;
    const title = post.meta_title || `${post.title} | ${siteTitle}`;
    const description = post.meta_description || post.excerpt || (post.content.length > 160 ? post.content.substring(0, 160) + '...' : post.content);
    
    return {
      title,
      description,
      canonical: canonicalUrl,
      openGraph: {
        'og:title': post.title,
        'og:description': description,
        'og:type': 'article',
        'og:url': canonicalUrl,
        'og:site_name': siteTitle,
        'og:published_time': post.published_at?.toISOString() || post.created_at.toISOString(),
        'og:modified_time': post.updated_at.toISOString()
      },
      twitter: {
        'twitter:card': 'summary_large_image',
        'twitter:title': post.title,
        'twitter:description': description,
        'twitter:url': canonicalUrl
      }
    };
  } catch (error) {
    console.error('Post metadata generation failed:', error);
    throw error;
  }
}

export async function generateStructuredData(post: Post): Promise<Record<string, any>> {
  try {
    // Get site settings and author info
    const settings = await db.select()
      .from(siteSettingsTable)
      .limit(1)
      .execute();
    
    const baseUrl = settings[0]?.site_url || 'https://example.com';
    const siteTitle = settings[0]?.site_title || 'Blog';
    
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': post.title,
      'description': post.excerpt || (post.content.length > 160 ? post.content.substring(0, 160) + '...' : post.content),
      'url': post.canonical_url || `${baseUrl}/posts/${post.slug}`,
      'datePublished': post.published_at?.toISOString() || post.created_at.toISOString(),
      'dateModified': post.updated_at.toISOString(),
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': post.canonical_url || `${baseUrl}/posts/${post.slug}`
      },
      'publisher': {
        '@type': 'Organization',
        'name': siteTitle,
        'url': baseUrl
      },
      'author': {
        '@type': 'Person',
        'name': 'Author' // This would ideally come from joined user data
      }
    };
  } catch (error) {
    console.error('Structured data generation failed:', error);
    throw error;
  }
}

export async function analyzePostSEO(post: Post): Promise<{
  score: number;
  issues: string[];
  recommendations: string[];
}> {
  try {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;
    
    // Title analysis
    if (!post.title || post.title.length === 0) {
      issues.push('Missing title');
      score -= 20;
    } else if (post.title.length < 30) {
      recommendations.push('Consider making title longer (30-60 characters optimal)');
      score -= 5;
    } else if (post.title.length > 60) {
      recommendations.push('Title may be too long (30-60 characters optimal)');
      score -= 3;
    }
    
    // Meta description analysis
    if (!post.meta_description) {
      if (!post.excerpt) {
        issues.push('Missing meta description and excerpt');
        score -= 15;
      } else {
        recommendations.push('Add custom meta description for better SEO');
        score -= 5;
      }
    } else if (post.meta_description.length < 120) {
      recommendations.push('Meta description could be longer (120-160 characters optimal)');
      score -= 3;
    } else if (post.meta_description.length > 160) {
      issues.push('Meta description too long (may be truncated in search results)');
      score -= 8;
    }
    
    // Content analysis
    if (!post.content || post.content.length === 0) {
      issues.push('Missing content');
      score -= 25;
    } else if (post.content.length < 300) {
      recommendations.push('Content is quite short - consider adding more detail');
      score -= 10;
    }
    
    // Slug analysis
    if (!post.slug || post.slug.length === 0) {
      issues.push('Missing URL slug');
      score -= 15;
    } else if (post.slug.includes('_')) {
      recommendations.push('Use hyphens instead of underscores in URL slug');
      score -= 2;
    }
    
    // Meta title analysis
    if (!post.meta_title) {
      recommendations.push('Add custom meta title for better search engine optimization');
      score -= 5;
    }
    
    // Canonical URL analysis
    if (!post.canonical_url) {
      recommendations.push('Consider adding canonical URL if content exists elsewhere');
    }
    
    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    
    return {
      score,
      issues,
      recommendations
    };
  } catch (error) {
    console.error('SEO analysis failed:', error);
    throw error;
  }
}

export async function generateCanonicalUrl(post: Post): Promise<string> {
  try {
    // If canonical URL is already set, return it
    if (post.canonical_url) {
      return post.canonical_url;
    }
    
    // Get site settings for base URL
    const settings = await db.select()
      .from(siteSettingsTable)
      .limit(1)
      .execute();
    
    const baseUrl = settings[0]?.site_url || 'https://example.com';
    
    // Generate canonical URL from base URL and slug
    return `${baseUrl}/posts/${post.slug}`;
  } catch (error) {
    console.error('Canonical URL generation failed:', error);
    throw error;
  }
}