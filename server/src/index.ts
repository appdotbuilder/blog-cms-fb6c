import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import all schemas
import { z } from 'zod';
import {
  createUserInputSchema,
  updateUserInputSchema,
  loginInputSchema,
  createCategoryInputSchema,
  updateCategoryInputSchema,
  createTagInputSchema,
  updateTagInputSchema,
  createMediaInputSchema,
  updateMediaInputSchema,
  createPostInputSchema,
  updatePostInputSchema,
  createCommentInputSchema,
  updateCommentInputSchema,
  searchPostsInputSchema,
  updateSiteSettingsInputSchema,
  rssConfigSchema,
  postSchema
} from './schema';

// Import all handlers
// Authentication handlers
import { loginUser, verifyToken, refreshToken } from './handlers/auth';

// User management handlers
import { 
  createUser, 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser 
} from './handlers/users';

// Category handlers
import {
  createCategory,
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  getCategoryTree
} from './handlers/categories';

// Tag handlers
import {
  createTag,
  getTags,
  getTagById,
  getTagBySlug,
  updateTag,
  deleteTag,
  getPopularTags,
  searchTags
} from './handlers/tags';

// Media handlers
import {
  uploadMedia,
  getMediaLibrary,
  getMediaById,
  updateMedia,
  deleteMedia,
  getMediaByType,
  generateThumbnail
} from './handlers/media';

// Post handlers
import {
  createPost,
  getPosts,
  getPostById,
  getPostBySlug,
  updatePost,
  deletePost,
  publishPost,
  archivePost,
  getRelatedPosts,
  duplicatePost
} from './handlers/posts';

// Comment handlers
import {
  createComment,
  getCommentsByPost,
  getAllComments,
  getCommentById,
  updateCommentStatus,
  deleteComment,
  approveComment,
  rejectComment,
  markAsSpam,
  getPendingComments
} from './handlers/comments';

// Search handlers
import {
  searchPosts,
  searchSuggestions,
  getSearchAnalytics,
  indexPostForSearch,
  removePostFromSearchIndex,
  rebuildSearchIndex
} from './handlers/search';

// RSS handlers
import {
  generateRSSFeed,
  generateAtomFeed,
  generateCategoryRSSFeed,
  generateTagRSSFeed,
  generateAuthorRSSFeed
} from './handlers/rss';

// SEO handlers
import {
  generateSitemap,
  generateRobotsTxt,
  generatePostMetadata,
  generateStructuredData,
  analyzePostSEO,
  generateCanonicalUrl
} from './handlers/seo';

