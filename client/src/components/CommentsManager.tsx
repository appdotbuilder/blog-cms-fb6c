import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/utils/trpc';
import type { Comment } from '../../../server/src/schema';

function CommentsManager() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'spam' | 'rejected'>('all');

  const loadComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allCommentsResponse, pending] = await Promise.all([
        trpc.comments.getAll.query({ page: 1, limit: 100 }),
        trpc.comments.getPending.query()
      ]);
      
      setComments(allCommentsResponse.comments);
      setPendingComments(pending);
    } catch (error) {
      console.error('Failed to load comments:', error);
      // Mock data for demo
      const mockComments: Comment[] = [
        {
          id: 1,
          post_id: 1,
          author_name: 'Jane Reader',
          author_email: 'jane@example.com',
          author_website: 'https://jane.dev',
          content: 'Great post! This really helped me understand the concepts better. Looking forward to more content like this.',
          status: 'approved' as const,
          parent_id: null,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          post_id: 1,
          author_name: 'John Developer',
          author_email: 'john@example.com',
          author_website: null,
          content: 'Thanks for sharing! I have a question about the implementation details mentioned in section 3.',
          status: 'pending' as const,
          parent_id: null,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 3,
          post_id: 2,
          author_name: 'Spam Bot',
          author_email: 'spam@fake.com',
          author_website: 'https://suspicious-site.com',
          content: 'Click here to win $1000! Amazing offer for limited time only!!!',
          status: 'spam' as const,
          parent_id: null,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 4,
          post_id: 1,
          author_name: 'Sarah Designer',
          author_email: 'sarah@example.com',
          author_website: null,
          content: 'I disagree with this approach. Have you considered alternative solutions?',
          status: 'rejected' as const,
          parent_id: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      
      setComments(mockComments);
      setPendingComments(mockComments.filter(c => c.status === 'pending'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleApprove = async (commentId: number) => {
    try {
      await trpc.comments.approve.mutate({ id: commentId });
      setComments((prev: Comment[]) => 
        prev.map((comment: Comment) => 
          comment.id === commentId ? { ...comment, status: 'approved' as const } : comment
        )
      );
      setPendingComments((prev: Comment[]) => 
        prev.filter((comment: Comment) => comment.id !== commentId)
      );
    } catch (error) {
      console.error('Failed to approve comment:', error);
    }
  };

  const handleReject = async (commentId: number) => {
    try {
      await trpc.comments.reject.mutate({ id: commentId });
      setComments((prev: Comment[]) => 
        prev.map((comment: Comment) => 
          comment.id === commentId ? { ...comment, status: 'rejected' as const } : comment
        )
      );
      setPendingComments((prev: Comment[]) => 
        prev.filter((comment: Comment) => comment.id !== commentId)
      );
    } catch (error) {
      console.error('Failed to reject comment:', error);
    }
  };

  const handleMarkSpam = async (commentId: number) => {
    try {
      await trpc.comments.markSpam.mutate({ id: commentId });
      setComments((prev: Comment[]) => 
        prev.map((comment: Comment) => 
          comment.id === commentId ? { ...comment, status: 'spam' as const } : comment
        )
      );
      setPendingComments((prev: Comment[]) => 
        prev.filter((comment: Comment) => comment.id !== commentId)
      );
    } catch (error) {
      console.error('Failed to mark as spam:', error);
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await trpc.comments.delete.mutate({ id: commentId });
      setComments((prev: Comment[]) => prev.filter((comment: Comment) => comment.id !== commentId));
      setPendingComments((prev: Comment[]) => prev.filter((comment: Comment) => comment.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅';
      case 'pending': return '⏳';
      case 'spam': return '🚫';
      case 'rejected': return '❌';
      default: return '💬';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'spam': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const filteredComments = comments.filter((comment: Comment) => {
    if (filter === 'all') return true;
    return comment.status === filter;
  });

  if (isLoading && comments.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">💬 Comments Management</h2>
          <p className="text-gray-600">Moderate and manage reader comments</p>
        </div>
        {pendingComments.length > 0 && (
          <Badge className="bg-yellow-500 text-white">
            {pendingComments.length} pending review
          </Badge>
        )}
      </div>

      {/* Pending Comments Alert */}
      {pendingComments.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-800">
              ⏳ Comments Awaiting Moderation
            </CardTitle>
            <CardDescription className="text-yellow-700">
              {pendingComments.length} comment{pendingComments.length !== 1 ? 's' : ''} need{pendingComments.length === 1 ? 's' : ''} your review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingComments.slice(0, 3).map((comment: Comment) => (
                <div key={comment.id} className="bg-white rounded-lg p-3 border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-yellow-100">
                          {comment.author_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{comment.author_name}</span>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" onClick={() => handleApprove(comment.id)} className="h-7 text-xs bg-green-600 hover:bg-green-700">
                        ✅ Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(comment.id)} className="h-7 text-xs">
                        ❌ Reject
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{comment.content}</p>
                </div>
              ))}
              {pendingComments.length > 3 && (
                <p className="text-sm text-yellow-700 text-center">
                  And {pendingComments.length - 3} more pending comments...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-2 flex-wrap">
        {(['all', 'pending', 'approved', 'spam', 'rejected'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {getStatusIcon(status)} {status}
            <Badge variant="secondary" className="ml-2">
              {status === 'all' ? comments.length : comments.filter(c => c.status === status).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Comments List */}
      {filteredComments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No comments yet' : `No ${filter} comments`}
            </h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Comments from readers will appear here!'
                : `No comments with status "${filter}".`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment: Comment) => (
            <Card key={comment.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-indigo-100 text-indigo-600">
                        {comment.author_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{comment.author_name}</h4>
                        <Badge className={`text-xs ${getStatusColor(comment.status)}`}>
                          {getStatusIcon(comment.status)} {comment.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>📧 {comment.author_email}</p>
                        {comment.author_website && (
                          <p>🌐 <a href={comment.author_website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            {comment.author_website}
                          </a></p>
                        )}
                        <p>📅 {comment.created_at.toLocaleDateString()} at {comment.created_at.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {comment.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => handleApprove(comment.id)} className="bg-green-600 hover:bg-green-700">
                          ✅ Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(comment.id)}>
                          ❌ Reject
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleMarkSpam(comment.id)}>
                          🚫 Spam
                        </Button>
                      </>
                    )}
                    {comment.status === 'approved' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleReject(comment.id)}>
                          ❌ Reject
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleMarkSpam(comment.id)}>
                          🚫 Spam
                        </Button>
                      </>
                    )}
                    {(comment.status === 'rejected' || comment.status === 'spam') && (
                      <Button size="sm" onClick={() => handleApprove(comment.id)} className="bg-green-600 hover:bg-green-700">
                        ✅ Approve
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
                          <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to permanently delete this comment from {comment.author_name}? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(comment.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>
                </div>
                
                {comment.parent_id && (
                  <div className="text-sm text-gray-500 border-l-4 border-gray-300 pl-3">
                    💬 This is a reply to another comment
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {pendingComments.length > 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="text-center py-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Actions</h3>
            <p className="text-gray-600 mb-4">Manage multiple pending comments at once</p>
            <div className="flex justify-center space-x-2">
              <Button
                onClick={() => {
                  // Approve all pending - would implement this
                  console.log('Approve all pending comments');
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                ✅ Approve All Pending
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  // Mark all pending as spam - would implement this
                  console.log('Mark all pending as spam');
                }}
              >
                🚫 Mark All as Spam
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CommentsManager;