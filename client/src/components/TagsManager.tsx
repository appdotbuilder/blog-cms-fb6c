import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Tag, CreateTagInput, UpdateTagInput } from '../../../server/src/schema';

function TagsManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateTagInput>({
    name: '',
    slug: '',
    description: null
  });

  const loadTags = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allTags, popular] = await Promise.all([
        trpc.tags.list.query(),
        trpc.tags.getPopular.query({ limit: 10 })
      ]);
      setTags(allTags);
      setPopularTags(popular);
    } catch (error) {
      console.error('Failed to load tags:', error);
      // Mock data for demo
      const mockTags = [
        {
          id: 1,
          name: 'JavaScript',
          slug: 'javascript',
          description: 'Posts about JavaScript programming',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          name: 'React',
          slug: 'react',
          description: 'React.js framework tutorials and tips',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 3,
          name: 'Web Development',
          slug: 'web-development',
          description: 'General web development topics',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 4,
          name: 'Tutorial',
          slug: 'tutorial',
          description: 'Step-by-step learning guides',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 5,
          name: 'Tips',
          slug: 'tips',
          description: 'Quick tips and tricks',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      setTags(mockTags);
      setPopularTags(mockTags.slice(0, 3));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const generateSlug = (name: string) => {
    return name
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
      if (editingTag) {
        const updateData: UpdateTagInput = {
          id: editingTag.id,
          ...formData
        };
        const updatedTag = await trpc.tags.update.mutate(updateData);
        setTags((prev: Tag[]) => 
          prev.map((tag: Tag) => tag.id === editingTag.id ? updatedTag : tag)
        );
        setEditingTag(null);
      } else {
        const newTag = await trpc.tags.create.mutate(formData);
        setTags((prev: Tag[]) => [...prev, newTag]);
        setIsCreateDialogOpen(false);
      }

      // Reset form
      setFormData({
        name: '',
        slug: '',
        description: null
      });
    } catch (error) {
      console.error('Failed to save tag:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (tagId: number) => {
    try {
      await trpc.tags.delete.mutate({ id: tagId });
      setTags((prev: Tag[]) => prev.filter((tag: Tag) => tag.id !== tagId));
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      slug: tag.slug,
      description: tag.description
    });
  };

  const filteredTags = tags.filter((tag: Tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && tags.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading tags...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🏷️ Tags Management</h2>
          <p className="text-gray-600">Create and manage tags for your blog posts</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              ➕ Create Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
              <DialogDescription>
                Add a new tag to categorize your blog posts
              </DialogDescription>
            </DialogHeader>
            <TagForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              generateSlug={generateSlug}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="🔍 Search tags..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
      </div>

      {/* Popular Tags */}
      {popularTags.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-800">🌟 Popular Tags</CardTitle>
            <CardDescription className="text-yellow-700">
              Most frequently used tags in your blog
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag: Tag) => (
                <Badge 
                  key={tag.id} 
                  className="bg-yellow-200 text-yellow-800 hover:bg-yellow-300 px-3 py-1 text-sm"
                >
                  #{tag.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags Grid */}
      {filteredTags.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🏷️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No matching tags found' : 'No tags yet'}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? `Try adjusting your search for "${searchQuery}"`
                : 'Create your first tag to label your posts!'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTags.map((tag: Tag) => (
            <Card key={tag.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      #{tag.name}
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(tag)}
                      className="h-8 w-8 p-0"
                    >
                      ✏️
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="h-8 w-8 p-0">
                          🗑️
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the tag "{tag.name}"? This will remove it from all posts.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(tag.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardDescription className="text-xs">/{tag.slug}</CardDescription>
              </CardHeader>
              {tag.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600">{tag.description}</p>
                </CardContent>
              )}
              <CardContent className="pt-0">
                <div className="text-xs text-gray-500">
                  Created: {tag.created_at.toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Tag Creation */}
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="text-center py-8">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Tag Creation</h3>
          <p className="text-gray-600 mb-4">
            Create tags on-the-fly while writing posts, or batch create them here
          </p>
          <Button
            variant="outline"
            onClick={() => setIsCreateDialogOpen(true)}
            className="border-dashed"
          >
            ➕ Add Tag
          </Button>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingTag && (
        <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Tag</DialogTitle>
              <DialogDescription>
                Update tag information and settings
              </DialogDescription>
            </DialogHeader>
            <TagForm
              formData={formData}
              setFormData={setFormData}
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

interface TagFormProps {
  formData: CreateTagInput;
  setFormData: (data: CreateTagInput) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  generateSlug: (name: string) => string;
  isEditing?: boolean;
}

function TagForm({ formData, setFormData, onSubmit, isLoading, generateSlug, isEditing = false }: TagFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Tag Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const newName = e.target.value;
            setFormData({
              ...formData,
              name: newName,
              slug: generateSlug(newName)
            });
          }}
          placeholder="Enter tag name"
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
        <p className="text-xs text-gray-500">
          Used in URLs like: /blog/tags/{formData.slug || 'tag-name'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData({ ...formData, description: e.target.value || null })
          }
          placeholder="Describe this tag (optional)"
          rows={3}
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
            isEditing ? '✅ Update Tag' : '🚀 Create Tag'
          )}
        </Button>
      </div>
    </form>
  );
}

export default TagsManager;