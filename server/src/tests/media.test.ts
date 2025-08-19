import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { mediaTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateMediaInput } from '../schema';
import { uploadMedia } from '../handlers/media';

describe('uploadMedia', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user for foreign key constraint
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'author'
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;
  });

  it('should upload media successfully', async () => {
    const testInput: CreateMediaInput = {
      filename: 'test-image.jpg',
      original_filename: 'original-photo.jpg',
      file_path: '/uploads/test-image.jpg',
      file_size: 1024000,
      mime_type: 'image/jpeg',
      alt_text: 'A test image',
      caption: 'This is a test caption',
      uploaded_by: testUserId
    };

    const result = await uploadMedia(testInput);

    // Validate returned data
    expect(result.filename).toEqual('test-image.jpg');
    expect(result.original_filename).toEqual('original-photo.jpg');
    expect(result.file_path).toEqual('/uploads/test-image.jpg');
    expect(result.file_size).toEqual(1024000);
    expect(result.mime_type).toEqual('image/jpeg');
    expect(result.alt_text).toEqual('A test image');
    expect(result.caption).toEqual('This is a test caption');
    expect(result.uploaded_by).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save media to database', async () => {
    const testInput: CreateMediaInput = {
      filename: 'database-test.png',
      original_filename: 'original-db-test.png',
      file_path: '/uploads/database-test.png',
      file_size: 512000,
      mime_type: 'image/png',
      uploaded_by: testUserId
    };

    const result = await uploadMedia(testInput);

    // Query database to verify data was saved
    const mediaRecord = await db.select()
      .from(mediaTable)
      .where(eq(mediaTable.id, result.id))
      .execute();

    expect(mediaRecord).toHaveLength(1);
    const savedMedia = mediaRecord[0];
    expect(savedMedia.filename).toEqual('database-test.png');
    expect(savedMedia.original_filename).toEqual('original-db-test.png');
    expect(savedMedia.file_path).toEqual('/uploads/database-test.png');
    expect(savedMedia.file_size).toEqual(512000);
    expect(savedMedia.mime_type).toEqual('image/png');
    expect(savedMedia.uploaded_by).toEqual(testUserId);
    expect(savedMedia.alt_text).toBeNull();
    expect(savedMedia.caption).toBeNull();
    expect(savedMedia.created_at).toBeInstanceOf(Date);
    expect(savedMedia.updated_at).toBeInstanceOf(Date);
  });

  it('should handle optional fields correctly', async () => {
    const testInput: CreateMediaInput = {
      filename: 'minimal-data.pdf',
      original_filename: 'document.pdf',
      file_path: '/uploads/minimal-data.pdf',
      file_size: 2048000,
      mime_type: 'application/pdf',
      uploaded_by: testUserId
      // alt_text and caption are optional and not provided
    };

    const result = await uploadMedia(testInput);

    expect(result.alt_text).toBeNull();
    expect(result.caption).toBeNull();
    expect(result.filename).toEqual('minimal-data.pdf');
    expect(result.mime_type).toEqual('application/pdf');
  });

  it('should handle different file types', async () => {
    const videoInput: CreateMediaInput = {
      filename: 'test-video.mp4',
      original_filename: 'original-video.mp4',
      file_path: '/uploads/test-video.mp4',
      file_size: 50000000,
      mime_type: 'video/mp4',
      alt_text: 'Test video file',
      uploaded_by: testUserId
    };

    const result = await uploadMedia(videoInput);

    expect(result.mime_type).toEqual('video/mp4');
    expect(result.file_size).toEqual(50000000);
    expect(result.alt_text).toEqual('Test video file');
  });

  it('should throw error for non-existent user', async () => {
    const testInput: CreateMediaInput = {
      filename: 'invalid-user.jpg',
      original_filename: 'test.jpg',
      file_path: '/uploads/invalid-user.jpg',
      file_size: 1000,
      mime_type: 'image/jpeg',
      uploaded_by: 99999 // Non-existent user ID
    };

    await expect(uploadMedia(testInput)).rejects.toThrow(/User with ID 99999 does not exist/);
  });

  it('should handle large file sizes', async () => {
    const largeFileInput: CreateMediaInput = {
      filename: 'large-file.zip',
      original_filename: 'archive.zip',
      file_path: '/uploads/large-file.zip',
      file_size: 100000000, // 100MB
      mime_type: 'application/zip',
      uploaded_by: testUserId
    };

    const result = await uploadMedia(largeFileInput);

    expect(result.file_size).toEqual(100000000);
    expect(result.mime_type).toEqual('application/zip');
  });

  it('should preserve special characters in filenames', async () => {
    const specialCharsInput: CreateMediaInput = {
      filename: 'file-with-special-chars_123.jpg',
      original_filename: 'Ööäå-tëst fîlé (1).jpg',
      file_path: '/uploads/file-with-special-chars_123.jpg',
      file_size: 800000,
      mime_type: 'image/jpeg',
      caption: 'File with special characters: åäö!@#$%',
      uploaded_by: testUserId
    };

    const result = await uploadMedia(specialCharsInput);

    expect(result.filename).toEqual('file-with-special-chars_123.jpg');
    expect(result.original_filename).toEqual('Ööäå-tëst fîlé (1).jpg');
    expect(result.caption).toEqual('File with special characters: åäö!@#$%');
  });
});