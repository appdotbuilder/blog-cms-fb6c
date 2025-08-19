import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/App';
import type { Media, CreateMediaInput, UpdateMediaInput } from '../../../server/src/schema';

function MediaLibrary() {
  const { user } = useAuth();
  const [media, setMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<Media | null>(null);
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'document'>('all');

  const loadMedia = useCallback(async () => {
    try {
      setIsLoading(true);
      const dataResponse = await trpc.media.library.query({ page: 1, limit: 50 });
      setMedia(dataResponse.media);
    } catch (error) {
      console.error('Failed to load media:', error);
      // Mock data for demo
      setMedia([
        {
          id: 1,
          filename: 'blog-header-image.jpg',
          original_filename: 'blog-header-image.jpg',
          file_path: '/uploads/blog-header-image.jpg',
          file_size: 245760,
          mime_type: 'image/jpeg',
          alt_text: 'Beautiful blog header image',
          caption: 'Header image for blog posts',
          uploaded_by: 1,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          filename: 'tutorial-screenshot.png',
          original_filename: 'tutorial-screenshot.png',
          file_path: '/uploads/tutorial-screenshot.png',
          file_size: 512000,
          mime_type: 'image/png',
          alt_text: 'Tutorial step screenshot',
          caption: null,
          uploaded_by: 1,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 3,
          filename: 'sample-document.pdf',
          original_filename: 'sample-document.pdf',
          file_path: '/uploads/sample-document.pdf',
          file_size: 1048576,
          mime_type: 'application/pdf',
          alt_text: null,
          caption: 'Sample PDF document',
          uploaded_by: 1,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleUpload = async (file: File) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const uploadData: CreateMediaInput = {
        filename: file.name,
        original_filename: file.name,
        file_path: `/uploads/${file.name}`,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        alt_text: null,
        caption: null
      };

      const newMedia = await trpc.media.upload.mutate(uploadData);
      setMedia((prev: Media[]) => [newMedia, ...prev]);
      setIsUploadDialogOpen(false);
    } catch (error) {
      console.error('Failed to upload media:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMedia = async (updateData: UpdateMediaInput) => {
    try {
      const updatedMedia = await trpc.media.update.mutate(updateData);
      setMedia((prev: Media[]) => 
        prev.map((item: Media) => item.id === updateData.id ? updatedMedia : item)
      );
      setEditingMedia(null);
    } catch (error) {
      console.error('Failed to update media:', error);
    }
  };

  const handleDelete = async (mediaId: number) => {
    try {
      await trpc.media.delete.mutate({ id: mediaId });
      setMedia((prev: Media[]) => prev.filter((item: Media) => item.id !== mediaId));
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    return '📎';
  };

  const filteredMedia = media.filter((item: Media) => {
    if (filter === 'all') return true;
    if (filter === 'image') return item.mime_type.startsWith('image/');
    if (filter === 'video') return item.mime_type.startsWith('video/');
    if (filter === 'document') return !item.mime_type.startsWith('image/') && !item.mime_type.startsWith('video/');
    return true;
  });

  if (isLoading && media.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading media library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🖼️ Media Library</h2>
          <p className="text-gray-600">Manage images, videos, and documents for your blog</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              ⬆️ Upload Media
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Media</DialogTitle>
              <DialogDescription>
                Add images, videos, or documents to your media library
              </DialogDescription>
            </DialogHeader>
            <MediaUploadForm onUpload={handleUpload} isLoading={isLoading} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        {(['all', 'image', 'video', 'document'] as const).map((type) => (
          <Button
            key={type}
            variant={filter === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(type)}
            className="capitalize"
          >
            {type === 'all' ? '📁 All' : 
             type === 'image' ? '🖼️ Images' :
             type === 'video' ? '🎥 Videos' : '📄 Documents'}
            <Badge variant="secondary" className="ml-2">
              {type === 'all' ? media.length : 
               filteredMedia.length
              }
            </Badge>
          </Button>
        ))}
      </div>

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No media files yet' : `No ${filter} files`}
            </h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Upload your first media file to get started!'
                : `Upload some ${filter} files to see them here.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMedia.map((item: Media) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="text-2xl">{getFileTypeIcon(item.mime_type)}</div>
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingMedia(item)}
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
                          <AlertDialogTitle>Delete Media</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{item.filename}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardTitle className="text-sm truncate" title={item.original_filename}>
                  {item.original_filename}
                </CardTitle>
                <CardDescription className="text-xs">
                  <div className="space-y-1">
                    <div>{formatFileSize(item.file_size)}</div>
                    <div className="text-gray-500">{item.mime_type}</div>
                  </div>
                </CardDescription>
              </CardHeader>
              
              {/* Image Preview */}
              {item.mime_type.startsWith('image/') && (
                <div className="px-4 pb-3">
                  <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                    <div className="text-4xl text-gray-400">🖼️</div>
                  </div>
                </div>
              )}
              
              <CardContent className="pt-0">
                {item.alt_text && (
                  <p className="text-xs text-gray-600 mb-2">
                    <strong>Alt:</strong> {item.alt_text}
                  </p>
                )}
                {item.caption && (
                  <p className="text-xs text-gray-600 mb-2">
                    <strong>Caption:</strong> {item.caption}
                  </p>
                )}
                <div className="text-xs text-gray-500">
                  {item.created_at.toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingMedia && (
        <Dialog open={!!editingMedia} onOpenChange={() => setEditingMedia(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Media</DialogTitle>
              <DialogDescription>
                Update media information and metadata
              </DialogDescription>
            </DialogHeader>
            <MediaEditForm
              media={editingMedia}
              onUpdate={handleUpdateMedia}
              onCancel={() => setEditingMedia(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface MediaUploadFormProps {
  onUpload: (file: File) => Promise<void>;
  isLoading: boolean;
}

function MediaUploadForm({ onUpload, isLoading }: MediaUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="text-4xl mb-4">📎</div>
        <p className="text-gray-600 mb-4">
          Drag and drop files here, or click to select
        </p>
        <Input
          type="file"
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx"
          className="max-w-xs mx-auto"
        />
      </div>

      {selectedFile && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Selected File:</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Name:</strong> {selectedFile.name}</p>
            <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)} KB</p>
            <p><strong>Type:</strong> {selectedFile.type}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isLoading}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Uploading...
            </div>
          ) : (
            '⬆️ Upload File'
          )}
        </Button>
      </div>
    </div>
  );
}

interface MediaEditFormProps {
  media: Media;
  onUpdate: (data: UpdateMediaInput) => Promise<void>;
  onCancel: () => void;
}

function MediaEditForm({ media, onUpdate, onCancel }: MediaEditFormProps) {
  const [formData, setFormData] = useState<UpdateMediaInput>({
    id: media.id,
    alt_text: media.alt_text,
    caption: media.caption
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onUpdate(formData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-2"><strong>File:</strong> {media.original_filename}</p>
        <p className="text-sm text-gray-600"><strong>Type:</strong> {media.mime_type}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alt_text">Alt Text</Label>
        <Input
          id="alt_text"
          value={formData.alt_text || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, alt_text: e.target.value || null })
          }
          placeholder="Describe the image for accessibility"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="caption">Caption</Label>
        <Input
          id="caption"
          value={formData.caption || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, caption: e.target.value || null })
          }
          placeholder="Add a caption for this media"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
          {isLoading ? 'Updating...' : '✅ Update'}
        </Button>
      </div>
    </form>
  );
}

export default MediaLibrary;