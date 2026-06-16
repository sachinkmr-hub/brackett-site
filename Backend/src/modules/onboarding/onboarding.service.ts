import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../../db/index.js';
import { onboardingProfiles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { AIService } from '../ai/ai.service.js';
import { assertPublicHttpUrl, createPublicHttpAgents } from '../../utils/public-url.js';
import { ActivityService } from '../activity/activity.service.js';
import { logger } from '../../utils/logger.js';

const MAX_WEBSITE_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const MAX_EXTRACTED_TEXT_CHARS = 60_000;

type ScratchOnboardingInput = {
  businessName?: string;
  industry?: string;
  targetCustomer?: string;
  mainOffer?: string;
  primaryPainPoints?: string;
  toneAndStyle?: 'calm' | 'bold' | 'playful' | 'serious';
};

type FirecrawlLink = string | {
  url?: string;
  title?: string;
  description?: string;
};

type WebsiteExtractionResult = {
  text: string;
  source: 'direct' | 'firecrawl';
  pages: string[];
};

const getFirecrawlApiKey = () => process.env.FIRECRAWL_API_KEY?.trim() || '';

const getFirecrawlBaseUrl = () => (
  process.env.FIRECRAWL_BASE_URL?.trim() || 'https://api.firecrawl.dev/v2'
).replace(/\/$/, '');

const getFirecrawlMaxPages = () => {
  const configured = Number(process.env.FIRECRAWL_MAX_PAGES || 4);
  if (!Number.isFinite(configured) || configured <= 0) {
    return 4;
  }

  return Math.min(Math.floor(configured), 8);
};

const fetchPublicWebsite = async (rawUrl: string) => {
  let currentUrl = (await assertPublicHttpUrl(rawUrl)).toString();

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await axios.get(currentUrl, {
      ...createPublicHttpAgents(),
      timeout: 10000,
      maxContentLength: MAX_WEBSITE_BYTES,
      maxBodyLength: MAX_WEBSITE_BYTES,
      maxRedirects: 0,
      responseType: 'text',
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': 'Brackett-OnboardingBot/1.0',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new Error('Website redirect could not be followed safely');
      }

      currentUrl = (await assertPublicHttpUrl(new URL(location, currentUrl).toString())).toString();
      continue;
    }

    return response.data;
  }

  throw new Error('Website redirect limit reached');
};

const normalizeUrlForDeduping = (url: string) => {
  const parsed = new URL(url);
  parsed.hash = '';
  parsed.search = '';
  return parsed.toString().replace(/\/$/, '');
};

const getLinkUrl = (link: FirecrawlLink) => typeof link === 'string' ? link : link.url;

const pickUsefulFirecrawlUrls = (rawUrl: string, links: FirecrawlLink[]) => {
  const baseUrl = new URL(rawUrl);
  const scored = new Map<string, number>();
  const addUrl = (candidate: string | undefined, score: number) => {
    if (!candidate) {
      return;
    }

    try {
      const parsed = new URL(candidate, baseUrl);
      if (parsed.origin !== baseUrl.origin) {
        return;
      }

      const normalized = normalizeUrlForDeduping(parsed.toString());
      scored.set(normalized, Math.max(scored.get(normalized) || 0, score));
    } catch {
      // Ignore malformed URLs returned by external crawlers.
    }
  };

  addUrl(baseUrl.toString(), 100);
  for (const link of links) {
    const url = getLinkUrl(link);
    if (!url) {
      continue;
    }

    try {
      const path = new URL(url, baseUrl).pathname.toLowerCase();
      const intentScore =
        /(about|company|product|features|solutions|services|pricing|customers|case-studies|contact)/.test(path)
          ? 70
          : 20;

      addUrl(url, intentScore);
    } catch {
      // Ignore malformed URLs returned by external crawlers.
    }
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, getFirecrawlMaxPages())
    .map(([url]) => url);
};

const extractFirecrawlText = (data: any, pageUrl: string) => {
  const metadata = data?.metadata || {};
  const parts = [
    `Source URL: ${pageUrl}`,
    metadata.title ? `Title: ${metadata.title}` : '',
    metadata.description ? `Description: ${metadata.description}` : '',
    data?.summary ? `Summary: ${data.summary}` : '',
    data?.markdown ? `Page content:\n${data.markdown}` : '',
    Array.isArray(data?.links) && data.links.length
      ? `Important links:\n${data.links.slice(0, 25).join('\n')}`
      : '',
    data?.branding ? `Branding data:\n${JSON.stringify(data.branding)}` : '',
  ].filter(Boolean);

  return parts.join('\n\n').slice(0, 18_000);
};

