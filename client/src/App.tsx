import { useState, useEffect, createContext, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';

// Import components
import Dashboard from '@/components/Dashboard';
import PostsManager from '@/components/PostsManager';
import CategoriesManager from '@/components/CategoriesManager';
import TagsManager from '@/components/TagsManager';
import MediaLibrary from '@/components/MediaLibrary';
import UsersManager from '@/components/UsersManager';
import CommentsManager from '@/components/CommentsManager';
import SettingsManager from '@/components/SettingsManager';
import AuthLogin from '@/components/AuthLogin';
import BlogPublic from '@/components/BlogPublic';

// Import types
import type { User } from '../../server/src/schema';

// Auth Context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {}
});

export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'admin' | 'public'>('public');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth token on app load
    const token = localStorage.getItem('auth_token');
    if (token) {
      verifyToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await trpc.auth.verify.query({ token });
      // Mock user for demo - in real app this would come from verify response
      setUser({
        id: 1,
        email: 'admin@blogcms.com',
        username: 'admin',
        password_hash: '',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin' as const,
        bio: 'Blog Administrator',
        avatar_url: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    } catch (error) {
      localStorage.removeItem('auth_token');
      console.error('Token verification failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await trpc.auth.login.mutate({ email, password });
      // In real implementation, response would include token and user data
      localStorage.setItem('auth_token', 'mock-token');
      setUser({
        id: 1,
        email,
        username: email.split('@')[0],
        password_hash: '',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin' as const,
        bio: 'Blog Administrator',
        avatar_url: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    } catch (error) {
      throw new Error('Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setCurrentView('public');
  };

  const authContextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Blog CMS...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
        {/* Navigation Header */}
        <nav className="bg-white shadow-lg border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-indigo-600">
                  📝 BlogCMS Pro
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant={currentView === 'public' ? 'default' : 'outline'}
                  onClick={() => setCurrentView('public')}
                  className="text-sm"
                >
                  🌐 Public Blog
                </Button>
                {user && (
                  <Button
                    variant={currentView === 'admin' ? 'default' : 'outline'}
                    onClick={() => setCurrentView('admin')}
                    className="text-sm"
                  >
                    ⚙️ Admin Panel
                  </Button>
                )}
                {user ? (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-700">
                      👋 {user.first_name} ({user.role})
                    </span>
                    <Button variant="outline" size="sm" onClick={logout}>
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setCurrentView('admin')}
                  >
                    Admin Login
                  </Button>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {currentView === 'public' ? (
            <BlogPublic />
          ) : user ? (
            <AdminPanel />
          ) : (
            <div className="max-w-md mx-auto">
              <Card className="shadow-xl border-0 bg-white/90 backdrop-blur">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">Admin Login</h2>
                    <p className="text-gray-600 mt-2">Access the BlogCMS administration panel</p>
                  </div>
                  <AuthLogin />
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </AuthContext.Provider>
  );
}

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🎛️ Administration Panel
        </h2>
        <p className="text-gray-600">
          Manage your blog content, users, and settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-8">
          <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
          <TabsTrigger value="posts">📝 Posts</TabsTrigger>
          <TabsTrigger value="categories">📁 Categories</TabsTrigger>
          <TabsTrigger value="tags">🏷️ Tags</TabsTrigger>
          <TabsTrigger value="media">🖼️ Media</TabsTrigger>
          <TabsTrigger value="comments">💬 Comments</TabsTrigger>
          <TabsTrigger value="users">👥 Users</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
        </TabsList>

        <div className="bg-white rounded-lg shadow-sm border">
          <TabsContent value="dashboard" className="m-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="posts" className="m-6">
            <PostsManager />
          </TabsContent>

          <TabsContent value="categories" className="m-6">
            <CategoriesManager />
          </TabsContent>

          <TabsContent value="tags" className="m-6">
            <TagsManager />
          </TabsContent>

          <TabsContent value="media" className="m-6">
            <MediaLibrary />
          </TabsContent>

          <TabsContent value="comments" className="m-6">
            <CommentsManager />
          </TabsContent>

          <TabsContent value="users" className="m-6">
            <UsersManager />
          </TabsContent>

          <TabsContent value="settings" className="m-6">
            <SettingsManager />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default App;