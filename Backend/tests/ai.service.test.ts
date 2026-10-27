import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { AIService } from '../src/modules/ai/ai.service.js';
vi.mock('axios', () => ({ default: { post: vi.fn(), isAxiosError: () => false } }));
vi.mock('../src/db/index.js', () => ({ db: {} }));
vi.mock('../src/ai/prompt-loader.js', () => ({ loadPromptBundle: async () => ({ systemPrompt: 'Extract data', outputInstructions: 'JSON only', resources: [] }) }));
afterEach(() => vi.unstubAllEnvs());
describe('AI extraction safety', () => {
  it('requires configuration instead of falling back to a bundled credential', async () => {
    vi.stubEnv('LLM_API_KEY', ''); vi.stubEnv('AI_API_KEY', '');
    expect(AIService.hasLiveExtractionKey()).toBe(false);
    await expect(AIService.extractOnboardingDataFromText('Example')).rejects.toThrow('live AI key');
    expect(axios.post).not.toHaveBeenCalled();
  });
  it('rejects syntactically valid JSON with missing required fields', async () => {
    vi.stubEnv('LLM_API_KEY', 'test-only');
    vi.mocked(axios.post).mockResolvedValue({ data: { choices: [{ message: { content: '{"businessName":"Example"}' } }] } });
    await expect(AIService.extractOnboardingDataFromText('Example')).rejects.toThrow('Failed to extract');
  });
  it('validates extraction and respects a configured compatible provider URL', async () => {
    vi.stubEnv('LLM_API_KEY', 'test-only'); vi.stubEnv('LLM_PROVIDER', 'groq');
    vi.stubEnv('LLM_BASE_URL', 'https://provider.example/v1');
    const profile = { businessName: 'Example', industry: 'SaaS', targetCustomer: 'Teams', mainOffer: 'Decision tracking', primaryPainPoints: 'Lost context', toneAndStyle: 'calm' };
    vi.mocked(axios.post).mockResolvedValue({ data: { choices: [{ message: { content: JSON.stringify(profile) } }] } });
    expect(await AIService.extractOnboardingDataFromText('Example')).toEqual(profile);
    expect(axios.post).toHaveBeenCalledWith('https://provider.example/v1/chat/completions', expect.any(Object), expect.any(Object));
  });
});