const scrapeWithFirecrawl = async (rawUrl: string): Promise<WebsiteExtractionResult | null> => {
  const apiKey = getFirecrawlApiKey();
  if (!apiKey) {
    return null;
  }

  const safeUrl = (await assertPublicHttpUrl(rawUrl)).toString();
  const baseUrl = getFirecrawlBaseUrl();
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  try {
    let candidateUrls = [safeUrl];
    try {
      const mapResponse = await axios.post(
        `${baseUrl}/map`,
        {
          url: safeUrl,
          sitemap: 'include',
          includeSubdomains: false,
          ignoreQueryParameters: true,
          limit: 30,
          timeout: 30000,
        },
        { headers, timeout: 35000 }
      );
      const mappedLinks = mapResponse.data?.links || mapResponse.data?.data?.links || [];
      candidateUrls = pickUsefulFirecrawlUrls(safeUrl, mappedLinks);
    } catch (mapError) {
      logger.warn({ err: mapError instanceof Error ? mapError.message : String(mapError), safeUrl }, 'Firecrawl /map failed (possibly free tier), falling back to single page scrape');
    }
    const pageTexts: string[] = [];
    const pages: string[] = [];

    for (const pageUrl of candidateUrls) {
      try {
        const scrapeResponse = await axios.post(
          `${baseUrl}/scrape`,
          {
            url: pageUrl,
            formats: ['markdown', 'summary', 'links', 'branding'],
            onlyMainContent: true,
            onlyCleanContent: true,
            removeBase64Images: true,
            blockAds: true,
            timeout: 60000,
          },
          { headers, timeout: 70000 }
        );

        const data = scrapeResponse.data?.data;
        const pageText = extractFirecrawlText(data, pageUrl);
        if (pageText.trim()) {
          pageTexts.push(pageText);
          pages.push(pageUrl);
        }
      } catch (error) {
        logger.warn({
          err: error instanceof Error ? error.message : 'Unknown Firecrawl scrape error',
          pageUrl,
        }, 'Firecrawl page scrape failed');
      }
    }

    if (!pageTexts.length) {
      return null;
    }

    return {
      text: pageTexts.join('\n\n---\n\n').slice(0, MAX_EXTRACTED_TEXT_CHARS),
      source: 'firecrawl',
      pages,
    };
  } catch (error) {
    logger.warn({
      err: error instanceof Error ? error.message : 'Unknown Firecrawl error',
      url: safeUrl,
    }, 'Firecrawl website extraction failed, falling back to direct scrape');
    return null;
  }
};

const scrapeDirectly = async (url: string): Promise<WebsiteExtractionResult> => {
  const html = await fetchPublicWebsite(url);
  const $ = cheerio.load(html);
  $('script, style, nav, footer, iframe').remove();

  const title = $('title').text().trim();
  const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
  const text = [
    title ? `Title: ${title}` : '',
    description ? `Description: ${description}` : '',
    $('body').text().replace(/\s+/g, ' ').trim(),
  ].filter(Boolean).join('\n\n');

  return {
    text: text.slice(0, MAX_EXTRACTED_TEXT_CHARS),
    source: 'direct',
    pages: [url],
  };
};

const extractWebsiteContext = async (url: string) => {
  const firecrawlResult = await scrapeWithFirecrawl(url);
  if (firecrawlResult) {
    return firecrawlResult;
  }

  return scrapeDirectly(url);
};

export class OnboardingService {
  static async getProfile(workspaceId: string) {
    const [profile] = await db.select()
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.workspaceId, workspaceId))
      .limit(1);
    
    return profile || null;
  }

  static async onboardFromWebsite(workspaceId: string, url: string) {
    let extraction: WebsiteExtractionResult;
    try {
      extraction = await extractWebsiteContext(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to scrape website';
      throw new Error(message);
    }

    const extractedData = await AIService.extractOnboardingDataFromText(extraction.text);

    const [profile] = await db.insert(onboardingProfiles)
      .values({
        workspaceId,
        hasWebsite: true,
        websiteUrl: url,
        ...extractedData
      })
      .onConflictDoUpdate({
        target: onboardingProfiles.workspaceId,
        set: {
          hasWebsite: true,
          websiteUrl: url,
          ...extractedData,
          updatedAt: new Date()
        }
      })
      .returning();

    await ActivityService.record({
      workspaceId,
      category: 'onboarding',
      type: 'website_imported',
      title: 'Website context imported',
      summary: `Brackett refreshed workspace context from ${extraction.pages.length} page${extraction.pages.length === 1 ? '' : 's'} using ${extraction.source}.`,
      targetType: 'onboarding_profile',
      targetId: profile.workspaceId,
    }).catch(() => undefined);

    return profile;
  }

  static async onboardFromScratch(workspaceId: string, data: ScratchOnboardingInput) {
    const [profile] = await db.insert(onboardingProfiles)
      .values({
        workspaceId,
        hasWebsite: false,
        ...data
      })
      .onConflictDoUpdate({
        target: onboardingProfiles.workspaceId,
        set: {
          hasWebsite: false,
          ...data,
          updatedAt: new Date()
        }
      })
      .returning();

    await ActivityService.record({
      workspaceId,
      category: 'onboarding',
      type: 'scratch_profile_saved',
      title: 'Business profile saved',
      summary: 'Workspace context was updated from the manual onboarding form.',
      targetType: 'onboarding_profile',
      targetId: profile.workspaceId,
    }).catch(() => undefined);

    return profile;
  }
}
