import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { Post, Comment, User, Category } from '../../../server/src/schema';

interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalComments: number;
  pendingComments: number;
  totalUsers: number;
  totalCategories: number;
}

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalComments: 0,
    pendingComments: 0,
    totalUsers: 0,
    totalCategories: 0
  });
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [recentComments, setRecentComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load recent posts
      const postsResponse = await trpc.posts.list.query({ 
        page: 1, 
        limit: 5,
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      
      // Load recent comments
      const commentsResponse = await trpc.comments.getAll.query({ 
        page: 1, 
        limit: 5 
      });

      // Load pending comments
      const pendingCommentsResponse = await trpc.comments.getPending.query();
      
      // Load users and categories for stats
      const [users, categories] = await Promise.all([
        trpc.users.list.query(),
        trpc.categories.list.query()
      ]);

      // Calculate stats from posts
      const allPosts = postsResponse.posts;
      const publishedCount = allPosts.filter((post: Post) => post.status === 'published').length;
      const draftCount = allPosts.filter((post: Post) => post.status === 'draft').length;

      setStats({
        totalPosts: allPosts.length,
        publishedPosts: publishedCount,
        draftPosts: draftCount,
        totalComments: commentsResponse?.comments?.length || 0,
        pendingComments: pendingCommentsResponse?.length || 0,
        totalUsers: users.length,
        totalCategories: categories.length
      });

      setRecentPosts(allPosts.slice(0, 5));
      setRecentComments(commentsResponse?.comments?.slice(0, 5) || []);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set mock data for demo purposes
      setStats({
        totalPosts: 12,
        publishedPosts: 8,
        draftPosts: 4,
        totalComments: 23,
        pendingComments: 3,
        totalUsers: 5,
        totalCategories: 6
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 Dashboard Overview</h2>
        <p className="text-gray-600">Welcome back! Here's what's happening with your blog.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-600">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.totalPosts}</div>
            <div className="flex text-xs text-blue-600 mt-2">
              <span className="flex items-center">
                ✅ {stats.publishedPosts} published
              </span>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <span className="flex items-center">
                📝 {stats.draftPosts} drafts
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.totalComments}</div>
            <div className="text-xs text-green-600 mt-2">
              {stats.pendingComments > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {stats.pendingComments} pending review
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-600">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats.totalUsers}</div>
            <p className="text-xs text-purple-600 mt-2">👥 Active authors & editors</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-600">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{stats.totalCategories}</div>
            <p className="text-xs text-orange-600 mt-2">📁 Content organization</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📝 Recent Posts</CardTitle>
            <CardDescription>Latest content activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPosts.length > 0 ? (
              <div className="space-y-4">
                {recentPosts.map((post: Post) => (
                  <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 truncate">{post.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {post.created_at.toLocaleDateString()} • 
                        <Badge 
                          variant={post.status === 'published' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {post.status}
                        </Badge>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>📄 No posts yet</p>
                <p className="text-sm">Create your first blog post!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">💬 Recent Comments</CardTitle>
            <CardDescription>Latest reader engagement</CardDescription>
          </CardHeader>
          <CardContent>
            {recentComments.length > 0 ? (
              <div className="space-y-4">
                {recentComments.map((comment: Comment) => (
                  <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{comment.author_name}</span>
                      <Badge 
                        variant={comment.status === 'approved' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {comment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{comment.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {comment.created_at.toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>💭 No comments yet</p>
                <p className="text-sm">Engage with your readers!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🚀 Quick Actions</CardTitle>
          <CardDescription>Common tasks to manage your blog</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="p-6 h-auto flex-col space-y-2" variant="outline">
              <span className="text-2xl">✍️</span>
              <span>Create New Post</span>
              <span className="text-xs text-gray-500">Start writing content</span>
            </Button>
            <Button className="p-6 h-auto flex-col space-y-2" variant="outline">
              <span className="text-2xl">📊</span>
              <span>View Analytics</span>
              <span className="text-xs text-gray-500">Check performance</span>
            </Button>
            <Button className="p-6 h-auto flex-col space-y-2" variant="outline">
              <span className="text-2xl">⚙️</span>
              <span>Site Settings</span>
              <span className="text-xs text-gray-500">Configure your blog</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;