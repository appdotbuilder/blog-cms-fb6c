import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { commentsTable, postsTable, usersTable } from '../db/schema';
import { type CreateCommentInput } from '../schema';
import { createComment } from '../handlers/comments';
import { eq } from 'drizzle-orm';

describe('createComment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testPostId: number;
  let testUserId: number;

  beforeEach(async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author@test.com',
        username: 'testauthor',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Author',
        role: 'author'
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create a test post
    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test post content for comments',
        author_id: testUserId,
        status: 'published'
      })
      .returning()
      .execute();

    testPostId = postResult[0].id;
  });

  const validCommentInput: CreateCommentInput = {
    post_id: 0, // Will be set to testPostId in tests
    author_name: 'John Doe',
    author_email: 'john@example.com',
    author_website: 'https://johndoe.com',
    content: 'This is a test comment with meaningful content.'
  };

  it('should create a comment successfully', async () => {
    const input = { ...validCommentInput, post_id: testPostId };
    
    const result = await createComment(input);

    expect(result.id).toBeDefined();
    expect(result.post_id).toEqual(testPostId);
    expect(result.author_name).toEqual('John Doe');
    expect(result.author_email).toEqual('john@example.com');
    expect(result.author_website).toEqual('https://johndoe.com');
    expect(result.content).toEqual('This is a test comment with meaningful content.');
    expect(result.status).toEqual('pending');
    expect(result.parent_id).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save comment to database', async () => {
    const input = { ...validCommentInput, post_id: testPostId };
    
    const result = await createComment(input);

    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, result.id))
      .execute();

    expect(comments).toHaveLength(1);
    expect(comments[0].author_name).toEqual('John Doe');
    expect(comments[0].author_email).toEqual('john@example.com');
    expect(comments[0].content).toEqual('This is a test comment with meaningful content.');
    expect(comments[0].status).toEqual('pending');
  });

  it('should create comment without optional fields', async () => {
    const input: CreateCommentInput = {
      post_id: testPostId,
      author_name: 'Jane Smith',
      author_email: 'jane@example.com',
      content: 'Comment without website'
    };

    const result = await createComment(input);

    expect(result.author_name).toEqual('Jane Smith');
    expect(result.author_email).toEqual('jane@example.com');
    expect(result.author_website).toBeNull();
    expect(result.parent_id).toBeNull();
    expect(result.content).toEqual('Comment without website');
  });

  it('should create reply comment with parent_id', async () => {
    // First create a parent comment
    const parentInput = { ...validCommentInput, post_id: testPostId };
    const parentComment = await createComment(parentInput);

    // Then create a reply
    const replyInput: CreateCommentInput = {
      post_id: testPostId,
      author_name: 'Reply Author',
      author_email: 'reply@example.com',
      content: 'This is a reply to the parent comment.',
      parent_id: parentComment.id
    };

    const result = await createComment(replyInput);

    expect(result.parent_id).toEqual(parentComment.id);
    expect(result.post_id).toEqual(testPostId);
    expect(result.author_name).toEqual('Reply Author');
    expect(result.content).toEqual('This is a reply to the parent comment.');
  });

  it('should reject comment for non-existent post', async () => {
    const input = { ...validCommentInput, post_id: 99999 };

    expect(createComment(input)).rejects.toThrow(/Post with id 99999 not found/i);
  });

  it('should reject comment with non-existent parent_id', async () => {
    const input: CreateCommentInput = {
      post_id: testPostId,
      author_name: 'Test Author',
      author_email: 'test@example.com',
      content: 'Reply to non-existent comment',
      parent_id: 99999
    };

    expect(createComment(input)).rejects.toThrow(/Parent comment with id 99999 not found/i);
  });

  it('should set default status to pending', async () => {
    const input = { ...validCommentInput, post_id: testPostId };
    
    const result = await createComment(input);

    expect(result.status).toEqual('pending');

    // Verify in database
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, result.id))
      .execute();

    expect(comments[0].status).toEqual('pending');
  });

  it('should handle comments with special characters', async () => {
    const input: CreateCommentInput = {
      post_id: testPostId,
      author_name: 'André François',
      author_email: 'andre@example.com',
      content: 'Comment with special chars: é, ñ, 中文, emojis 🚀 and "quotes"',
    };

    const result = await createComment(input);

    expect(result.author_name).toEqual('André François');
    expect(result.content).toEqual('Comment with special chars: é, ñ, 中文, emojis 🚀 and "quotes"');
  });

  it('should create multiple comments for same post', async () => {
    const input1 = { ...validCommentInput, post_id: testPostId, author_name: 'First Commenter' };
    const input2 = { ...validCommentInput, post_id: testPostId, author_name: 'Second Commenter' };

    const result1 = await createComment(input1);
    const result2 = await createComment(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.post_id).toEqual(testPostId);
    expect(result2.post_id).toEqual(testPostId);
    expect(result1.author_name).toEqual('First Commenter');
    expect(result2.author_name).toEqual('Second Commenter');

    // Verify both comments exist in database
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, testPostId))
      .execute();

    expect(comments).toHaveLength(2);
  });
});