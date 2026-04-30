import { settingsService } from './settingsService';
import { moderateLocally } from '../utils/contentFilter';
import { aiService } from './aiService';

export const moderationService = {
  /**
   * Evaluates content based on the AUTO_PUBLISH_MODE setting.
   * Returns true if the content should be flagged (held for admin approval).
   * Returns false if the content is approved for immediate publishing.
   */
  shouldFlag: async (text: string): Promise<boolean> => {
    const mode = await settingsService.get('AUTO_PUBLISH_MODE');

    switch (mode) {
      case 'MANUAL':
        // Tam Kontrol: Everything is flagged and waits for manual admin approval.
        return true;
      case 'LOCAL_AI': {
        // Yarı Otomatik: Use local regex-based content filter.
        const result = moderateLocally(text);
        return !result.allowed;
      }
      case 'GEMINI_AI': {
        // Akıllı Yarı Otomatik: Use Gemini AI to evaluate content.
        try {
          const result = await aiService.moderateContent(text);
          return !result.allowed;
        } catch (error) {
          // Fallback to local filter if AI fails
          console.error('Gemini moderation failed, falling back to local check', error);
          const localResult = moderateLocally(text);
          return !localResult.allowed;
        }
      }
      case 'AUTO':
      default:
        // Kapalı: Directly publish everything.
        return false;
    }
  }
};
