import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  boolean, 
  integer,
  pgEnum,
  varchar,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'editor', 'author']);
export const postStatusEnum = pgEnum('post_status', ['draft', 'published', 'archived']);
export const commentStatusEnum = pgEnum('comment_status', ['pending', 'approved', 'spam', 'rejected']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull().default('author'),
  bio: text('bio'),
  avatar_url: text('avatar_url'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  parent_id: integer('parent_id'),
  meta_title: varchar('meta_title', { length: 200 }),
  meta_description: text('meta_description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Tags table
export const tagsTable = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Media table
export const mediaTable = pgTable('media', {
  id: serial('id').primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  original_filename: varchar('original_filename', { length: 255 }).notNull(),
  file_path: text('file_path').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: varchar('mime_type', { length: 100 }).notNull(),
  alt_text: text('alt_text'),
  caption: text('caption'),
  uploaded_by: integer('uploaded_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Posts table
export const postsTable = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  status: postStatusEnum('status').notNull().default('draft'),
  featured_image_id: integer('featured_image_id'),
  author_id: integer('author_id').notNull(),
  category_id: integer('category_id'),
  meta_title: varchar('meta_title', { length: 200 }),
  meta_description: text('meta_description'),
  canonical_url: text('canonical_url'),
  published_at: timestamp('published_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Post-Tags junction table
export const postTagsTable = pgTable('post_tags', {
  post_id: integer('post_id').notNull(),
  tag_id: integer('tag_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.post_id, table.tag_id] })
}));

// Comments table
export const commentsTable = pgTable('comments', {
  id: serial('id').primaryKey(),
  post_id: integer('post_id').notNull(),
  author_name: varchar('author_name', { length: 100 }).notNull(),
  author_email: varchar('author_email', { length: 255 }).notNull(),
  author_website: text('author_website'),
  content: text('content').notNull(),
  status: commentStatusEnum('status').notNull().default('pending'),
  parent_id: integer('parent_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Site settings table
export const siteSettingsTable = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  site_title: varchar('site_title', { length: 200 }).notNull(),
  site_description: text('site_description').notNull(),
  site_url: text('site_url').notNull(),
  admin_email: varchar('admin_email', { length: 255 }).notNull(),
  posts_per_page: integer('posts_per_page').notNull().default(10),
  comments_enabled: boolean('comments_enabled').notNull().default(true),
  comment_moderation: boolean('comment_moderation').notNull().default(true),
  allow_registration: boolean('allow_registration').notNull().default(false),
  default_user_role: userRoleEnum('default_user_role').notNull().default('author'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  date_format: varchar('date_format', { length: 50 }).notNull().default('YYYY-MM-DD'),
  time_format: varchar('time_format', { length: 50 }).notNull().default('HH:mm:ss'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  posts: many(postsTable),
  media: many(mediaTable)
}));

export const categoriesRelations = relations(categoriesTable, ({ one, many }) => ({
  parent: one(categoriesTable, {
    fields: [categoriesTable.parent_id],
    references: [categoriesTable.id]
  }),
  children: many(categoriesTable),
  posts: many(postsTable)
}));

export const tagsRelations = relations(tagsTable, ({ many }) => ({
  postTags: many(postTagsTable)
}));

export const mediaRelations = relations(mediaTable, ({ one, many }) => ({
  uploadedBy: one(usersTable, {
    fields: [mediaTable.uploaded_by],
    references: [usersTable.id]
  }),
  featuredPosts: many(postsTable)
}));

export const postsRelations = relations(postsTable, ({ one, many }) => ({
  author: one(usersTable, {
    fields: [postsTable.author_id],
    references: [usersTable.id]
  }),
  category: one(categoriesTable, {
    fields: [postsTable.category_id],
    references: [categoriesTable.id]
  }),
  featuredImage: one(mediaTable, {
    fields: [postsTable.featured_image_id],
    references: [mediaTable.id]
  }),
  postTags: many(postTagsTable),
  comments: many(commentsTable)
}));

export const postTagsRelations = relations(postTagsTable, ({ one }) => ({
  post: one(postsTable, {
    fields: [postTagsTable.post_id],
    references: [postsTable.id]
  }),
  tag: one(tagsTable, {
    fields: [postTagsTable.tag_id],
    references: [tagsTable.id]
  })
}));

export const commentsRelations = relations(commentsTable, ({ one, many }) => ({
  post: one(postsTable, {
    fields: [commentsTable.post_id],
    references: [postsTable.id]
  }),
  parent: one(commentsTable, {
    fields: [commentsTable.parent_id],
    references: [commentsTable.id]
  }),
  replies: many(commentsTable)
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type Tag = typeof tagsTable.$inferSelect;
export type NewTag = typeof tagsTable.$inferInsert;

export type Media = typeof mediaTable.$inferSelect;
export type NewMedia = typeof mediaTable.$inferInsert;

export type Post = typeof postsTable.$inferSelect;
export type NewPost = typeof postsTable.$inferInsert;

export type PostTag = typeof postTagsTable.$inferSelect;
export type NewPostTag = typeof postTagsTable.$inferInsert;

export type Comment = typeof commentsTable.$inferSelect;
export type NewComment = typeof commentsTable.$inferInsert;

export type SiteSettings = typeof siteSettingsTable.$inferSelect;
export type NewSiteSettings = typeof siteSettingsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  categories: categoriesTable,
  tags: tagsTable,
  media: mediaTable,
  posts: postsTable,
  postTags: postTagsTable,
  comments: commentsTable,
  siteSettings: siteSettingsTable
};