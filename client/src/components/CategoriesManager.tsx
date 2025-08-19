import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../../server/src/schema';

function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState<CreateCategoryInput>({
    name: '',
    slug: '',
    description: null,
    parent_id: null,
    meta_title: null,
    meta_description: null
  });

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.categories.list.query();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Mock data for demo
      setCategories([
        {
          id: 1,
          name: 'Technology',
          slug: 'technology',
          description: 'Posts about technology and innovation',
          parent_id: null,
          meta_title: 'Technology Blog Posts',
          meta_description: 'Latest technology news and insights',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          name: 'Programming',
          slug: 'programming',
          description: 'Software development and coding tutorials',
          parent_id: 1,
          meta_title: null,
          meta_description: null,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 3,
          name: 'Lifestyle',
          slug: 'lifestyle',
          description: 'Life, culture, and personal development',
          parent_id: null,
          meta_title: null,
          meta_description: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
      if (editingCategory) {
        const updateData: UpdateCategoryInput = {
          id: editingCategory.id,
          ...formData
        };
        const updatedCategory = await trpc.categories.update.mutate(updateData);
        setCategories((prev: Category[]) => 
          prev.map((cat: Category) => cat.id === editingCategory.id ? updatedCategory : cat)
        );
        setEditingCategory(null);
      } else {
        const newCategory = await trpc.categories.create.mutate(formData);
        setCategories((prev: Category[]) => [...prev, newCategory]);
        setIsCreateDialogOpen(false);
      }

      // Reset form
      setFormData({
        name: '',
        slug: '',
        description: null,
        parent_id: null,
        meta_title: null,
        meta_description: null
      });
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (categoryId: number) => {
    try {
      await trpc.categories.delete.mutate({ id: categoryId });
      setCategories((prev: Category[]) => prev.filter((cat: Category) => cat.id !== categoryId));
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description,
      parent_id: category.parent_id,
      meta_title: category.meta_title,
      meta_description: category.meta_description
    });
  };

  const getParentCategories = () => {
    return categories.filter((cat: Category) => cat.parent_id === null);
  };

  const getCategoryChildren = (parentId: number) => {
    return categories.filter((cat: Category) => cat.parent_id === parentId);
  };

  const buildCategoryTree = () => {
    const tree: Array<Category & { children: Category[] }> = [];
    const parentCategories = getParentCategories();
    
    parentCategories.forEach((parent: Category) => {
      const children = getCategoryChildren(parent.id);
      tree.push({ ...parent, children });
    });
    
    return tree;
  };

  if (isLoading && categories.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading categories...</p>
      </div>
    );
  }

  const categoryTree = buildCategoryTree();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📁 Categories Management</h2>
          <p className="text-gray-600">Organize your blog posts with categories</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              ➕ Create Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Add a new category to organize your blog posts
              </DialogDescription>
            </DialogHeader>
            <CategoryForm
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              generateSlug={generateSlug}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tree View */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
            <p className="text-gray-600">Create your first category to organize your posts!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categoryTree.map((parent) => (
            <Card key={parent.id} className="border-l-4 border-l-indigo-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-indigo-600">
                      Parent
                    </Badge>
                    <div>
                      <CardTitle className="text-lg">{parent.name}</CardTitle>
                      <CardDescription>/{parent.slug}</CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(parent)}
                    >
                      ✏️ Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          🗑️ Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Category</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{parent.name}"? This will also affect its subcategories and posts.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(parent.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {parent.description && (
                  <p className="text-sm text-gray-600 mt-2">{parent.description}</p>
                )}
              </CardHeader>

              {/* Child Categories */}
              {parent.children.length > 0 && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Subcategories:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {parent.children.map((child: Category) => (
                        <div 
                          key={child.id} 
                          className="bg-gray-50 rounded-lg p-3 border-l-2 border-l-gray-300"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{child.name}</p>
                              <p className="text-xs text-gray-500">/{child.slug}</p>
                              {child.description && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {child.description}
                                </p>
                              )}
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEdit(child)}
                                className="h-8 w-8 p-0"
                              >
                                ✏️
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    🗑️
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{child.name}"?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(child.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingCategory && (
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update category information and settings
              </DialogDescription>
            </DialogHeader>
            <CategoryForm
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              generateSlug={generateSlug}
              isEditing={true}
              editingId={editingCategory.id}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface CategoryFormProps {
  formData: CreateCategoryInput;
  setFormData: (data: CreateCategoryInput) => void;
  categories: Category[];
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  generateSlug: (name: string) => string;
  isEditing?: boolean;
  editingId?: number;
}

function CategoryForm({ 
  formData, 
  setFormData, 
  categories, 
  onSubmit, 
  isLoading, 
  generateSlug, 
  isEditing = false,
  editingId 
}: CategoryFormProps) {
  const availableParents = categories.filter((cat: Category) => 
    cat.parent_id === null && (!isEditing || cat.id !== editingId)
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Category Name *</Label>
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
            placeholder="Enter category name"
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
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData({ ...formData, description: e.target.value || null })
          }
          placeholder="Describe this category"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="parent_id">Parent Category</Label>
        <Select 
          value={formData.parent_id?.toString() || ''} 
          onValueChange={(value: string) =>
            setFormData({ ...formData, parent_id: value ? parseInt(value) : null })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select parent category (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No parent (top-level category)</SelectItem>
            {availableParents.map((category: Category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                📁 {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-900">SEO Settings</h4>
        
        <div className="space-y-2">
          <Label htmlFor="meta_title">Meta Title</Label>
          <Input
            id="meta_title"
            value={formData.meta_title || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, meta_title: e.target.value || null })
            }
            placeholder="SEO title for this category"
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
            placeholder="SEO description for this category"
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isEditing ? 'Updating...' : 'Creating...'}
            </div>
          ) : (
            isEditing ? '✅ Update Category' : '🚀 Create Category'
          )}
        </Button>
      </div>
    </form>
  );
}

export default CategoriesManager;