import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/App';
import type { Post, CreatePostInput, UpdatePostInput, Category, Tag } from '../../../server/src/schema';

function PostsManager() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  const [formData, setFormData] = useState<CreatePostInput>({
    title: '',
    slug: '',
    excerpt: null,
    content: '',
    status: 'draft',
    featured_image_id: null,
    author_id: user?.id || 1,
    category_id: null,
    meta_title: null,
    meta_description: null,
    canonical_url: null,
    published_at: null,
    tag_ids: []
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [postsResponse, categoriesData, tagsData] = await Promise.all([
        trpc.posts.list.query({ 
          status: filter === 'all' ? undefined : filter,
          page: 1, 
          limit: 50 
        }),
        trpc.categories.list.query(),
        trpc.tags.list.query()
      ]);
      
      setPosts(postsResponse.posts);
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to load posts data:', error);
      // Mock data for demo
      setPosts([
        {
          id: 1,
          title: 'Welcome to BlogCMS Pro',
          slug: 'welcome-to-blogcms-pro',
          excerpt: 'Getting started with your new blog management system',
          content: '# Welcome!\n\nThis is your first blog post. Start creating amazing content!',
          status: 'published' as const,
          featured_image_id: null,
          author_id: 1,
          category_id: 1,
          meta_title: null,
          meta_description: null,
          canonical_url: null,
          published_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          title: 'How to Create Engaging Content',
          slug: 'how-to-create-engaging-content',
          excerpt: 'Tips and tricks for writing blog posts that captivate your audience',
          content: '# Creating Engaging Content\n\nHere are some tips...',
          status: 'draft' as const,
          featured_image_id: null,
          author_id: 1,
          category_id: 2,
          meta_title: null,
          meta_description: null,
          canonical_url: null,
          published_at: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
      setCategories([
        { id: 1, name: 'Getting Started', slug: 'getting-started', description: null, parent_id: null, meta_title: null, meta_description: null, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'Tutorials', slug: 'tutorials', description: null, parent_id: null, meta_title: null, meta_description: null, created_at: new Date(), updated_at: new Date() }
      ]);
      setTags([
        { id: 1, name: 'Blog', slug: 'blog', description: null, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'CMS', slug: 'cms', description: null, created_at: new Date(), updated_at: new Date() }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingPost) {
        const updateData: UpdatePostInput = {
          id: editingPost.id,
          ...formData
        };
        const updatedPost = await trpc.posts.update.mutate(updateData);
        setPosts((prev: Post[]) => 
          prev.map((post: Post) => post.id === editingPost.id ? updatedPost : post)
        );
        setEditingPost(null);
      } else {
        const newPost = await trpc.posts.create.mutate(formData);
        setPosts((prev: Post[]) => [newPost, ...prev]);
        setIsCreateDialogOpen(false);
      }

      // Reset form
      setFormData({
        title: '',
        slug: '',
        excerpt: null,
        content: '',
        status: 'draft',
        featured_image_id: null,
        author_id: user?.id || 1,
        category_id: null,
        meta_title: null,
        meta_description: null,
        canonical_url: null,
        published_at: null,
        tag_ids: []
      });
    } catch (error) {
      console.error('Failed to save post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (post: Post) => {
    try {
      const publishedPost = await trpc.posts.publish.mutate({ id: post.id });
      setPosts((prev: Post[]) => 
        prev.map((p: Post) => p.id === post.id ? publishedPost : p)
      );
    } catch (error) {
      console.error('Failed to publish post:', error);
    }
  };

  const handleArchive = async (post: Post) => {
    try {
      const archivedPost = await trpc.posts.archive.mutate({ id: post.id });
      setPosts((prev: Post[]) => 
        prev.map((p: Post) => p.id === post.id ? archivedPost : p)
      );
    } catch (error) {
      console.error('Failed to archive post:', error);
    }
  };

  const handleDelete = async (postId: number) => {
    try {
      await trpc.posts.delete.mutate({ id: postId });
      setPosts((prev: Post[]) => prev.filter((post: Post) => post.id !== postId));
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const startEdit = (post: Post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      status: post.status,
      featured_image_id: post.featured_image_id,
      author_id: post.author_id,
      category_id: post.category_id,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      canonical_url: post.canonical_url,
      published_at: post.published_at,
      tag_ids: []
    });
  };

  const filteredPosts = posts.filter((post: Post) => {
    if (filter === 'all') return true;
    return post.status === filter;
  });

  if (isLoading && posts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📝 Posts Management</h2>
          <p className="text-gray-600">Create and manage your blog posts</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              ➕ Create Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
              <DialogDescription>
                Write and publish your blog content
              </DialogDescription>
            </DialogHeader>
            <PostForm
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              tags={tags}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              generateSlug={generateSlug}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        {(['all', 'published', 'draft', 'archived'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status === 'all' ? '📄 All' : 
             status === 'published' ? '✅ Published' :
             status === 'draft' ? '📝 Drafts' : '📦 Archived'}
            <Badge variant="secondary" className="ml-2">
              {status === 'all' ? posts.length : posts.filter(p => p.status === status).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No posts yet' : `No ${filter} posts`}
            </h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Create your first blog post to get started!'
                : `You don't have any ${filter} posts.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPosts.map((post: Post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={
                      post.status === 'published' ? 'default' : 
                      post.status === 'draft' ? 'secondary' : 'destructive'
                    }
                  >
                    {post.status}
                  </Badge>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(post)}
                    >
                      ✏️ Edit
                    </Button>
                    {post.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handlePublish(post)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        🚀 Publish
                      </Button>
                    )}
                    {post.status === 'published' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArchive(post)}
                      >
                        📦 Archive
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          🗑️ Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Post</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{post.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(post.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardTitle className="text-lg">{post.title}</CardTitle>
                <CardDescription>{post.slug}</CardDescription>
              </CardHeader>
              <CardContent>
                {post.excerpt && (
                  <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
                )}
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Created: {post.created_at.toLocaleDateString()}</p>
                  {post.published_at && (
                    <p>Published: {post.published_at.toLocaleDateString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingPost && (
        <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
              <DialogDescription>
                Update your blog post content and settings
              </DialogDescription>
            </DialogHeader>
            <PostForm
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              tags={tags}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              generateSlug={generateSlug}
              isEditing={true}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface PostFormProps {
  formData: CreatePostInput;
  setFormData: (data: CreatePostInput) => void;
  categories: Category[];
  tags: Tag[];
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  generateSlug: (title: string) => string;
  isEditing?: boolean;
}

function PostForm({ formData, setFormData, categories, tags, onSubmit, isLoading, generateSlug, isEditing = false }: PostFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const newTitle = e.target.value;
              setFormData({
                ...formData,
                title: newTitle,
                slug: generateSlug(newTitle)
              });
            }}
            placeholder="Enter post title"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, slug: e.target.value })
            }
            placeholder="url-friendly-slug"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          value={formData.excerpt || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData({ ...formData, excerpt: e.target.value || null })
          }
          placeholder="Brief description of the post"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content *</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData({ ...formData, content: e.target.value })
          }
          placeholder="Write your post content here..."
          rows={10}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select 
            value={formData.status} 
            onValueChange={(value: 'draft' | 'published' | 'archived') =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">📝 Draft</SelectItem>
              <SelectItem value="published">✅ Published</SelectItem>
              <SelectItem value="archived">📦 Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select 
            value={formData.category_id?.toString() || ''} 
            onValueChange={(value: string) =>
              setFormData({ ...formData, category_id: value ? parseInt(value) : null })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No category</SelectItem>
              {categories.map((category: Category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">SEO Settings</h4>
        
        <div className="space-y-2">
          <Label htmlFor="meta_title">Meta Title</Label>
          <Input
            id="meta_title"
            value={formData.meta_title || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, meta_title: e.target.value || null })
            }
            placeholder="SEO title for search engines"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta_description">Meta Description</Label>
          <Textarea
            id="meta_description"
            value={formData.meta_description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData({ ...formData, meta_description: e.target.value || null })
            }
            placeholder="SEO description for search engines"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isEditing ? 'Updating...' : 'Creating...'}
            </div>
          ) : (
            isEditing ? '✅ Update Post' : '🚀 Create Post'
          )}
        </Button>
      </div>
    </form>
  );
}

export default PostsManager;