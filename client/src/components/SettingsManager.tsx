import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { SiteSettings, UpdateSiteSettingsInput } from '../../../server/src/schema';

function SettingsManager() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const [formData, setFormData] = useState<UpdateSiteSettingsInput>({
    site_title: '',
    site_description: '',
    site_url: '',
    admin_email: '',
    posts_per_page: 10,
    comments_enabled: true,
    comment_moderation: true,
    allow_registration: false,
    default_user_role: 'author',
    timezone: 'UTC',
    date_format: 'MM/dd/yyyy',
    time_format: 'HH:mm'
  });

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.settings.get.query();
      if (data) {
        setSettings(data);
        setFormData({
          site_title: data.site_title,
          site_description: data.site_description,
          site_url: data.site_url,
          admin_email: data.admin_email,
          posts_per_page: data.posts_per_page,
          comments_enabled: data.comments_enabled,
          comment_moderation: data.comment_moderation,
          allow_registration: data.allow_registration,
          default_user_role: data.default_user_role,
          timezone: data.timezone,
          date_format: data.date_format,
          time_format: data.time_format
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Mock data for demo
      const mockSettings: SiteSettings = {
        id: 1,
        site_title: 'My Awesome Blog',
        site_description: 'A modern blog built with BlogCMS Pro',
        site_url: 'https://myblog.com',
        admin_email: 'admin@myblog.com',
        posts_per_page: 10,
        comments_enabled: true,
        comment_moderation: true,
        allow_registration: false,
        default_user_role: 'author' as const,
        timezone: 'UTC',
        date_format: 'MM/dd/yyyy',
        time_format: 'HH:mm',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      setSettings(mockSettings);
      setFormData({
        site_title: mockSettings.site_title,
        site_description: mockSettings.site_description,
        site_url: mockSettings.site_url,
        admin_email: mockSettings.admin_email,
        posts_per_page: mockSettings.posts_per_page,
        comments_enabled: mockSettings.comments_enabled,
        comment_moderation: mockSettings.comment_moderation,
        allow_registration: mockSettings.allow_registration,
        default_user_role: mockSettings.default_user_role,
        timezone: mockSettings.timezone,
        date_format: mockSettings.date_format,
        time_format: mockSettings.time_format
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updatedSettings = await trpc.settings.update.mutate(formData);
      setSettings(updatedSettings);
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">⚙️ Site Settings</h2>
        <p className="text-gray-600">Configure your blog's appearance and functionality</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">🏠 General</TabsTrigger>
          <TabsTrigger value="content">📝 Content</TabsTrigger>
          <TabsTrigger value="users">👥 Users</TabsTrigger>
          <TabsTrigger value="advanced">⚡ Advanced</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSave}>
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Site Information</CardTitle>
                <CardDescription>Basic information about your blog</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site_title">Site Title *</Label>
                  <Input
                    id="site_title"
                    value={formData.site_title || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, site_title: e.target.value })
                    }
                    placeholder="My Awesome Blog"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    This appears in the browser title and site header
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site_description">Site Description</Label>
                  <Textarea
                    id="site_description"
                    value={formData.site_description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData({ ...formData, site_description: e.target.value })
                    }
                    placeholder="A brief description of your blog"
                    rows={3}
                  />
                  <p className="text-sm text-gray-500">
                    Used in meta tags and RSS feeds
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site_url">Site URL *</Label>
                  <Input
                    id="site_url"
                    type="url"
                    value={formData.site_url || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, site_url: e.target.value })
                    }
                    placeholder="https://myblog.com"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    The public URL where your blog is hosted
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_email">Administrator Email *</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    value={formData.admin_email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, admin_email: e.target.value })
                    }
                    placeholder="admin@myblog.com"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Used for system notifications and contact forms
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Display</CardTitle>
                <CardDescription>How your content appears to visitors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="posts_per_page">Posts Per Page</Label>
                  <Input
                    id="posts_per_page"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.posts_per_page || 10}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, posts_per_page: parseInt(e.target.value) || 10 })
                    }
                  />
                  <p className="text-sm text-gray-500">
                    Number of posts to show on blog listing pages
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Comment Settings</h4>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="comments_enabled"
                      checked={formData.comments_enabled}
                      onCheckedChange={(checked: boolean) =>
                        setFormData({ ...formData, comments_enabled: checked })
                      }
                    />
                    <Label htmlFor="comments_enabled">Enable Comments</Label>
                  </div>
                  <p className="text-sm text-gray-500 ml-6">
                    Allow visitors to comment on blog posts
                  </p>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="comment_moderation"
                      checked={formData.comment_moderation}
                      onCheckedChange={(checked: boolean) =>
                        setFormData({ ...formData, comment_moderation: checked })
                      }
                      disabled={!formData.comments_enabled}
                    />
                    <Label htmlFor="comment_moderation">Moderate Comments</Label>
                  </div>
                  <p className="text-sm text-gray-500 ml-6">
                    Comments must be approved before appearing on the site
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Control user registration and default roles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="allow_registration"
                    checked={formData.allow_registration}
                    onCheckedChange={(checked: boolean) =>
                      setFormData({ ...formData, allow_registration: checked })
                    }
                  />
                  <Label htmlFor="allow_registration">Allow User Registration</Label>
                </div>
                <p className="text-sm text-gray-500 ml-6">
                  Let visitors create their own accounts
                </p>

                <div className="space-y-2">
                  <Label htmlFor="default_user_role">Default User Role</Label>
                  <Select
                    value={formData.default_user_role}
                    onValueChange={(value: 'admin' | 'editor' | 'author') =>
                      setFormData({ ...formData, default_user_role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="author">📝 Author - Can create and edit own posts</SelectItem>
                      <SelectItem value="editor">✏️ Editor - Can edit all posts and manage content</SelectItem>
                      <SelectItem value="admin">👑 Admin - Full access to everything</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    Role assigned to new users when they register
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Localization</CardTitle>
                <CardDescription>Date, time, and regional settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value: string) =>
                      setFormData({ ...formData, timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">🌍 UTC (Coordinated Universal Time)</SelectItem>
                      <SelectItem value="America/New_York">🇺🇸 Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">🇺🇸 Central Time</SelectItem>
                      <SelectItem value="America/Denver">🇺🇸 Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">🇺🇸 Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">🇬🇧 London</SelectItem>
                      <SelectItem value="Europe/Paris">🇫🇷 Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">🇯🇵 Tokyo</SelectItem>
                      <SelectItem value="Australia/Sydney">🇦🇺 Sydney</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_format">Date Format</Label>
                    <Select
                      value={formData.date_format}
                      onValueChange={(value: string) =>
                        setFormData({ ...formData, date_format: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (12/31/2023)</SelectItem>
                        <SelectItem value="dd/MM/yyyy">dd/MM/yyyy (31/12/2023)</SelectItem>
                        <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (2023-12-31)</SelectItem>
                        <SelectItem value="MMM dd, yyyy">MMM dd, yyyy (Dec 31, 2023)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time_format">Time Format</Label>
                    <Select
                      value={formData.time_format}
                      onValueChange={(value: string) =>
                        setFormData({ ...formData, time_format: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HH:mm">24-hour (15:30)</SelectItem>
                        <SelectItem value="h:mm a">12-hour (3:30 PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800">⚠️ Danger Zone</CardTitle>
                <CardDescription className="text-yellow-700">
                  Advanced actions that cannot be undone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-yellow-300 rounded-lg">
                  <div>
                    <h4 className="font-medium text-yellow-800">Reset to Defaults</h4>
                    <p className="text-sm text-yellow-700">
                      Reset all settings to their default values
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                    onClick={async () => {
                      if (confirm('Are you sure you want to reset all settings to defaults?')) {
                        try {
                          await trpc.settings.reset.mutate();
                          await loadSettings();
                        } catch (error) {
                          console.error('Failed to reset settings:', error);
                        }
                      }
                    }}
                  >
                    🔄 Reset Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => loadSettings()}
              disabled={isSaving}
            >
              🔄 Reload
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                '💾 Save Settings'
              )}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
}

export default SettingsManager;