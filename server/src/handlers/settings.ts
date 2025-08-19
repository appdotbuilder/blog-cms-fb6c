import { db } from '../db';
import { siteSettingsTable } from '../db/schema';
import { type UpdateSiteSettingsInput, type SiteSettings } from '../schema';

export const getSiteSettings = async (): Promise<SiteSettings | null> => {
  try {
    const results = await db.select()
      .from(siteSettingsTable)
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    return results[0];
  } catch (error) {
    console.error('Get site settings failed:', error);
    throw error;
  }
};

export const updateSiteSettings = async (input: UpdateSiteSettingsInput): Promise<SiteSettings> => {
  try {
    // Check if settings exist
    const existingSettings = await getSiteSettings();
    
    if (!existingSettings) {
      // Create new settings with input values and defaults
      const result = await db.insert(siteSettingsTable)
        .values({
          site_title: input.site_title || 'My Blog',
          site_description: input.site_description || 'A blog powered by our CMS',
          site_url: input.site_url || 'https://localhost:3000',
          admin_email: input.admin_email || 'admin@localhost.com',
          posts_per_page: input.posts_per_page || 10,
          comments_enabled: input.comments_enabled ?? true,
          comment_moderation: input.comment_moderation ?? true,
          allow_registration: input.allow_registration ?? false,
          default_user_role: input.default_user_role || 'author',
          timezone: input.timezone || 'UTC',
          date_format: input.date_format || 'YYYY-MM-DD',
          time_format: input.time_format || 'HH:mm:ss',
          updated_at: new Date()
        })
        .returning()
        .execute();

      return result[0];
    } else {
      // Update existing settings
      const updateData: Record<string, any> = {
        updated_at: new Date()
      };

      // Only update fields that are provided
      if (input.site_title !== undefined) updateData['site_title'] = input.site_title;
      if (input.site_description !== undefined) updateData['site_description'] = input.site_description;
      if (input.site_url !== undefined) updateData['site_url'] = input.site_url;
      if (input.admin_email !== undefined) updateData['admin_email'] = input.admin_email;
      if (input.posts_per_page !== undefined) updateData['posts_per_page'] = input.posts_per_page;
      if (input.comments_enabled !== undefined) updateData['comments_enabled'] = input.comments_enabled;
      if (input.comment_moderation !== undefined) updateData['comment_moderation'] = input.comment_moderation;
      if (input.allow_registration !== undefined) updateData['allow_registration'] = input.allow_registration;
      if (input.default_user_role !== undefined) updateData['default_user_role'] = input.default_user_role;
      if (input.timezone !== undefined) updateData['timezone'] = input.timezone;
      if (input.date_format !== undefined) updateData['date_format'] = input.date_format;
      if (input.time_format !== undefined) updateData['time_format'] = input.time_format;

      const result = await db.update(siteSettingsTable)
        .set(updateData)
        .returning()
        .execute();

      return result[0];
    }
  } catch (error) {
    console.error('Update site settings failed:', error);
    throw error;
  }
};

export const resetToDefaults = async (): Promise<SiteSettings> => {
  try {
    // Check if settings exist
    const existingSettings = await getSiteSettings();
    
    const defaultSettings = {
      site_title: 'My Blog',
      site_description: 'A blog powered by our CMS',
      site_url: 'https://localhost:3000',
      admin_email: 'admin@localhost.com',
      posts_per_page: 10,
      comments_enabled: true,
      comment_moderation: true,
      allow_registration: false,
      default_user_role: 'author' as const,
      timezone: 'UTC',
      date_format: 'YYYY-MM-DD',
      time_format: 'HH:mm:ss',
      updated_at: new Date()
    };

    if (!existingSettings) {
      // Create new settings with defaults
      const result = await db.insert(siteSettingsTable)
        .values(defaultSettings)
        .returning()
        .execute();

      return result[0];
    } else {
      // Update existing settings with defaults
      const result = await db.update(siteSettingsTable)
        .set(defaultSettings)
        .returning()
        .execute();

      return result[0];
    }
  } catch (error) {
    console.error('Reset to defaults failed:', error);
    throw error;
  }
};

export const getTimezones = async (): Promise<string[]> => {
  // Return a comprehensive list of common timezones
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'America/Buenos_Aires',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Stockholm',
    'Europe/Moscow',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Bangkok',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
    'Africa/Cairo',
    'Africa/Johannesburg'
  ];
};

export const validateSettings = async (input: UpdateSiteSettingsInput): Promise<{ valid: boolean; errors: string[] }> => {
  const errors: string[] = [];

  try {
    // Validate site_url format
    if (input.site_url) {
      try {
        new URL(input.site_url);
      } catch {
        errors.push('site_url must be a valid URL');
      }
    }

    // Validate admin_email format
    if (input.admin_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.admin_email)) {
        errors.push('admin_email must be a valid email address');
      }
    }

    // Validate posts_per_page range
    if (input.posts_per_page !== undefined) {
      if (input.posts_per_page < 1 || input.posts_per_page > 100) {
        errors.push('posts_per_page must be between 1 and 100');
      }
    }

    // Validate timezone
    if (input.timezone) {
      const validTimezones = await getTimezones();
      if (!validTimezones.includes(input.timezone)) {
        errors.push('timezone must be a valid timezone identifier');
      }
    }

    // Validate required fields are not empty strings
    if (input.site_title === '') {
      errors.push('site_title cannot be empty');
    }
    
    if (input.site_description === '') {
      errors.push('site_description cannot be empty');
    }

    if (input.admin_email === '') {
      errors.push('admin_email cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('Settings validation failed:', error);
    return {
      valid: false,
      errors: ['Validation error occurred']
    };
  }
};