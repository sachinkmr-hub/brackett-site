import axios from 'axios';
import { db } from '../../db/index.js';
import { onboardingProfiles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { loadPromptBundle } from '../../ai/prompt-loader.js';
import { logger } from '../../utils/logger.js';

const trimFence = (content: string) => {
  return content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
};

export class AIService {
  private static getApiKey() {
    return process.env.LLM_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || '';
  }

  private static getModel() {
    return process.env.LLM_MODEL?.trim() || 'gpt-4.1-mini';
  }

  private static getProvider() {
    return process.env.LLM_PROVIDER?.trim() || 'openai';
  }

  private static getBaseUrl() {
    return process.env.LLM_BASE_URL?.trim() || 'https://api.openai.com/v1';
  }

  private static getTimeoutMs() {
    const value = Number(process.env.LLM_TIMEOUT_MS || 30000);
    return Number.isFinite(value) && value > 0 ? value : 30000;
  }

  private static isDemoMode(apiKey: string) {
    return !apiKey || apiKey === 'demo_api_key_replace_me';
  }

  static hasLiveExtractionKey() {
    return !this.isDemoMode(this.getApiKey());
  }

  private static async buildHiddenContext() {
    const bundle = await loadPromptBundle();
    const resources = bundle.resources
      .map((resource, index) => `Resource ${index + 1} (${resource.name}):\n${resource.content}`)
      .join('\n\n');

    return [
      bundle.systemPrompt,
      bundle.outputInstructions,
      resources,
    ].join('\n\n');
  }

  static async extractOnboardingDataFromText(text: string) {
    const apiKey = this.getApiKey();
    if (this.isDemoMode(apiKey)) {
      logger.warn('Website onboarding extraction skipped because LLM_API_KEY is not configured');
      throw new Error('Website import needs a live AI key before Brackett can save extracted company context. Use manual setup for now.');
    }

    try {
      const hiddenContext = await this.buildHiddenContext();
      const response = await axios.post(
        `${this.getBaseUrl().replace(/\/$/, '')}/chat/completions`,
        {
          model: this.getModel(),
          messages: [
            {
              role: 'system',
              content: hiddenContext,
            },
            {
              role: 'user',
              content: [
                'Extract the following onboarding fields from the provided website text and return valid JSON only.',
                'Required fields:',
                '- businessName (string)',
                '- industry (string)',
                '- targetCustomer (string)',
                '- mainOffer (string)',
                '- primaryPainPoints (string)',
                "- toneAndStyle (string: 'calm'|'bold'|'playful'|'serious')",
                '',
                'Website text:',
                text.substring(0, 5000),
              ].join('\n'),
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: this.getTimeoutMs(),
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('AI response did not include content');
      }

      return JSON.parse(trimFence(content));
    } catch (error) {
      const safeError = axios.isAxiosError(error)
        ? {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
          }
        : {
            message: error instanceof Error ? error.message : 'Unknown AI error',
          };

      logger.error({ err: safeError, provider: this.getProvider() }, 'AI extraction failed');
      throw new Error('Failed to extract data using AI');
    }
  }

  static async injectOnboardingContext(workspaceId: string, basePrompt: string) {
    const [profile] = await db.select()
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.workspaceId, workspaceId))
      .limit(1);

    const hiddenContext = await this.buildHiddenContext();
    if (!profile) {
      return `${hiddenContext}\n\nTask:\n${basePrompt}`;
    }

    const workspaceContext = `
Workspace context:
- Business Name: ${profile.businessName || 'N/A'}
- Industry: ${profile.industry || 'N/A'}
- Target Customer: ${profile.targetCustomer || 'N/A'}
- Main Offer: ${profile.mainOffer || 'N/A'}
- Primary Pain Points: ${profile.primaryPainPoints || 'N/A'}
- Brand Tone/Style: ${profile.toneAndStyle || 'N/A'}
`.trim();

    return `${hiddenContext}\n\n${workspaceContext}\n\nTask:\n${basePrompt}`;
  }
}
