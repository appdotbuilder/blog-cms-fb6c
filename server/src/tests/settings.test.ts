import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { siteSettingsTable } from '../db/schema';
import { type UpdateSiteSettingsInput } from '../schema';
import { 
  getSiteSettings, 
  updateSiteSettings, 
  resetToDefaults, 
  getTimezones, 
  validateSettings 
} from '../handlers/settings';
import { eq } from 'drizzle-orm';

// Test input for updating settings
const testUpdateInput: UpdateSiteSettingsInput = {
  site_title: 'Test Blog',
  site_description: 'A test blog description',
  site_url: 'https://test.example.com',
  admin_email: 'admin@test.com',
  posts_per_page: 15,
  comments_enabled: false,
  comment_moderation: false,
  allow_registration: true,
  default_user_role: 'editor',
  timezone: 'America/New_York',
  date_format: 'MM/DD/YYYY',
  time_format: '12:mm:ss AM'
};

describe('getSiteSettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no settings exist', async () => {
    const result = await getSiteSettings();
    expect(result).toBeNull();
  });

  it('should return settings when they exist', async () => {
    // Create test settings
    await db.insert(siteSettingsTable)
      .values({
        site_title: 'Existing Blog',
        site_description: 'Existing description',
        site_url: 'https://existing.com',
        admin_email: 'admin@existing.com',
        posts_per_page: 20,
        comments_enabled: true,
        comment_moderation: true,
        allow_registration: false,
        default_user_role: 'author',
        timezone: 'UTC',
        date_format: 'YYYY-MM-DD',
        time_format: 'HH:mm:ss'
      })
      .execute();

    const result = await getSiteSettings();

    expect(result).toBeDefined();
    expect(result?.site_title).toEqual('Existing Blog');
    expect(result?.site_description).toEqual('Existing description');
    expect(result?.site_url).toEqual('https://existing.com');
    expect(result?.admin_email).toEqual('admin@existing.com');
    expect(result?.posts_per_page).toEqual(20);
    expect(result?.comments_enabled).toBe(true);
    expect(result?.comment_moderation).toBe(true);
    expect(result?.allow_registration).toBe(false);
    expect(result?.default_user_role).toEqual('author');
    expect(result?.timezone).toEqual('UTC');
    expect(result?.date_format).toEqual('YYYY-MM-DD');
    expect(result?.time_format).toEqual('HH:mm:ss');
    expect(result?.id).toBeDefined();
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });
});

describe('updateSiteSettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create new settings when none exist', async () => {
    const result = await updateSiteSettings(testUpdateInput);

    expect(result.site_title).toEqual('Test Blog');
    expect(result.site_description).toEqual('A test blog description');
    expect(result.site_url).toEqual('https://test.example.com');
    expect(result.admin_email).toEqual('admin@test.com');
    expect(result.posts_per_page).toEqual(15);
    expect(result.comments_enabled).toBe(false);
    expect(result.comment_moderation).toBe(false);
    expect(result.allow_registration).toBe(true);
    expect(result.default_user_role).toEqual('editor');
    expect(result.timezone).toEqual('America/New_York');
    expect(result.date_format).toEqual('MM/DD/YYYY');
    expect(result.time_format).toEqual('12:mm:ss AM');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save new settings to database', async () => {
    const result = await updateSiteSettings(testUpdateInput);

    const settings = await db.select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.id, result.id))
      .execute();

    expect(settings).toHaveLength(1);
    expect(settings[0].site_title).toEqual('Test Blog');
    expect(settings[0].site_description).toEqual('A test blog description');
    expect(settings[0].admin_email).toEqual('admin@test.com');
    expect(settings[0].posts_per_page).toEqual(15);
    expect(settings[0].comments_enabled).toBe(false);
  });

  it('should update existing settings', async () => {
    // Create initial settings
    await db.insert(siteSettingsTable)
      .values({
        site_title: 'Original Blog',
        site_description: 'Original description',
        site_url: 'https://original.com',
        admin_email: 'admin@original.com',
        posts_per_page: 10,
        comments_enabled: true,
        comment_moderation: true,
        allow_registration: false,
        default_user_role: 'author',
        timezone: 'UTC',
        date_format: 'YYYY-MM-DD',
        time_format: 'HH:mm:ss'
      })
      .execute();

    const partialUpdate: UpdateSiteSettingsInput = {
      site_title: 'Updated Blog',
      posts_per_page: 25,
      comments_enabled: false
    };

    const result = await updateSiteSettings(partialUpdate);

    expect(result.site_title).toEqual('Updated Blog');
    expect(result.posts_per_page).toEqual(25);
    expect(result.comments_enabled).toBe(false);
    // Unchanged fields should remain the same
    expect(result.site_description).toEqual('Original description');
    expect(result.admin_email).toEqual('admin@original.com');
    expect(result.timezone).toEqual('UTC');
  });

  it('should handle partial updates correctly', async () => {
    // Create initial settings
    const initial = await updateSiteSettings({
      site_title: 'Initial Blog',
      admin_email: 'initial@test.com',
      posts_per_page: 10
    });

    // Update only specific fields
    const updated = await updateSiteSettings({
      site_title: 'Updated Blog'
    });

    expect(updated.site_title).toEqual('Updated Blog');
    expect(updated.admin_email).toEqual('initial@test.com'); // Should remain unchanged
    expect(updated.posts_per_page).toEqual(10); // Should remain unchanged
    expect(updated.id).toEqual(initial.id); // Same record
  });

  it('should create settings with defaults for missing values', async () => {
    const minimalInput: UpdateSiteSettingsInput = {
      site_title: 'Minimal Blog'
    };

    const result = await updateSiteSettings(minimalInput);

    expect(result.site_title).toEqual('Minimal Blog');
    expect(result.site_description).toEqual('A blog powered by our CMS');
    expect(result.site_url).toEqual('https://localhost:3000');
    expect(result.admin_email).toEqual('admin@localhost.com');
    expect(result.posts_per_page).toEqual(10);
    expect(result.comments_enabled).toBe(true);
    expect(result.comment_moderation).toBe(true);
    expect(result.allow_registration).toBe(false);
    expect(result.default_user_role).toEqual('author');
    expect(result.timezone).toEqual('UTC');
  });
});

