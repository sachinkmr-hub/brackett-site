import { Request, Response } from 'express';
import { z } from 'zod';
import { OnboardingService } from './onboarding.service.js';
import { getErrorMessage } from '../../utils/errors.js';

const websiteSchema = z.object({
  url: z.string().url().refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }, 'URL must use http or https')
});

const scratchSchema = z.object({
  businessName: z.string().min(1),
  industry: z.string().min(1),
  targetCustomer: z.string().optional(),
  mainOffer: z.string().optional(),
  primaryPainPoints: z.string().optional(),
  toneAndStyle: z.enum(['calm', 'bold', 'playful', 'serious']).optional(),
});

export class OnboardingController {
  static async getProfile(req: Request, res: Response) {
    try {
      const workspaceId = req.workspaceId!;
      const profile = await OnboardingService.getProfile(workspaceId);
      res.json(profile || { message: 'No profile found' });
    } catch (error: unknown) {
      res.status(500).json({ code: 'SERVER_ERROR', message: getErrorMessage(error) });
    }
  }

  static async onboardFromWebsite(req: Request, res: Response) {
    try {
      const workspaceId = req.workspaceId!;
      const { url } = websiteSchema.parse(req.body);
      
      const profile = await OnboardingService.onboardFromWebsite(workspaceId, url);
      res.json(profile);
    } catch (error: unknown) {
      res.status(400).json({ code: 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }

  static async onboardFromScratch(req: Request, res: Response) {
    try {
      const workspaceId = req.workspaceId!;
      const data = scratchSchema.parse(req.body);

      const profile = await OnboardingService.onboardFromScratch(workspaceId, data);
      res.json(profile);
    } catch (error: unknown) {
      res.status(400).json({ code: 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }
}
