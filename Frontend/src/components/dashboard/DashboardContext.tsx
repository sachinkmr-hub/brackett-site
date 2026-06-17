import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { apiRequest, apiFetch } from '../../lib/api';
import { LEGACY_WORKSPACE_ID_KEY } from '../../lib/authSession';
import { useAuth } from '../../providers/AuthProvider';
import { useModal } from '../../providers/ModalProvider';
import {
  Workspace, OnboardingProfile, Board, Question, Member, Invite,
  Integration, IntegrationCatalogItem, AnalyticsOverview, WorkspaceActivityItem,
  AutoAssignResponse, AnnouncementSendResponse, AnnouncementDraft, InviteCreateResponse,
  PrivateAnalystResponse
} from './types';

interface DashboardContextType {
  isLoading: boolean;
  error: string | null;
  workspace: Workspace | null;
  onboardingProfile: OnboardingProfile | null;
  boards: Board[];
  questions: Question[];
  members: Member[];
  invites: Invite[];
  integrations: Integration[];
  integrationCatalog: IntegrationCatalogItem[];
  analytics: AnalyticsOverview | null;
  activityFeed: WorkspaceActivityItem[];
  
  // Handlers & Helpers
  loadDashboard: () => Promise<void>;
  submitQuestion: (form: any) => Promise<boolean>;
  submitDecision: (questionId: string, form: any) => Promise<boolean>;
  createBoard: (form: any) => Promise<boolean>;
  toggleBoardArchive: (board: Board) => Promise<boolean>;
  createInvite: (form: any) => Promise<string>;
  submitWebsiteOnboarding: (url: string) => Promise<boolean>;
  submitScratchOnboarding: (form: any) => Promise<boolean>;
  updateQuestionStatus: (questionId: string, status: string) => Promise<boolean>;
  autoAssignQuestion: (questionId: string) => Promise<boolean>;
  exportQuestions: (format: 'json' | 'markdown' | 'pdf') => Promise<boolean>;
  connectPlaceholderIntegration: (provider: string, isClerkAuth: boolean) => Promise<boolean>;
  copyAnnouncementDraft: (questionId: string) => Promise<boolean>;
  sendAnnouncementUpdate: (questionId: string, providers: string[]) => Promise<boolean>;
  askPrivateAnalyst: (query: string) => Promise<PrivateAnalystResponse | null>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationCatalog, setIntegrationCatalog] = useState<IntegrationCatalogItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [activityFeed, setActivityFeed] = useState<WorkspaceActivityItem[]>([]);
  
  const { isAuthenticated, logout } = useAuth();
  const { showAlert } = useModal();

  const loadDashboard = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);

    try {
      let workspaceId = localStorage.getItem(LEGACY_WORKSPACE_ID_KEY);

      const workspaceList = await apiRequest<Workspace[]>('/workspaces');
      const activeWorkspace = workspaceList.find((item) => item.id === workspaceId) || workspaceList[0] || null;

      if (!activeWorkspace) {
        throw new Error('We could not find a workspace for this account yet. Sign in again or create a new workspace.');
      }

      workspaceId = activeWorkspace.id;
      localStorage.setItem(LEGACY_WORKSPACE_ID_KEY, workspaceId);

      const [
        workspaceDetails, onboardingData, boardList, questionList,
        analyticsData, memberList, integrationList, catalog,
      ] = await Promise.all([
        apiRequest<Workspace>(`/workspaces/${workspaceId}`),
        apiRequest<OnboardingProfile | { message: string }>(`/workspaces/${workspaceId}/onboarding`).catch(() => ({ message: 'no onboarding profile' })),
        apiRequest<Board[]>(`/workspaces/${workspaceId}/boards`),
        apiRequest<Question[]>(`/workspaces/${workspaceId}/questions`),
        apiRequest<AnalyticsOverview>(`/workspaces/${workspaceId}/analytics/overview`),
        apiRequest<Member[]>(`/workspaces/${workspaceId}/members`),
        apiRequest<Integration[]>(`/workspaces/${workspaceId}/integrations`),
        apiRequest<IntegrationCatalogItem[]>(`/workspaces/${workspaceId}/integrations/catalog`),
      ]);

      let workspaceActivity: WorkspaceActivityItem[] = [];
      let inviteList: Invite[] = [];
      try { inviteList = await apiRequest<Invite[]>(`/workspaces/${workspaceId}/invites`); } catch {}
      try { workspaceActivity = await apiRequest<WorkspaceActivityItem[]>(`/workspaces/${workspaceId}/activity`); } catch {}

      setWorkspace({ ...workspaceDetails, role: activeWorkspace.role });
      setOnboardingProfile('message' in onboardingData ? null : onboardingData);
      setBoards(boardList);
      setQuestions(questionList);
      setMembers(memberList);
      setInvites(inviteList);
      setIntegrations(integrationList);
      setIntegrationCatalog(catalog);
      setAnalytics(analyticsData);
      setActivityFeed(workspaceActivity);
    } catch (loadError: any) {
      if (loadError.message?.toLowerCase().includes('session is no longer active')) return;
      setError(loadError.message || 'Unable to load the dashboard right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [isAuthenticated]);

  const withWorkspace = async (callback: (workspaceId: string) => Promise<void>) => {
    if (!workspace?.id) return false;
    try {
      await callback(workspace.id);
      await loadDashboard();
      return true;
    } catch (err: unknown) {
      showAlert('Action Failed', err instanceof Error ? err.message : 'That action did not go through.');
      return false;
    }
  };

  // --- Handlers ---
  const submitQuestion = async (form: any) => withWorkspace(async (id) => {
    await apiRequest(`/workspaces/${id}/questions`, { method: 'POST', body: JSON.stringify(form) });
    showAlert('Success', 'Question added to the workspace.');
  });

  const submitDecision = async (questionId: string, form: any) => withWorkspace(async (id) => {
    await apiRequest(`/workspaces/${id}/questions/${questionId}/decision`, { method: 'POST', body: JSON.stringify(form) });
    showAlert('Success', 'Official decision logged.');
    if (typeof pendo !== 'undefined') {
      pendo.track('decision_logged', {
        question_id: questionId,
        has_source_summary: Boolean(form.sourceSummary),
        has_source_url: Boolean(form.sourceUrl),
      });
    }
  });

  const createBoard = async (form: any) => withWorkspace(async (id) => {
    await apiRequest(`/workspaces/${id}/boards`, { method: 'POST', body: JSON.stringify(form) });
    showAlert('Success', 'Board created.');
  });

  const toggleBoardArchive = async (board: Board) => withWorkspace(async (id) => {
    await apiRequest(`/workspaces/${id}/boards/${board.id}`, { method: 'PATCH', body: JSON.stringify({ isArchived: !board.isArchived }) });
    showAlert('Success', board.isArchived ? 'Board restored.' : 'Board archived.');
    if (typeof pendo !== 'undefined') {
      pendo.track('board_archive_toggled', {
        board_id: board.id,
        board_name: board.name,
        action: board.isArchived ? 'restored' : 'archived',
      });
    }
  });

  const createInvite = async (form: any) => {
    let link = '';
    await withWorkspace(async (id) => {
      const invite = await apiRequest<InviteCreateResponse>(`/workspaces/${id}/invites`, { method: 'POST', body: JSON.stringify(form) });
      link = invite.inviteLink;
      await navigator.clipboard?.writeText(link).catch(() => undefined);
      const deliveryMessage = invite.emailDelivery?.message || 'Invite link created.';
      showAlert(invite.emailDelivery?.sent ? 'Invite Sent' : 'Invite Link Ready', `${deliveryMessage} The invite link is ready to share.`);
      if (typeof pendo !== 'undefined') {
        pendo.track('invite_created', {
          invitee_role: form.role || 'member',
          email_delivery_sent: Boolean(invite.emailDelivery?.sent),
          email_delivery_provider: invite.emailDelivery?.provider || '',
        });
      }
    });
    return link;
  };

  const submitWebsiteOnboarding = async (url: string) => withWorkspace(async (id) => {
    await apiRequest(`/workspaces/${id}/onboarding/website`, { method: 'POST', body: JSON.stringify({ url }) });
    showAlert('Success', 'Website onboarding refreshed.');
  });

  const submitScratchOnboarding = async (form: any) => withWorkspace(async (id) => {
    await apiRequest(`/workspaces/${id}/onboarding/scratch`, { method: 'POST', body: JSON.stringify(form) });
    showAlert('Success', 'Business profile saved.');
  });

  const updateQuestionStatus = async (questionId: string, status: string) => withWorkspace(async (id) => {
    const previousStatus = questions.find(q => q.id === questionId)?.status || '';
    await apiRequest(`/workspaces/${id}/questions/${questionId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (typeof pendo !== 'undefined') {
      pendo.track('question_status_updated', {
        question_id: questionId,
        new_status: status,
        previous_status: previousStatus,
      });
    }
  });

  const autoAssignQuestion = async (questionId: string) => withWorkspace(async (id) => {
    const payload = await apiRequest<AutoAssignResponse>(`/workspaces/${id}/questions/${questionId}/auto-assign`, { method: 'POST', body: JSON.stringify({}) });
    showAlert('Assigned', `Assigned ${payload.selectedMember.name} using the workspace load-balancing rule.`);
    if (typeof pendo !== 'undefined') {
      pendo.track('question_auto_assigned', {
        question_id: questionId,
        assigned_member_name: payload.selectedMember.name,
        assigned_member_role: payload.selectedMember.role,
        heuristic: payload.heuristic,
      });
    }
  });

  const exportQuestions = async (format: 'json' | 'markdown' | 'pdf') => withWorkspace(async (id) => {
    if (format === 'pdf') {
      const response = await apiFetch(`/workspaces/${id}/questions/export/pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'brackett-workspace-export.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showAlert('Success', 'PDF export downloaded.');
      if (typeof pendo !== 'undefined') {
        pendo.track('questions_exported', {
          export_format: 'pdf',
          question_count: questions.length,
        });
      }
      return;
    }

    const payload = await apiRequest<any>(`/workspaces/${id}/questions/export/${format}`);
    if (format === 'markdown' && payload.content) {
      navigator.clipboard.writeText(payload.content).catch(() => {});
      showAlert('Success', 'Markdown export copied to clipboard.');
    } else {
      const content = JSON.stringify(payload.questions || payload, null, 2);
      navigator.clipboard.writeText(content).catch(() => {});
      showAlert('Success', 'JSON export copied to clipboard.');
    }
    if (typeof pendo !== 'undefined') {
      pendo.track('questions_exported', {
        export_format: format,
        question_count: questions.length,
      });
    }
  });

  const connectPlaceholderIntegration = async (provider: string, isGoogleAuthReady: boolean) => withWorkspace(async (id) => {
    await apiRequest(`/workspaces/${id}/integrations/${provider}`, {
      method: 'POST',
      body: JSON.stringify({
        status: isGoogleAuthReady ? 'ready' : 'setup_required',
        metadata: { setupState: isGoogleAuthReady ? 'linked-through-clerk-auth' : 'waiting-for-provider-credentials' },
      }),
    });
    showAlert('Success', isGoogleAuthReady ? `${provider} setup saved.` : `${provider} setup checklist saved.`);
    if (typeof pendo !== 'undefined') {
      pendo.track('integration_setup_saved', {
        provider: provider,
        is_google_auth_ready: isGoogleAuthReady,
        status: isGoogleAuthReady ? 'ready' : 'setup_required',
      });
    }
  });

  const copyAnnouncementDraft = async (questionId: string) => withWorkspace(async (id) => {
    const payload = await apiRequest<AnnouncementDraft>(`/workspaces/${id}/questions/${questionId}/announcement`);
    const connected = payload.connectedProviders;
    const preferredText = connected.includes('slack') ? payload.announcement.slackMrkdwn :
                          connected.includes('teams') ? payload.announcement.teamsText :
                          payload.announcement.plainText;
    await navigator.clipboard.writeText(preferredText).catch(() => {});
    showAlert('Success', connected.length ? `Announcement copied for ${connected.join(', ')}.` : 'Announcement copied.');
    if (typeof pendo !== 'undefined') {
      pendo.track('announcement_draft_copied', {
        question_id: questionId,
        connected_providers_count: connected.length,
        preferred_format: connected.includes('slack') ? 'slack' : connected.includes('teams') ? 'teams' : 'plain',
      });
    }
  });

  const sendAnnouncementUpdate = async (questionId: string, providers: string[]) => withWorkspace(async (id) => {
    const payload = await apiRequest<AnnouncementSendResponse>(`/workspaces/${id}/questions/${questionId}/announcement/send`, {
      method: 'POST', body: JSON.stringify({ providers })
    });
    const summary = payload.deliveries.map((d) => `${d.provider} (${d.status})`).join(', ');
    showAlert('Sent', summary ? `Delivery recorded: ${summary}.` : 'Announcement delivery requested.');
    if (typeof pendo !== 'undefined') {
      pendo.track('announcement_sent', {
        question_id: questionId,
        provider_count: providers.length,
        providers: providers.join(','),
        delivery_statuses: payload.deliveries.map(d => d.status).join(','),
      });
    }
  });

  const askPrivateAnalyst = async (query: string) => {
    if (!workspace?.id) return null;
    try {
      return await apiRequest<PrivateAnalystResponse>(`/workspaces/${workspace.id}/private_ai`, {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
    } catch (err: unknown) {
      showAlert('Analyst Unavailable', err instanceof Error ? err.message : 'The analyst could not answer that yet.');
      return null;
    }
  };

  return (
    <DashboardContext.Provider value={{
      isLoading, error, workspace, onboardingProfile, boards, questions, members, invites,
      integrations, integrationCatalog, analytics, activityFeed,
      loadDashboard, submitQuestion, submitDecision, createBoard, toggleBoardArchive,
      createInvite, submitWebsiteOnboarding, submitScratchOnboarding, updateQuestionStatus,
      autoAssignQuestion, exportQuestions, connectPlaceholderIntegration, copyAnnouncementDraft,
      sendAnnouncementUpdate, askPrivateAnalyst
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
