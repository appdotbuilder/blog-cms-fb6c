import { z } from 'zod';

// User schema with authentication
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.enum(['admin', 'editor', 'author']),
  bio: z.string().nullable(),
  avatar_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schemas for user management
export const createUserInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(['admin', 'editor', 'author']),
  bio: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  username: z.string().min(3).max(50).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: z.enum(['admin', 'editor', 'author']).optional(),
  bio: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  parent_id: z.number().nullable(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

export const createCategoryInputSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  parent_id: z.number().nullable().optional(),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  parent_id: z.number().nullable().optional(),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

// Tag schema
export const tagSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Tag = z.infer<typeof tagSchema>;

export const createTagInputSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
  description: z.string().nullable().optional()
});

export type CreateTagInput = z.infer<typeof createTagInputSchema>;

export const updateTagInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(50).optional(),
  slug: z.string().min(1).max(50).optional(),
  description: z.string().nullable().optional()
});

export type UpdateTagInput = z.infer<typeof updateTagInputSchema>;

// Media schema
export const mediaSchema = z.object({
  id: z.number(),
  filename: z.string(),
  original_filename: z.string(),
  file_path: z.string(),
  file_size: z.number().int(),
  mime_type: z.string(),
  alt_text: z.string().nullable(),
  caption: z.string().nullable(),
  uploaded_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Media = z.infer<typeof mediaSchema>;

export const createMediaInputSchema = z.object({
  filename: z.string(),
  original_filename: z.string(),
  file_path: z.string(),
  file_size: z.number().int().positive(),
  mime_type: z.string(),
  alt_text: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  uploaded_by: z.number()
});

export type CreateMediaInput = z.infer<typeof createMediaInputSchema>;

export const updateMediaInputSchema = z.object({
  id: z.number(),
  alt_text: z.string().nullable().optional(),
  caption: z.string().nullable().optional()
});

export type UpdateMediaInput = z.infer<typeof updateMediaInputSchema>;

// Blog post schema
export const postSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  content: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  featured_image_id: z.number().nullable(),
  author_id: z.number(),
  category_id: z.number().nullable(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  canonical_url: z.string().nullable(),
  published_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Post = z.infer<typeof postSchema>;

export const createPostInputSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  excerpt: z.string().nullable().optional(),
  content: z.string().min(1),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  featured_image_id: z.number().nullable().optional(),
  author_id: z.number(),
  category_id: z.number().nullable().optional(),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  canonical_url: z.string().url().nullable().optional(),
  published_at: z.coerce.date().nullable().optional(),
  tag_ids: z.array(z.number()).optional()
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;

export const updatePostInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  excerpt: z.string().nullable().optional(),
  content: z.string().min(1).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  featured_image_id: z.number().nullable().optional(),
  category_id: z.number().nullable().optional(),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  canonical_url: z.string().url().nullable().optional(),
  published_at: z.coerce.date().nullable().optional(),
  tag_ids: z.array(z.number()).optional()
});

export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;

// Post-Tag relationship schema
export const postTagSchema = z.object({
  post_id: z.number(),
  tag_id: z.number(),
  created_at: z.coerce.date()
});

export type PostTag = z.infer<typeof postTagSchema>;

// Comment schema
export const commentSchema = z.object({
  id: z.number(),
  post_id: z.number(),
  author_name: z.string(),
  author_email: z.string().email(),
  author_website: z.string().nullable(),
  content: z.string(),
  status: z.enum(['pending', 'approved', 'spam', 'rejected']),
  parent_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Comment = z.infer<typeof commentSchema>;

export const createCommentInputSchema = z.object({
  post_id: z.number(),
  author_name: z.string().min(1).max(100),
  author_email: z.string().email(),
  author_website: z.string().url().nullable().optional(),
  content: z.string().min(1).max(2000),
  parent_id: z.number().nullable().optional()
});

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

export const updateCommentInputSchema = z.object({
  id: z.number(),
  status: z.enum(['pending', 'approved', 'spam', 'rejected'])
});

export type UpdateCommentInput = z.infer<typeof updateCommentInputSchema>;

// Search and pagination schemas
export const searchPostsInputSchema = z.object({
  query: z.string().optional(),
  category_id: z.number().optional(),
  tag_ids: z.array(z.number()).optional(),
  author_id: z.number().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sort_by: z.enum(['created_at', 'updated_at', 'published_at', 'title']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type SearchPostsInput = z.infer<typeof searchPostsInputSchema>;

export const paginationResponseSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  total_pages: z.number(),
  has_prev: z.boolean(),
  has_next: z.boolean()
});

export type PaginationResponse = z.infer<typeof paginationResponseSchema>;

export const postsResponseSchema = z.object({
  posts: z.array(postSchema),
  pagination: paginationResponseSchema
});

export type PostsResponse = z.infer<typeof postsResponseSchema>;

// RSS feed schema
export const rssConfigSchema = z.object({
  title: z.string(),
  description: z.string(),
  link: z.string().url(),
  language: z.string().default('en'),
  copyright: z.string().optional(),
  managingEditor: z.string().optional(),
  webMaster: z.string().optional()
});

export type RssConfig = z.infer<typeof rssConfigSchema>;

// Site settings schema
export const siteSettingsSchema = z.object({
  id: z.number(),
  site_title: z.string(),
  site_description: z.string(),
  site_url: z.string().url(),
  admin_email: z.string().email(),
  posts_per_page: z.number().int().positive(),
  comments_enabled: z.boolean(),
  comment_moderation: z.boolean(),
  allow_registration: z.boolean(),
  default_user_role: z.enum(['admin', 'editor', 'author']),
  timezone: z.string(),
  date_format: z.string(),
  time_format: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const updateSiteSettingsInputSchema = z.object({
  site_title: z.string().min(1).optional(),
  site_description: z.string().optional(),
  site_url: z.string().url().optional(),
  admin_email: z.string().email().optional(),
  posts_per_page: z.number().int().positive().optional(),
  comments_enabled: z.boolean().optional(),
  comment_moderation: z.boolean().optional(),
  allow_registration: z.boolean().optional(),
  default_user_role: z.enum(['admin', 'editor', 'author']).optional(),
  timezone: z.string().optional(),
  date_format: z.string().optional(),
  time_format: z.string().optional()
});

export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsInputSchema>;