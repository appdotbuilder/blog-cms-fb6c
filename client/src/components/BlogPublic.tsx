import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import type { Post, Category, Tag, Comment, CreateCommentInput, SearchPostsInput } from '../../../server/src/schema';

function BlogPublic() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);

  const [commentForm, setCommentForm] = useState<CreateCommentInput>({
    post_id: 0,
    author_name: '',
    author_email: '',
    author_website: null,
    content: '',
    parent_id: null
  });

  const loadBlogData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const searchParams: SearchPostsInput = {
        status: 'published',
        page: 1,
        limit: 20,
        sort_by: 'published_at',
        sort_order: 'desc'
      };

      if (searchQuery) searchParams.query = searchQuery;
      if (selectedCategory) searchParams.category_id = parseInt(selectedCategory);

      const [postsResponse, categoriesData, tagsData] = await Promise.all([
        trpc.posts.list.query(searchParams),
        trpc.categories.list.query(),
        trpc.tags.list.query()
      ]);
      
      setPosts(postsResponse.posts);
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to load blog data:', error);
      // Mock data for demo
      setPosts([
        {
          id: 1,
          title: 'Welcome to Our Blog! 🎉',
          slug: 'welcome-to-our-blog',
          excerpt: 'We\'re excited to share our thoughts, tutorials, and insights with you. This is the beginning of an amazing journey in content creation.',
          content: `# Welcome to Our Blog! 🎉

We're thrilled to have you here! This blog represents our passion for sharing knowledge, insights, and experiences with our community.

## What You Can Expect

- **In-depth Tutorials**: Step-by-step guides to help you learn new skills
- **Industry Insights**: Our thoughts on the latest trends and developments
- **Behind the Scenes**: A look at how we work and what inspires us
- **Community Stories**: Featuring amazing contributions from our readers

## Getting Started

Feel free to browse our categories, search for topics that interest you, and don't forget to leave comments! We love hearing from our readers and building meaningful conversations.

Thank you for being part of our journey!`,
          status: 'published' as const,
          featured_image_id: null,
          author_id: 1,
          category_id: 1,
          meta_title: 'Welcome to Our Amazing Blog',
          meta_description: 'Join us on this exciting journey of sharing knowledge and building community',
          canonical_url: null,
          published_at: new Date('2024-01-15'),
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15')
        },
        {
          id: 2,
          title: 'The Art of Content Creation ✍️',
          slug: 'art-of-content-creation',
          excerpt: 'Creating engaging content is both an art and a science. Learn the techniques that make content memorable and impactful.',
          content: `# The Art of Content Creation ✍️

Creating content that resonates with your audience requires more than just good writing skills. It's about understanding your readers, crafting compelling narratives, and delivering value in every piece.

## Key Principles

### 1. Know Your Audience 🎯
Understanding who you're writing for is fundamental. Consider:
- Their interests and pain points
- Their level of expertise
- How they consume content

### 2. Tell Stories 📖
Humans are wired for stories. Incorporate:
- Personal experiences
- Case studies
- Metaphors and analogies

### 3. Provide Value 💎
Every piece of content should:
- Solve a problem
- Teach something new
- Inspire action

## Practical Tips

- **Start with an outline** - Structure your thoughts before writing
- **Use engaging headlines** - Your title is your first impression
- **Include visuals** - Break up text with images, diagrams, or videos
- **Edit ruthlessly** - Remove unnecessary words and clarify your message

Remember, great content creation is an iterative process. Keep writing, keep learning, and keep improving!`,
          status: 'published' as const,
          featured_image_id: null,
          author_id: 1,
          category_id: 2,
          meta_title: null,
          meta_description: null,
          canonical_url: null,
          published_at: new Date('2024-01-10'),
          created_at: new Date('2024-01-10'),
          updated_at: new Date('2024-01-10')
        }
      ]);

      setCategories([
        { id: 1, name: 'General', slug: 'general', description: 'General blog posts', parent_id: null, meta_title: null, meta_description: null, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'Tutorials', slug: 'tutorials', description: 'How-to guides and tutorials', parent_id: null, meta_title: null, meta_description: null, created_at: new Date(), updated_at: new Date() }
      ]);

      setTags([
        { id: 1, name: 'Welcome', slug: 'welcome', description: null, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'Content', slug: 'content', description: null, created_at: new Date(), updated_at: new Date() },
        { id: 3, name: 'Writing', slug: 'writing', description: null, created_at: new Date(), updated_at: new Date() }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    loadBlogData();
  }, [loadBlogData]);

  const loadPostComments = async (postId: number) => {
    try {
      const postComments = await trpc.comments.getByPost.query({ postId });
      setComments(postComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
      // Mock comments for demo
      setComments([
        {
          id: 1,
          post_id: postId,
          author_name: 'Sarah Johnson',
          author_email: 'sarah@example.com',
          author_website: 'https://sarahj.dev',
          content: 'This is exactly what I needed to read today! Thank you for sharing such valuable insights.',
          status: 'approved' as const,
          parent_id: null,
          created_at: new Date('2024-01-16'),
          updated_at: new Date('2024-01-16')
        },
        {
          id: 2,
          post_id: postId,
          author_name: 'Mike Developer',
          author_email: 'mike@example.com',
          author_website: null,
          content: 'Great post! I especially loved the section about storytelling. Do you have any book recommendations on this topic?',
          status: 'approved' as const,
          parent_id: null,
          created_at: new Date('2024-01-17'),
          updated_at: new Date('2024-01-17')
        }
      ]);
    }
  };

  const handlePostClick = async (post: Post) => {
    setSelectedPost(post);
    await loadPostComments(post.id);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost) return;

    try {
      const newComment = await trpc.comments.create.mutate({
        ...commentForm,
        post_id: selectedPost.id
      });
      
      setComments((prev: Comment[]) => [...prev, newComment]);
      setCommentForm({
        post_id: selectedPost.id,
        author_name: '',
        author_email: '',
        author_website: null,
        content: '',
        parent_id: null
      });
      setIsCommentDialogOpen(false);
    } catch (error) {
      console.error('Failed to submit comment:', error);
    }
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return null;
    const category = categories.find((cat: Category) => cat.id === categoryId);
    return category?.name;
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-6"></div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading Blog...</h2>
        <p className="text-gray-600">Getting the latest posts ready for you</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          📰 Welcome to Our Blog
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Discover insights, tutorials, and stories from our team. 
          Stay updated with the latest trends and learn something new every day.
        </p>
      </div>

      {/* Search and Filter */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="🔍 Search posts..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="bg-white"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="📁 All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map((category: Category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    📁 {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <div className="text-6xl mb-6">📝</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              {searchQuery ? 'No posts found' : 'No posts yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? `We couldn't find any posts matching "${searchQuery}"`
                : 'Check back soon for exciting new content!'
              }
            </p>
            {searchQuery && (
              <Button onClick={() => setSearchQuery('')} variant="outline">
                🔄 Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post: Post) => (
            <Card 
              key={post.id} 
              className="hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              onClick={() => handlePostClick(post)}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {post.category_id && (
                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                        📁 {getCategoryName(post.category_id)}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {post.published_at?.toLocaleDateString()}
                  </span>
                </div>
                <CardTitle className="text-xl hover:text-indigo-600 transition-colors">
                  {post.title}
                </CardTitle>
                <CardDescription className="line-clamp-3">
                  {post.excerpt}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>👁️ Click to read more</span>
                  <span>📝 {post.content.length > 500 ? Math.ceil(post.content.length / 250) : 1} min read</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Widget */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">📁 Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((category: Category) => (
                <Button
                  key={category.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategory(category.id.toString())}
                  className="hover:bg-indigo-50"
                >
                  📁 {category.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tags Widget */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">🏷️ Popular Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 10).map((tag: Tag) => (
                <Badge key={tag.id} variant="outline" className="hover:bg-purple-50 cursor-pointer">
                  #{tag.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {selectedPost.category_id && (
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                      📁 {getCategoryName(selectedPost.category_id)}
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500">
                    📅 {selectedPost.published_at?.toLocaleDateString()}
                  </span>
                </div>
                <DialogTitle className="text-2xl leading-relaxed">
                  {selectedPost.title}
                </DialogTitle>
                {selectedPost.excerpt && (
                  <DialogDescription className="text-lg text-gray-600">
                    {selectedPost.excerpt}
                  </DialogDescription>
                )}
              </div>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Post Content */}
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {selectedPost.content}
                </div>
              </div>

              <Separator />

              {/* Comments Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">💬 Comments ({comments.length})</h3>
                  <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-indigo-600 hover:bg-indigo-700">
                        ✍️ Add Comment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add a Comment</DialogTitle>
                        <DialogDescription>
                          Share your thoughts on this post
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCommentSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Your Name *</Label>
                            <Input
                              value={commentForm.author_name}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setCommentForm({ ...commentForm, author_name: e.target.value })
                              }
                              placeholder="Enter your name"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Your Email *</Label>
                            <Input
                              type="email"
                              value={commentForm.author_email}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setCommentForm({ ...commentForm, author_email: e.target.value })
                              }
                              placeholder="Enter your email"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Website (Optional)</Label>
                          <Input
                            type="url"
                            value={commentForm.author_website || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCommentForm({ ...commentForm, author_website: e.target.value || null })
                            }
                            placeholder="https://yourwebsite.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Comment *</Label>
                          <Textarea
                            value={commentForm.content}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                              setCommentForm({ ...commentForm, content: e.target.value })
                            }
                            placeholder="Share your thoughts..."
                            rows={4}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                          🚀 Submit Comment
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {comments.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <div className="text-4xl mb-4">💭</div>
                    <p className="text-gray-600">No comments yet. Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.filter((comment: Comment) => comment.status === 'approved').map((comment: Comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium">
                              {comment.author_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{comment.author_name}</p>
                              <p className="text-sm text-gray-500">
                                {comment.created_at.toLocaleDateString()} at {comment.created_at.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          {comment.author_website && (
                            <a 
                              href={comment.author_website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 text-sm"
                            >
                              🌐 Website
                            </a>
                          )}
                        </div>
                        <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default BlogPublic;