// Settings handlers
import {
  getSiteSettings,
  updateSiteSettings,
  resetToDefaults,
  getTimezones,
  validateSettings
} from './handlers/settings';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  auth: router({
    login: publicProcedure
      .input(loginInputSchema)
      .mutation(({ input }) => loginUser(input)),
    
    verify: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(({ input }) => verifyToken(input.token)),
    
    refresh: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(({ input }) => refreshToken(input.token))
  }),

  // User management routes
  users: router({
    create: publicProcedure
      .input(createUserInputSchema)
      .mutation(({ input }) => createUser(input)),
    
    list: publicProcedure
      .query(() => getUsers()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getUserById(input.id)),
    
    update: publicProcedure
      .input(updateUserInputSchema)
      .mutation(({ input }) => updateUser(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteUser(input.id))
  }),

  // Category routes
  categories: router({
    create: publicProcedure
      .input(createCategoryInputSchema)
      .mutation(({ input }) => createCategory(input)),
    
    list: publicProcedure
      .query(() => getCategories()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getCategoryById(input.id)),
    
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => getCategoryBySlug(input.slug)),
    
    update: publicProcedure
      .input(updateCategoryInputSchema)
      .mutation(({ input }) => updateCategory(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteCategory(input.id)),
    
    getTree: publicProcedure
      .query(() => getCategoryTree())
  }),

  // Tag routes
  tags: router({
    create: publicProcedure
      .input(createTagInputSchema)
      .mutation(({ input }) => createTag(input)),
    
    list: publicProcedure
      .query(() => getTags()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getTagById(input.id)),
    
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => getTagBySlug(input.slug)),
    
    update: publicProcedure
      .input(updateTagInputSchema)
      .mutation(({ input }) => updateTag(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteTag(input.id)),
    
    getPopular: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(({ input }) => getPopularTags(input.limit)),
    
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(({ input }) => searchTags(input.query))
  }),

  // Media routes
  media: router({
    upload: publicProcedure
      .input(createMediaInputSchema)
      .mutation(({ input }) => uploadMedia(input)),
    
    library: publicProcedure
      .input(z.object({ page: z.number().optional(), limit: z.number().optional() }))
      .query(({ input }) => getMediaLibrary(input.page, input.limit)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getMediaById(input.id)),
    
    update: publicProcedure
      .input(updateMediaInputSchema)
      .mutation(({ input }) => updateMedia(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteMedia(input.id)),
    
    getByType: publicProcedure
      .input(z.object({ mimeTypePrefix: z.string() }))
      .query(({ input }) => getMediaByType(input.mimeTypePrefix)),
    
    generateThumbnail: publicProcedure
      .input(z.object({ mediaId: z.number(), width: z.number(), height: z.number() }))
      .query(({ input }) => generateThumbnail(input.mediaId, input.width, input.height))
  }),

  // Post routes
  posts: router({
    create: publicProcedure
      .input(createPostInputSchema)
      .mutation(({ input }) => createPost(input)),
    
    list: publicProcedure
      .input(searchPostsInputSchema)
      .query(({ input }) => getPosts(input)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getPostById(input.id)),
    
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => getPostBySlug(input.slug)),
    
    update: publicProcedure
      .input(updatePostInputSchema)
      .mutation(({ input }) => updatePost(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deletePost(input.id)),
    
    publish: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => publishPost(input.id)),
    
    archive: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => archivePost(input.id)),
    
    getRelated: publicProcedure
      .input(z.object({ postId: z.number(), limit: z.number().optional() }))
      .query(({ input }) => getRelatedPosts(input.postId, input.limit)),
    
    duplicate: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => duplicatePost(input.id))
  }),

  // Comment routes
  comments: router({
    create: publicProcedure
      .input(createCommentInputSchema)
      .mutation(({ input }) => createComment(input)),
    
    getByPost: publicProcedure
      .input(z.object({ postId: z.number() }))
      .query(({ input }) => getCommentsByPost(input.postId)),
    
    getAll: publicProcedure
      .input(z.object({ page: z.number().optional(), limit: z.number().optional() }))
      .query(({ input }) => getAllComments(input.page, input.limit)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getCommentById(input.id)),
    
    updateStatus: publicProcedure
      .input(updateCommentInputSchema)
      .mutation(({ input }) => updateCommentStatus(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteComment(input.id)),
    
    approve: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => approveComment(input.id)),
    
    reject: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => rejectComment(input.id)),
    
    markSpam: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => markAsSpam(input.id)),
    
    getPending: publicProcedure
      .query(() => getPendingComments())
  }),

  // Search routes
  search: router({
    posts: publicProcedure
      .input(searchPostsInputSchema)
      .query(({ input }) => searchPosts(input)),
    
    suggestions: publicProcedure
      .input(z.object({ query: z.string(), limit: z.number().optional() }))
      .query(({ input }) => searchSuggestions(input.query, input.limit)),
    
    analytics: publicProcedure
      .query(() => getSearchAnalytics()),
    
    indexPost: publicProcedure
      .input(z.object({ post: postSchema }))
      .mutation(({ input }) => indexPostForSearch(input.post)),
    
    removeFromIndex: publicProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(({ input }) => removePostFromSearchIndex(input.postId)),
    
    rebuildIndex: publicProcedure
      .mutation(() => rebuildSearchIndex())
  }),

  // RSS/Feed routes
  feeds: router({
    rss: publicProcedure
      .input(rssConfigSchema.optional())
      .query(({ input }) => generateRSSFeed(input)),
    
    atom: publicProcedure
      .input(rssConfigSchema.optional())
      .query(({ input }) => generateAtomFeed(input)),
    
    categoryRss: publicProcedure
      .input(z.object({ categoryId: z.number(), config: rssConfigSchema.optional() }))
      .query(({ input }) => generateCategoryRSSFeed(input.categoryId, input.config)),
    
    tagRss: publicProcedure
      .input(z.object({ tagId: z.number(), config: rssConfigSchema.optional() }))
      .query(({ input }) => generateTagRSSFeed(input.tagId, input.config)),
    
    authorRss: publicProcedure
      .input(z.object({ authorId: z.number(), config: rssConfigSchema.optional() }))
      .query(({ input }) => generateAuthorRSSFeed(input.authorId, input.config))
  }),

  // SEO routes
  seo: router({
    sitemap: publicProcedure
      .query(() => generateSitemap()),
    
    robotsTxt: publicProcedure
      .query(() => generateRobotsTxt()),
    
    postMetadata: publicProcedure
      .input(z.object({ post: postSchema }))
      .query(({ input }) => generatePostMetadata(input.post)),
    
    structuredData: publicProcedure
      .input(z.object({ post: postSchema }))
      .query(({ input }) => generateStructuredData(input.post)),
    
    analyze: publicProcedure
      .input(z.object({ post: postSchema }))
      .query(({ input }) => analyzePostSEO(input.post)),
    
    canonicalUrl: publicProcedure
      .input(z.object({ post: postSchema }))
      .query(({ input }) => generateCanonicalUrl(input.post))
  }),

  // Settings routes
  settings: router({
    get: publicProcedure
      .query(() => getSiteSettings()),
    
    update: publicProcedure
      .input(updateSiteSettingsInputSchema)
      .mutation(({ input }) => updateSiteSettings(input)),
    
    reset: publicProcedure
      .mutation(() => resetToDefaults()),
    
    getTimezones: publicProcedure
      .query(() => getTimezones()),
    
    validate: publicProcedure
      .input(updateSiteSettingsInputSchema)
      .query(({ input }) => validateSettings(input))
  })
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Blog CMS TRPC server listening at port: ${port}`);
  console.log('Available routes:');
  console.log('  - Authentication: /trpc/auth.*');
  console.log('  - Users: /trpc/users.*');
  console.log('  - Categories: /trpc/categories.*');
  console.log('  - Tags: /trpc/tags.*');
  console.log('  - Media: /trpc/media.*');
  console.log('  - Posts: /trpc/posts.*');
  console.log('  - Comments: /trpc/comments.*');
  console.log('  - Search: /trpc/search.*');
  console.log('  - RSS Feeds: /trpc/feeds.*');
  console.log('  - SEO: /trpc/seo.*');
  console.log('  - Settings: /trpc/settings.*');
}

start();