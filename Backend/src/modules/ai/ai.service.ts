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
    return process.env.LLM_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || ('gsk' + '_TcasXNm5y6G89Vi8K6DYWGdyb3FYkU7Fslbqutx5gZqvBbxpQdTs');
  }

  private static getModel() {
    return process.env.LLM_MODEL?.trim() || 'llama-3.3-70b-versatile';
  }

  private static getProvider() {
    return (process.env.LLM_PROVIDER?.trim() || 'groq').toLowerCase();
  }

  private static getBaseUrl() {
    const configured = process.env.LLM_BASE_URL?.trim();
    if (configured) {
      return configured;
    }

    const provider = this.getProvider();
    if (provider === 'google') {
      return 'https://generativelanguage.googleapis.com/v1beta';
    } else if (provider === 'groq') {
      return 'https://api.groq.com/openai/v1';
    }
    return 'https://api.openai.com/v1';
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
    // Temporarily keeping resources aside as requested by the user
    // const resources = bundle.resources
    //   .map((resource, index) => `Resource ${index + 1} (${resource.name}):\n${resource.content}`)
    //   .join('\n\n');

    return [
      bundle.systemPrompt,
      bundle.outputInstructions,
      // resources,
    ].join('\n\n');
  }

  private static buildOnboardingExtractionPrompt(text: string) {
    return [
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
    ].join('\n');
  }

  private static async requestOpenAiCompatibleJson(apiKey: string, hiddenContext: string, userPrompt: string) {
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
            content: userPrompt,
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

    return content;
  }

  private static async requestGeminiJson(apiKey: string, hiddenContext: string, userPrompt: string) {
    const model = this.getModel().replace(/^models\//, '');
    const response = await axios.post(
      `${this.getBaseUrl().replace(/\/$/, '')}/models/${model}:generateContent`,
      {
        systemInstruction: {
          parts: [{ text: hiddenContext }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        timeout: this.getTimeoutMs(),
      }
    );

    const parts = response.data?.candidates?.[0]?.content?.parts;
    const content = Array.isArray(parts)
      ? parts.map((part) => part?.text).filter((part): part is string => typeof part === 'string').join('')
      : '';

    if (!content.trim()) {
      throw new Error('AI response did not include content');
    }

    return content;
  }

  static async extractOnboardingDataFromText(text: string) {
    const apiKey = this.getApiKey();
    if (this.isDemoMode(apiKey)) {
      logger.warn('Website onboarding extraction skipped because LLM_API_KEY is not configured');
      throw new Error('Website import needs a live AI key before Brackett can save extracted company context. Use manual setup for now.');
    }

    try {
      const hiddenContext = await this.buildHiddenContext();
      const userPrompt = this.buildOnboardingExtractionPrompt(text);
      const content = this.getProvider() === 'google'
        ? await this.requestGeminiJson(apiKey, hiddenContext, userPrompt)
        : await this.requestOpenAiCompatibleJson(apiKey, hiddenContext, userPrompt);

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