describe('resetToDefaults', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create default settings when none exist', async () => {
    const result = await resetToDefaults();

    expect(result.site_title).toEqual('My Blog');
    expect(result.site_description).toEqual('A blog powered by our CMS');
    expect(result.site_url).toEqual('https://localhost:3000');
    expect(result.admin_email).toEqual('admin@localhost.com');
    expect(result.posts_per_page).toEqual(10);
    expect(result.comments_enabled).toBe(true);
    expect(result.comment_moderation).toBe(true);
    expect(result.allow_registration).toBe(false);
    expect(result.default_user_role).toEqual('author');
    expect(result.timezone).toEqual('UTC');
    expect(result.date_format).toEqual('YYYY-MM-DD');
    expect(result.time_format).toEqual('HH:mm:ss');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should reset existing settings to defaults', async () => {
    // Create custom settings first
    await updateSiteSettings({
      site_title: 'Custom Blog',
      site_description: 'Custom description',
      posts_per_page: 50,
      comments_enabled: false,
      timezone: 'America/New_York'
    });

    const result = await resetToDefaults();

    expect(result.site_title).toEqual('My Blog');
    expect(result.site_description).toEqual('A blog powered by our CMS');
    expect(result.posts_per_page).toEqual(10);
    expect(result.comments_enabled).toBe(true);
    expect(result.timezone).toEqual('UTC');
  });

  it('should save default settings to database', async () => {
    const result = await resetToDefaults();

    const settings = await db.select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.id, result.id))
      .execute();

    expect(settings).toHaveLength(1);
    expect(settings[0].site_title).toEqual('My Blog');
    expect(settings[0].posts_per_page).toEqual(10);
    expect(settings[0].timezone).toEqual('UTC');
  });
});

describe('getTimezones', () => {
  it('should return array of timezone strings', async () => {
    const result = await getTimezones();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('UTC');
    expect(result).toContain('America/New_York');
    expect(result).toContain('Europe/London');
    expect(result).toContain('Asia/Tokyo');
  });

  it('should return consistent timezone list', async () => {
    const result1 = await getTimezones();
    const result2 = await getTimezones();

    expect(result1).toEqual(result2);
  });
});

describe('validateSettings', () => {
  it('should validate correct settings', async () => {
    const validInput: UpdateSiteSettingsInput = {
      site_title: 'Valid Blog',
      site_url: 'https://valid.example.com',
      admin_email: 'admin@valid.com',
      posts_per_page: 15,
      timezone: 'UTC'
    };

    const result = await validateSettings(validInput);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid URL', async () => {
    const invalidInput: UpdateSiteSettingsInput = {
      site_url: 'not-a-valid-url'
    };

    const result = await validateSettings(invalidInput);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('site_url must be a valid URL');
  });

  it('should reject invalid email', async () => {
    const invalidInput: UpdateSiteSettingsInput = {
      admin_email: 'not-a-valid-email'
    };

    const result = await validateSettings(invalidInput);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('admin_email must be a valid email address');
  });

  it('should reject posts_per_page out of range', async () => {
    const invalidInput1: UpdateSiteSettingsInput = {
      posts_per_page: 0
    };

    const result1 = await validateSettings(invalidInput1);
    expect(result1.valid).toBe(false);
    expect(result1.errors).toContain('posts_per_page must be between 1 and 100');

    const invalidInput2: UpdateSiteSettingsInput = {
      posts_per_page: 101
    };

    const result2 = await validateSettings(invalidInput2);
    expect(result2.valid).toBe(false);
    expect(result2.errors).toContain('posts_per_page must be between 1 and 100');
  });

  it('should reject invalid timezone', async () => {
    const invalidInput: UpdateSiteSettingsInput = {
      timezone: 'Invalid/Timezone'
    };

    const result = await validateSettings(invalidInput);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('timezone must be a valid timezone identifier');
  });

  it('should reject empty string fields', async () => {
    const invalidInput: UpdateSiteSettingsInput = {
      site_title: '',
      site_description: '',
      admin_email: ''
    };

    const result = await validateSettings(invalidInput);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('site_title cannot be empty');
    expect(result.errors).toContain('site_description cannot be empty');
    expect(result.errors).toContain('admin_email cannot be empty');
  });

  it('should accumulate multiple validation errors', async () => {
    const invalidInput: UpdateSiteSettingsInput = {
      site_title: '',
      site_url: 'invalid-url',
      admin_email: 'invalid-email',
      posts_per_page: 150,
      timezone: 'Bad/Timezone'
    };

    const result = await validateSettings(invalidInput);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors).toContain('site_title cannot be empty');
    expect(result.errors).toContain('site_url must be a valid URL');
    expect(result.errors).toContain('admin_email must be a valid email address');
    expect(result.errors).toContain('posts_per_page must be between 1 and 100');
    expect(result.errors).toContain('timezone must be a valid timezone identifier');
  });

  it('should handle empty input', async () => {
    const result = await validateSettings({});

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});