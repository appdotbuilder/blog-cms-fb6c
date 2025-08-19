import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/App';
import type { User, CreateUserInput, UpdateUserInput } from '../../../server/src/schema';

function UsersManager() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filter, setFilter] = useState<'all' | 'admin' | 'editor' | 'author'>('all');

  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'author',
    bio: null,
    avatar_url: null
  });

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.users.list.query();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      // Mock data for demo
      setUsers([
        {
          id: 1,
          email: 'admin@blogcms.com',
          username: 'admin',
          password_hash: 'hashed',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin' as const,
          bio: 'Blog administrator with full access',
          avatar_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          email: 'editor@example.com',
          username: 'editor',
          password_hash: 'hashed',
          first_name: 'Jane',
          last_name: 'Editor',
          role: 'editor' as const,
          bio: 'Content editor and reviewer',
          avatar_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 3,
          email: 'author@example.com',
          username: 'author',
          password_hash: 'hashed',
          first_name: 'John',
          last_name: 'Writer',
          role: 'author' as const,
          bio: 'Passionate writer and blogger',
          avatar_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingUser) {
        const updateData: UpdateUserInput = {
          id: editingUser.id,
          email: formData.email,
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          bio: formData.bio,
          avatar_url: formData.avatar_url
        };
        const updatedUser = await trpc.users.update.mutate(updateData);
        setUsers((prev: User[]) => 
          prev.map((user: User) => user.id === editingUser.id ? updatedUser : user)
        );
        setEditingUser(null);
      } else {
        const newUser = await trpc.users.create.mutate(formData);
        setUsers((prev: User[]) => [...prev, newUser]);
        setIsCreateDialogOpen(false);
      }

      // Reset form
      setFormData({
        email: '',
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'author',
        bio: null,
        avatar_url: null
      });
    } catch (error) {
      console.error('Failed to save user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      await trpc.users.delete.mutate({ id: userId });
      setUsers((prev: User[]) => prev.filter((user: User) => user.id !== userId));
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      username: user.username,
      password: '', // Don't show current password
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      bio: user.bio,
      avatar_url: user.avatar_url
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return '👑';
      case 'editor': return '✏️';
      case 'author': return '📝';
      default: return '👤';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'editor': return 'secondary';
      case 'author': return 'outline';
      default: return 'outline';
    }
  };

  const filteredUsers = users.filter((user: User) => {
    if (filter === 'all') return true;
    return user.role === filter;
  });

  if (isLoading && users.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">👥 User Management</h2>
          <p className="text-gray-600">Manage blog authors, editors, and administrators</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              ➕ Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to your blog team
              </DialogDescription>
            </DialogHeader>
            <UserForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        {(['all', 'admin', 'editor', 'author'] as const).map((role) => (
          <Button
            key={role}
            variant={filter === role ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(role)}
            className="capitalize"
          >
            {role === 'all' ? '👥 All' : `${getRoleIcon(role)} ${role}s`}
            <Badge variant="secondary" className="ml-2">
              {role === 'all' ? users.length : users.filter(u => u.role === role).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No users yet' : `No ${filter}s found`}
            </h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Add your first team member to get started!'
                : `No users with the ${filter} role.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user: User) => (
            <Card key={user.id} className={`hover:shadow-lg transition-shadow ${
              currentUser?.id === user.id ? 'ring-2 ring-indigo-500 ring-opacity-50' : ''
            }`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.first_name} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-600">
                        {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {user.first_name} {user.last_name}
                        {currentUser?.id === user.id && (
                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>@{user.username}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleIcon(user.role)} {user.role}
                    </Badge>
                    <div className={`h-3 w-3 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Joined:</strong> {user.created_at.toLocaleDateString()}</p>
                  </div>
                  
                  {user.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2">{user.bio}</p>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(user)}
                    >
                      ✏️ Edit
                    </Button>
                    {currentUser?.id !== user.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            🗑️ Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {user.first_name} {user.last_name}? 
                              This will also affect their posts and comments.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(user.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions
              </DialogDescription>
            </DialogHeader>
            <UserForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              isEditing={true}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface UserFormProps {
  formData: CreateUserInput;
  setFormData: (data: CreateUserInput) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  isEditing?: boolean;
}

function UserForm({ formData, setFormData, onSubmit, isLoading, isEditing = false }: UserFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, first_name: e.target.value })
            }
            placeholder="Enter first name"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, last_name: e.target.value })
            }
            placeholder="Enter last name"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, username: e.target.value })
            }
            placeholder="Enter username"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="Enter email address"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">
            Password {isEditing ? '(leave blank to keep current)' : '*'}
          </Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder="Enter password"
            required={!isEditing}
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Select 
            value={formData.role} 
            onValueChange={(value: 'admin' | 'editor' | 'author') =>
              setFormData({ ...formData, role: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="author">📝 Author - Can create and edit own posts</SelectItem>
              <SelectItem value="editor">✏️ Editor - Can edit all posts and manage content</SelectItem>
              <SelectItem value="admin">👑 Admin - Full access to everything</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={formData.bio || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData({ ...formData, bio: e.target.value || null })
          }
          placeholder="Tell us about yourself..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatar_url">Avatar URL</Label>
        <Input
          id="avatar_url"
          type="url"
          value={formData.avatar_url || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, avatar_url: e.target.value || null })
          }
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isEditing ? 'Updating...' : 'Creating...'}
            </div>
          ) : (
            isEditing ? '✅ Update User' : '🚀 Create User'
          )}
        </Button>
      </div>
    </form>
  );
}

export default UsersManager;