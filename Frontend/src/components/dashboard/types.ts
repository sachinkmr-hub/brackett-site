export type Workspace = {
  id: string;
  name: string;
  slug: string;
  planTier?: string;
  role?: string;
};

export type OnboardingProfile = {
  hasWebsite: boolean;
  websiteUrl?: string | null;
  businessName?: string | null;
  industry?: string | null;
  targetCustomer?: string | null;
  mainOffer?: string | null;
  primaryPainPoints?: string | null;
  toneAndStyle?: string | null;
};

export type Board = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isArchived: boolean;
};

export type Assignee = {
  id: string;
  name: string;
  email: string;
};

export type QuestionEvent = {
  id: string;
  type: string;
  createdAt: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  actor?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type AnnouncementDraft = {
  questionId: string;
  title: string;
  connectedProviders: string[];
  announcedTo: string[];
  announcement: {
    plainText: string;
    slackMrkdwn: string;
    teamsText: string;
  };
};

export type Question = {
  id: string;
  title: string;
  longDescription?: string | null;
  sourceType?: string | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  sourceExcerpt?: string | null;
  category?: string | null;
  priority?: string | null;
  status: string;
  board?: Board | null;
  assignees?: Assignee[];
  latestDecision?: {
    newValue?: {
      decisionText?: string;
      sourceSummary?: string;
      sourceUrl?: string;
    };
  } | null;
  events?: QuestionEvent[];
};

export type Member = {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
};

export type Invite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt?: string | null;
};

export type InviteCreateResponse = Invite & {
  inviteLink: string;
  emailDelivery?: {
    provider: string;
    sent: boolean;
    message: string;
  };
};

export type Integration = {
  id: string;
  provider: string;
  status: string;
  externalAccountEmail?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type IntegrationCatalogItem = {
  provider: string;
  label: string;
  category: string;
  connectionType: string;
  supportsSync: boolean;
  requiredExternalSetup: string[];
};

export type AnalyticsOverview = {
  total: number;
  open: number;
  active?: number;
  in_progress: number;
  answered: number;
  archived: number;
  highPriority?: number;
  stale?: number;
  needsSource?: number;
  sourceBacked?: number;
  sourceCoverage?: number;
  liveSources?: number;
  totalBoards?: number;
  oldestOpenQuestion?: {
    title: string;
    ageDays: number;
  } | null;
  assignedToMe?: Array<{
    id: string;
    title: string;
    status: string;
    priority?: string | null;
  }>;
};

export type WorkspaceActivityItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  summary?: string | null;
  createdAt: string;
  actor?: {
    name?: string;
    email?: string;
  } | null;
};

export type AutoAssignResponse = {
  selectedMember: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  heuristic: string;
};

export type AnnouncementSendResponse = {
  questionId: string;
  title: string;
  deliveries: Array<{
    provider: string;
    target?: string | null;
    status: string;
    errorMessage?: string | null;
  }>;
};

export type PrivateAnalystResponse = {
  query: string;
  answer: string;
  confidence: 'workspace_grounded' | 'needs_live_source' | string;
  profile?: {
    businessName?: string | null;
    industry?: string | null;
    targetCustomer?: string | null;
  } | null;
  summary: {
    openLoops: number;
    highPriority: number;
    sourceGaps: number;
    liveSources: number;
    boards: number;
  };
  sources: Array<{
    id: string;
    title: string;
    status: string;
    priority?: string | null;
    board?: string | null;
    sourceUrl?: string | null;
    sourceLabel?: string | null;
  }>;
  nextActions: string[];
};

export type TabKey = 'overview' | 'onboarding' | 'discussions' | 'team' | 'integrations' | 'analyst';
