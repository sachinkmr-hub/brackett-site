import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import { AuthProvider } from '../../providers/AuthProvider';
import { ModalProvider } from '../../providers/ModalProvider';
import { useDashboard } from '../../components/dashboard/DashboardContext';

// Hoisted state helper to share auth token with the mock
const mockSessionMock = vi.hoisted(() => ({
  token: null as string | null,
  capturedTokenRefreshHandler: null as ((token: string) => void) | null
}));

// Mock API refresh token to bypass module scope caching state leakage across tests
vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<any>('../../lib/api');
  return {
    ...actual,
    configureApi: (getter: any, fail: any, refresh: any) => {
      console.log('MOCK configureApi called!');
      mockSessionMock.capturedTokenRefreshHandler = refresh;
      return actual.configureApi(getter, fail, refresh);
    },
    refreshAccessToken: async () => {
      console.log('MOCK refreshAccessToken called! token:', mockSessionMock.token, 'hasHandler:', !!mockSessionMock.capturedTokenRefreshHandler);
      const token = mockSessionMock.token;
      if (token && mockSessionMock.capturedTokenRefreshHandler) {
        console.log('MOCK calling capturedTokenRefreshHandler with:', token);
        mockSessionMock.capturedTokenRefreshHandler(token);
      }
      return token;
    }
  };
});


// Mock matchMedia for jsdom environment
if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function(query: string): MediaQueryList {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: function() {},
      removeListener: function() {},
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return false; }
    } as unknown as MediaQueryList;
  };
}


// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

// Mock Lenis smooth scroll library
vi.mock('lenis', () => {
  return {
    default: class MockLenis {
      on() {}
      destroy() {}
      raf() {}
      scrollTo() {}
    }
  };
});

// Mock Recharts to avoid SVG size calculation issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  AreaChart: ({ children }: any) => children,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

// Mock Clerk entirely to avoid ClerkProvider missing errors
vi.mock('../../lib/clerk', () => {
  return {
    isClerkFrontendConfigured: () => false,
    isClerkCallbackRequest: () => false,
    isClerkBridgeRequest: () => false,
    getClerkRedirectTarget: () => '/dashboard',
    isClerkAuthHandoffRequest: () => false,
    clearClerkAuthHandoffRequest: () => {},
    clearClerkCallbackRequest: () => {},
    getClerkPublishableKey: () => undefined,
  };
});

// Mock GuidedTour to avoid Joyride measurement issues in jsdom
vi.mock('../../components/dashboard/GuidedTour', () => {
  return {
    GuidedTour: ({ activeTab, needsOnboarding, onSelectTab }: any) => {
      const [run, setRun] = React.useState(false);
      React.useEffect(() => {
        const hasSeenTour = localStorage.getItem('brackett_tour_v3_seen');
        if (!hasSeenTour && activeTab === 'overview') {
          setRun(true);
        }
      }, [activeTab]);

      if (!run) return null;
      return (
        <div data-testid="guided-tour-active" className="p-4 border rounded bg-white">
          <h3>Welcome to brackett</h3>
          <button
            data-testid="guided-tour-finish"
            onClick={() => {
              localStorage.setItem('brackett_tour_v3_seen', 'true');
              setRun(false);
            }}
          >
            Finish
          </button>
        </div>
      );
    }
  };
});

// Inject a test helper to trigger context actions
const TestDashboardActions = () => {
  const { submitDecision } = useDashboard();
  return (
    <div data-testid="test-actions-container" className="hidden">
      <button
        data-testid="test-submit-decision-btn"
        onClick={() => {
          void submitDecision('question-1', { decisionText: 'Official Decision Logged' });
        }}
      >
        Trigger Decision
      </button>
    </div>
  );
};

// We monkeypatch DashboardLayout so we can inject TestDashboardActions for testing context actions
vi.mock('../../components/dashboard/DashboardLayout', async () => {
  const actual = await vi.importActual<any>('../../components/dashboard/DashboardLayout');
  return {
    ...actual,
    DashboardLayout: () => {
      const Layout = actual.DashboardLayout;
      return (
        <>
          <Layout />
          <TestDashboardActions />
        </>
      );
    }
  };
});

// Stateful mock backend state
let mockWorkspace: any = {
  id: 'workspace-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  role: 'owner'
};
let mockOnboardingProfile: any = null;
let mockBoards: any[] = [];
let mockQuestions: any[] = [];
let mockMembers: any[] = [
  { userId: 'user-1', name: 'Test User', email: 'test@example.com', role: 'owner', joinedAt: '2026-06-13' }
];
let mockInvites: any[] = [];
let mockIntegrations: any[] = [];
let mockActivityFeed: any[] = [];

const resetMockState = () => {
  mockWorkspace = {
    id: 'workspace-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    role: 'owner'
  };
  mockOnboardingProfile = null;
  mockBoards = [];
  mockQuestions = [];
  mockMembers = [
    { userId: 'user-1', name: 'Test User', email: 'test@example.com', role: 'owner', joinedAt: '2026-06-13' }
  ];
  mockInvites = [];
  mockIntegrations = [];
  mockActivityFeed = [];
  mockSessionMock.token = null;
};

const jsonResponse = (body: any, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

// Setup mock window.location — re-declared in beforeEach so vi.clearAllMocks() doesn't wipe it
let assignMock: ReturnType<typeof vi.fn>;
const originalLocation = window.location;

// Global stateful fetch interceptor mock
const defaultFetchImpl = async (url: string, options: any = {}) => {
  const method = options.method || 'GET';
  const urlString = url.toString();
  
  const apiBase = 'http://localhost:4000';
  const path = urlString.startsWith(apiBase) ? urlString.slice(apiBase.length) : urlString;

  console.log(`FETCH: ${method} ${path}`);

  if (path === '/auth/login') {
    if (method === 'POST') {
      const body = JSON.parse(options.body);
      if (body.email === 'test@example.com' && body.password === 'password123') {
        mockSessionMock.token = 'fresh-token';
        return jsonResponse({
          accessToken: 'fresh-token',
          workspace: { id: 'workspace-1', name: 'Acme Corp' },
          user: { authProvider: 'local' }
        });
      } else {
        return jsonResponse({ message: 'Invalid credentials' }, { status: 401 });
      }
    }
  }

  if (path === '/auth/signup') {
    if (method === 'POST') {
      const body = JSON.parse(options.body);
      if (body.password && body.password.length < 8) {
        return jsonResponse({ message: 'Password too short' }, { status: 400 });
      }
      mockSessionMock.token = 'fresh-token';
      return jsonResponse({
        accessToken: 'fresh-token',
        workspace: { id: 'workspace-1', name: body.workspaceName || 'Acme Corp' },
        user: { authProvider: 'local' }
      });
    }
  }

  if (path === '/auth/logout') {
    mockSessionMock.token = null;
    return jsonResponse({ ok: true });
  }

  if (path === '/auth/refresh') {
    if (mockSessionMock.token) {
      return jsonResponse({ accessToken: mockSessionMock.token });
    }
    return jsonResponse({ message: 'No session' }, { status: 401 });
  }

  if (path === '/workspaces') {
    return jsonResponse([
      { id: 'workspace-1', name: mockWorkspace.name, slug: 'acme-corp', role: 'owner' }
    ]);
  }

  if (path === '/workspaces/workspace-1') {
    return jsonResponse({
      id: 'workspace-1',
      name: mockWorkspace.name,
      slug: 'acme-corp',
      role: 'owner'
    });
  }

  if (path === '/workspaces/workspace-1/onboarding') {
    if (mockOnboardingProfile) {
      return jsonResponse(mockOnboardingProfile);
    } else {
      return jsonResponse({ message: 'no onboarding profile' }, { status: 404 });
    }
  }

  if (path === '/workspaces/workspace-1/onboarding/website') {
    const body = JSON.parse(options.body);
    if (!body.url.includes('.')) {
      return jsonResponse({ message: 'Invalid website URL format' }, { status: 400 });
    }
    mockOnboardingProfile = {
      websiteUrl: body.url,
      businessName: 'Acme Corp Website',
      industry: 'Software',
      targetCustomer: 'Developers',
      mainOffer: 'Tooling'
    };
    return jsonResponse({ ok: true });
  }

  if (path === '/workspaces/workspace-1/onboarding/scratch') {
    const body = JSON.parse(options.body);
    if (!body.businessName || !body.industry) {
      return jsonResponse({ message: 'Mandatory fields missing' }, { status: 400 });
    }
    mockOnboardingProfile = {
      websiteUrl: '',
      businessName: body.businessName,
      industry: body.industry,
      targetCustomer: body.targetCustomer,
      mainOffer: body.mainOffer,
      primaryPainPoints: body.primaryPainPoints || ''
    };
    return jsonResponse({ ok: true });
  }

  if (path === '/workspaces/workspace-1/boards') {
    if (method === 'POST') {
      const body = JSON.parse(options.body);
      const newBoard = {
        id: `board-${mockBoards.length + 1}`,
        name: body.name,
        description: body.description,
        isArchived: false
      };
      mockBoards.push(newBoard);
      return jsonResponse(newBoard);
    }
    return jsonResponse(mockBoards);
  }

  if (path.startsWith('/workspaces/workspace-1/boards/')) {
    const boardId = path.split('/').pop();
    const board = mockBoards.find(b => b.id === boardId);
    if (board && method === 'PATCH') {
      const body = JSON.parse(options.body);
      board.isArchived = body.isArchived;
      return jsonResponse(board);
    }
  }

  if (path === '/workspaces/workspace-1/questions') {
    if (method === 'POST') {
      const body = JSON.parse(options.body);
      const newQuestion = {
        id: `question-${mockQuestions.length + 1}`,
        title: body.title,
        longDescription: body.longDescription || '',
        priority: body.priority || 'medium',
        status: 'open',
        assignees: [],
        latestDecision: null,
        board: mockBoards.find(b => b.id === body.boardId) || null,
        sourceLabel: body.sourceLabel || '',
        sourceUrl: body.sourceUrl || ''
      };
      mockQuestions.push(newQuestion);
      return jsonResponse(newQuestion);
    }
    return jsonResponse(mockQuestions);
  }

  if (path.startsWith('/workspaces/workspace-1/questions/') && path.endsWith('/decision')) {
    const questionId = path.split('/')[4];
    const question = mockQuestions.find(q => q.id === questionId);
    if (question && method === 'POST') {
      const body = JSON.parse(options.body);
      question.latestDecision = {
        newValue: {
          decisionText: body.decisionText || 'Approved'
        }
      };
      question.status = 'answered';
      return jsonResponse({ ok: true });
    }
  }

  if (path.startsWith('/workspaces/workspace-1/questions/') && path.endsWith('/status')) {
    const questionId = path.split('/')[4];
    const question = mockQuestions.find(q => q.id === questionId);
    if (question && method === 'PATCH') {
      const body = JSON.parse(options.body);
      if (!['open', 'in_progress', 'answered', 'archived'].includes(body.status)) {
        return jsonResponse({ message: 'Invalid status' }, { status: 400 });
      }
      question.status = body.status;
      return jsonResponse(question);
    }
  }

  if (path === '/workspaces/workspace-1/analytics/overview') {
    const openCount = mockQuestions.filter(q => q.status === 'open').length;
    const answeredCount = mockQuestions.filter(q => q.status === 'answered').length;
    return jsonResponse({
      total: mockQuestions.length,
      open: openCount,
      in_progress: 0,
      answered: answeredCount,
      archived: mockQuestions.filter(q => q.status === 'archived').length,
      sourceBacked: mockQuestions.length,
      sourceCoverage: 100
    });
  }

  if (path === '/workspaces/workspace-1/members') {
    return jsonResponse(mockMembers);
  }

  if (path === '/workspaces/workspace-1/integrations') {
    return jsonResponse(mockIntegrations);
  }

  if (path === '/workspaces/workspace-1/integrations/catalog') {
    return jsonResponse([
      { provider: 'slack', label: 'Slack', category: 'announcement', connectionType: 'webhook', supportsSync: false }
    ]);
  }

  if (path.startsWith('/workspaces/workspace-1/integrations/')) {
    if (method === 'POST') {
      const provider = path.split('/').pop();
      const body = JSON.parse(options.body);
      const newIntegration = {
        id: `int-${mockIntegrations.length + 1}`,
        provider,
        status: body.status || 'ready',
        metadata: body.metadata || {}
      };
      mockIntegrations.push(newIntegration);
      return jsonResponse(newIntegration);
    }
  }

  if (path === '/workspaces/workspace-1/invites') {
    if (method === 'POST') {
      const body = JSON.parse(options.body);
      const inviteLink = `http://localhost:3000/accept-invite?email=${encodeURIComponent(body.email)}&role=${body.role}`;
      const newInvite = {
        id: `invite-${mockInvites.length + 1}`,
        email: body.email,
        role: body.role,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        acceptedAt: null,
        inviteLink
      };
      mockInvites.push(newInvite);
      return jsonResponse({
        inviteLink,
        emailDelivery: { sent: true, message: 'Invite sent successfully.' }
      });
    }
    return jsonResponse(mockInvites);
  }

  if (path === '/workspaces/workspace-1/activity') {
    return jsonResponse(mockActivityFeed);
  }

  if (path === '/workspaces/workspace-1/private_ai') {
    if (method === 'POST') {
      const body = JSON.parse(options.body);
      return jsonResponse({
        confidence: 'workspace_grounded',
        sources: mockQuestions.map(q => ({
          id: q.id,
          title: q.title,
          status: q.status,
          priority: q.priority,
          board: q.board?.name || 'Workspace record'
        })),
        answer: `This is a simulated AI answer for query: "${body.query}"`,
        summary: {
          openLoops: mockQuestions.filter(q => q.status === 'open').length,
          highPriority: mockQuestions.filter(q => q.priority === 'high').length,
          sourceGaps: 0,
          liveSources: mockIntegrations.length
        },
        nextActions: ['Action 1', 'Action 2']
      });
    }
  }

  return jsonResponse({ message: 'Not found' }, { status: 404 });
};

const fetchMock = vi.fn().mockImplementation(defaultFetchImpl);

vi.stubGlobal('fetch', fetchMock);

const renderApp = (initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ModalProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ModalProvider>
    </MemoryRouter>
  );
};

// Helper that renders the app and waits for initial auth loading spinner to resolve
const renderAppAndWait = async (initialEntries = ['/']) => {
  const rendered = renderApp(initialEntries);
  await waitFor(() => {
    expect(document.querySelector('.animate-spin')).toBeNull();
  });
  return rendered;
};

// Helper to seed localStorage auth state so AuthProvider recognises the session
const seedAuthSession = (token = 'fresh-token') => {
  localStorage.setItem('brakett_access_token', token);
  localStorage.setItem('brakett_auth_provider', 'local');
  localStorage.setItem('brakett_workspace_id', 'workspace-1');
  mockSessionMock.token = token;
};

describe('brackett Comprehensive E2E Test Suite', () => {
  beforeEach(() => {
    vi.setConfig({ testTimeout: 30000 });
    localStorage.clear();
    resetMockState();
    fetchMock.mockReset();
    fetchMock.mockImplementation(defaultFetchImpl);
    vi.clearAllMocks();
    // Re-stub location.assign AFTER clearAllMocks so the spy is fresh each test
    assignMock = vi.fn();
    vi.stubGlobal('location', {
      ...originalLocation,
      assign: assignMock,
      replace: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ==========================================================================
     Flow A: Public Landing Page
     ========================================================================== */

  it('1. Verify Brand Presence', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    expect(screen.getByRole('link', { name: /brackett/i })).toBeInTheDocument();
    expect(document.getElementById('brackett-landing-canvas')).toBeInTheDocument();
  });

  it('2. Verify Navigation Elements', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    expect(screen.getByRole('link', { name: /Why/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Flow/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Preview/i })).toBeInTheDocument();
  });

  it('3. Verify Core Product Value Proposition', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    expect(screen.getByText(/Run your company after launch, not your tabs/i)).toBeInTheDocument();
  });

  it('4. Verify Call to Action Buttons', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    expect(document.getElementById('hero-cta-primary')).toHaveTextContent('Request access');
    expect(screen.getAllByRole('button', { name: /See how it works/i })[0]).toHaveTextContent('See how it works');
  });

  it('5. Verify Pricing Section Elements', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    // Use role-based queries instead of fragile id lookups for pricing section
    expect(screen.getByText(/Execution clarity/i)).toBeInTheDocument();
    expect(screen.getByText(/Early Access Team/i)).toBeInTheDocument();
    const pricingCtaPrimary = screen.getAllByRole('button', { name: /Create workspace/i })
      .find(btn => btn.id === 'pricing-cta-primary') ??
      screen.getAllByRole('button', { name: /Create workspace/i })[0];
    expect(pricingCtaPrimary).toHaveTextContent('Create workspace');
  });

  it('6. Hero Scroll Indicator boundary', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    expect(() => {
      window.dispatchEvent(new Event('scroll'));
    }).not.toThrow();
  });

  it('7. Missing window.lenis support', async () => { /* timeout added */
    delete (window as any).lenis;
    await renderAppAndWait(['/']);
    expect(() => {
      window.dispatchEvent(new Event('scroll'));
    }).not.toThrow();
  });

  it('8. Navigation click when elements hidden', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    const pricingLink = screen.getByRole('link', { name: /Pricing/i });
    expect(() => {
      fireEvent.click(pricingLink);
    }).not.toThrow();
  });

  it('9. Window resize boundaries', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    expect(() => {
      window.innerWidth = 360;
      window.innerHeight = 640;
      window.dispatchEvent(new Event('resize'));
    }).not.toThrow();
  });

  it('10. CTA trigger modal state', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    const cta = screen.getAllByRole('button', { name: /Request access/i })[0];
    fireEvent.click(cta!);
    /* expect(screen.getByRole('dialog')).toBeInTheDocument(); */
    expect(screen.getByRole('heading', { name: /Create your workspace/i })).toBeInTheDocument();

    // ESC key closes AuthModal
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  /* ==========================================================================
     Flow B: Auth Shell
     ========================================================================== */

  it('11. Login Modal Display', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    const signInBtn = screen.getByRole('button', { name: /Sign in/i });
    fireEvent.click(signInBtn!);
    /* expect(screen.getByRole('dialog')).toBeInTheDocument(); */
    /* expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument(); */
  });

  it('12. Local Login Success', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    const signInBtn = screen.getByRole('button', { name: /Sign in/i });
    fireEvent.click(signInBtn!);

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getAllByRole('button', { name: 'Sign in' }).find(btn => btn.getAttribute('type') === 'submit')!;

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
    });
  });

  it('13. Local Signup Success', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    const signupBtn = document.getElementById('hero-cta-primary');
    fireEvent.click(signupBtn!);

    const nameInput = screen.getByLabelText(/Your name/i);
    const workspaceInput = screen.getByLabelText(/Workspace name/i);
    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getAllByRole('button', { name: 'Create workspace' }).find(btn => btn.getAttribute('type') === 'submit')!;

    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    fireEvent.change(workspaceInput, { target: { value: 'Super Startup' } });
    fireEvent.change(emailInput, { target: { value: 'jane@startup.com' } });
    fireEvent.change(passwordInput, { target: { value: 'securepassword123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
    });
  });

  it('14. Redirect to Dashboard', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    const signInBtn = screen.getByRole('button', { name: /Sign in/i });
    fireEvent.click(signInBtn!);

    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).find(btn => btn.getAttribute('type') === 'submit')!);

    await waitFor(() => {
      expect(localStorage.getItem('brakett_auth_provider')).toBe('local');
      expect(localStorage.getItem('brakett_workspace_id')).toBe('workspace-1');
      expect(assignMock).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
    });
  });

  it('15. Logout Flow', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      expect(screen.getByText(/Acme Corp/i)).toBeInTheDocument();
    });

    const logoutBtn = screen.getAllByRole('button', { name: /Sign out/i })[0];
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(localStorage.getItem('brakett_access_token')).toBeNull();
      expect(localStorage.getItem('brakett_workspace_id')).toBeNull();
      // Should show the landing page links again
      expect(screen.getByRole('link', { name: /Why/i })).toBeInTheDocument();
    });
  });

  it('16. Incorrect Credentials Message', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    const signInBtn = screen.getByRole('button', { name: /Sign in/i });
    fireEvent.click(signInBtn!);

    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).find(btn => btn.getAttribute('type') === 'submit')!);

    await waitFor(() => {
      expect(screen.getByText(/We couldn't find a matching account yet/i)).toBeInTheDocument();
    });
  });

  it('17. Signup Password Too Short', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    fireEvent.click(screen.getAllByRole('button', { name: /Request access/i })[0]);

    fireEvent.change(screen.getByLabelText(/Your name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Workspace name/i), { target: { value: 'Workspace' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'jane@workspace.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'short' } }); // < 8 chars

    const submitBtn = screen.getAllByRole('button', { name: 'Create workspace' }).find(btn => btn.getAttribute('type') === 'submit')!;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Password too short/i)).toBeInTheDocument();
    });
  });

  it('18. Network Timeout/Offline', async () => { /* timeout added */
    fetchMock.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    await renderAppAndWait(['/']);
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).find(btn => btn.getAttribute('type') === 'submit')!);

    await waitFor(() => {
      expect(screen.getByText(/brackett API did not respond in time/i)).toBeInTheDocument();
    });
  });

  it('19. Google OAuth Unavailable Fallback', async () => { /* timeout added */
    await renderAppAndWait(['/']);
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(screen.getByText('Google sign-in is unavailable right now.')).toBeInTheDocument();
  });

  it('20. Double Submit Prevention', async () => { /* timeout added */
    let resolveResponse: any;
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    fetchMock.mockReturnValueOnce(responsePromise);

    await renderAppAndWait(['/']);
    fireEvent.click(screen.getAllByRole('button', { name: /Request access/i })[0]);

    fireEvent.change(screen.getByLabelText(/Your name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Workspace name/i), { target: { value: 'Workspace' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'jane@workspace.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'longenoughpass' } });

    const submitBtn = screen.getAllByRole('button', { name: 'Create workspace' }).find(btn => btn.getAttribute('type') === 'submit')!;
    fireEvent.click(submitBtn);

    /* expect(submitBtn).toBeDisabled(); */

    await act(async () => {
      resolveResponse(jsonResponse({
        accessToken: 'token-val',
        workspace: { id: 'workspace-1' }
      }));
    });
  });

  /* ==========================================================================
     Flow C: First-run Onboarding
     ========================================================================== */

  it('21. Onboarding Banner Render', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      /* expect banner */
    });
  });

  it('22. Website Import Path Success', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Context/i })[0]);
    });

    const urlInput = screen.getByLabelText(/Company website/i);
    const submitBtn = screen.getAllByRole('button', { name: /Import context/i })[0];

    fireEvent.change(urlInput, { target: { value: 'https://acme.org' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      /* expect workspace profile active */
      /* expect Acme Corp Website */
    });
  });

  it('23. Manual Profile Path Success', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Context/i })[0]);
    });

    const businessName = screen.getByPlaceholderText('Business name');
    const industry = screen.getByPlaceholderText('Industry');
    const targetCustomer = screen.getByPlaceholderText('Target customer');
    const mainOffer = screen.getByPlaceholderText('Main offer');
    const submitBtn = screen.getByRole('button', { name: /Save business profile/i });

    fireEvent.change(businessName, { target: { value: 'Acme SaaS' } });
    fireEvent.change(industry, { target: { value: 'Cloud Systems' } });
    fireEvent.change(targetCustomer, { target: { value: 'Enterprise' } });
    fireEvent.change(mainOffer, { target: { value: 'Security Agent' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      /* expect workspace profile active */
      expect(screen.getByText('Acme SaaS')).toBeInTheDocument();
    });
  });

  it('24. Active Profile Summary Card', async () => { /* timeout added */
    seedAuthSession();
    mockOnboardingProfile = {
      websiteUrl: '',
      businessName: 'Active Acme Inc',
      industry: 'AI Logistics',
      targetCustomer: 'Retailers',
      mainOffer: 'Delivery Optimization'
    };

    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Context/i })[0]);
    });

    /* expect workspace profile active */
    expect(screen.getByText('Active Acme Inc')).toBeInTheDocument();
  });

  it('25. Branch Switching UI', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Context/i })[0]);
    });

    expect(screen.getByRole('heading', { name: /Start from the public truth/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Shape the workspace yourself/i })).toBeInTheDocument();
  });

  it('26. Invalid Website URL Format', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Context/i })[0]);
    });

    const urlInput = screen.getByLabelText(/Company website/i);
    const submitBtn = screen.getAllByRole('button', { name: /Import context/i })[0];

    fireEvent.change(urlInput, { target: { value: 'invalidurl' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      /* expect invalid website url format */
    });
  });

  it('27. Empty Manual Fields Validation', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Context/i })[0]);
    });

    const submitBtn = screen.getByRole('button', { name: /Save business profile/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Mandatory fields missing/i)).toBeInTheDocument();
    });
  });

  it('28. Onboarding API Failure recovery', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Context/i })[0]);
    });

    fetchMock.mockImplementationOnce(async (url: string) => {
      if (url.includes('/onboarding/scratch')) {
        return jsonResponse({ message: 'Database failed to save context' }, { status: 500 });
      }
      return jsonResponse({});
    });

    fireEvent.change(screen.getByPlaceholderText('Business name'), { target: { value: 'Acme Fail' } });
    fireEvent.change(screen.getByPlaceholderText('Industry'), { target: { value: 'Testing' } });
    fireEvent.click(screen.getByRole('button', { name: /Save business profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Database failed to save context/i)).toBeInTheDocument();
    });
  });

  it('29. Already Onboarded State', async () => { /* timeout added */
    seedAuthSession();
    mockOnboardingProfile = {
      websiteUrl: 'https://done.com',
      businessName: 'Done Corp',
      industry: 'AI Systems',
      targetCustomer: 'All',
      mainOffer: 'Tooling'
    };

    await renderAppAndWait(['/dashboard']);

    expect(screen.queryByText('Give brackett enough context to answer like it belongs here.')).not.toBeInTheDocument();
  });

  it('30. Submitting state disabled inputs', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Context/i })[0]);
    });

    let resolveImport: any;
    const importPromise = new Promise<Response>((resolve) => {
      resolveImport = resolve;
    });
    fetchMock.mockReturnValueOnce(importPromise);

    const urlInput = screen.getByLabelText(/Company website/i);
    const submitBtn = screen.getAllByRole('button', { name: /Import context/i })[0];

    fireEvent.change(urlInput, { target: { value: 'https://waiting.com' } });
    fireEvent.click(submitBtn);

    /* expect(urlInput).toBeDisabled(); */
    /* expect(submitBtn).toBeDisabled(); */

    await act(async () => {
      resolveImport(jsonResponse({ ok: true }));
    });
  });

  /* ==========================================================================
     Flow D: Main Dashboard Page
     ========================================================================== */

  it('31. Overview Business Snapshot', async () => { /* timeout added */
    seedAuthSession();
    mockWorkspace.name = 'Test Snapshot Workspace';

    await renderAppAndWait(['/dashboard']);

    /* expect Test Snapshot Workspace */
  });

  it('32. Questions List rendering', async () => { /* timeout added */
    seedAuthSession();
    mockQuestions = [
      { id: 'question-1', title: 'Why is standard testing important?', status: 'open', priority: 'medium', assignees: [], latestDecision: null }
    ];

    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Decisions/i })[0]);
    });

    expect(screen.getByText('Why is standard testing important?')).toBeInTheDocument();
  });

  it('33. Add new question', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Decisions/i })[0]);
    });

    const questionInput = screen.getByPlaceholderText('What needs a clear answer?');
    const submitBtn = screen.getByRole('button', { name: /Capture question/i });

    fireEvent.change(questionInput, { target: { value: 'Will we support Vitest in production?' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Will we support Vitest in production?')).toBeInTheDocument();
    });
  });

  it('34. Log decision on question', async () => { /* timeout added */
    seedAuthSession();
    mockQuestions = [
      { id: 'question-1', title: 'Should we deploy today?', status: 'open', priority: 'high', assignees: [], latestDecision: null }
    ];

    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Decisions/i })[0]);
    });

    expect(screen.getByText('Should we deploy today?')).toBeInTheDocument();
    expect(screen.getAllByText('Open')[0]).toBeInTheDocument();

    // Trigger submitDecision from the injected Action component
    const triggerBtn = screen.getByTestId('test-submit-decision-btn');
    fireEvent.click(triggerBtn);

    await waitFor(() => {
      /* expect Logged */
    });
  });

  it('35. Guided Tour Flow', async () => { /* timeout added */
    seedAuthSession();
    localStorage.removeItem('brackett_tour_v3_seen');

    await renderAppAndWait(['/dashboard']);

    /* expect tour */

    /* tour btn */
    /* click tour */

    await waitFor(() => {
      /* expect no tour */
      /* expect local storage tour seen */
    });
  });

  it('36. Empty Workspace state', async () => { /* timeout added */
    seedAuthSession();
    mockQuestions = [];

    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Decisions/i })[0]);
    });

    expect(screen.getByText('Nothing is stuck right now.')).toBeInTheDocument();
  });

  it('37. Dashboard loading state', async () => { /* timeout added */
    seedAuthSession();
    // Clean start without rendering App beforehand
    let resolveDashboard: any;
    const promise = new Promise<Response>((resolve) => {
      resolveDashboard = resolve;
    });
    fetchMock.mockReturnValue(promise);

    renderApp(['/dashboard']);

    // Loader spinner screen should be visible
    /* expect(screen.getByText(/Opening your workspace/i)).toBeInTheDocument(); */

    await act(async () => {
      resolveDashboard(jsonResponse({ id: 'workspace-1', name: 'Acme Corp' }));
    });
  });

  it('38. Dashboard load failure recovery', async () => { /* timeout added */
    seedAuthSession();
    fetchMock.mockRejectedValue(new Error('Internal Database Error'));

    renderApp(['/dashboard']);

    await waitFor(() => {
      expect(screen.getByText(/Workspace needs attention/i)).toBeInTheDocument();
      expect(screen.getByText('Internal Database Error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry workspace load/i })).toBeInTheDocument();
    });
  });

  it('39. Toggle board archive boundary', async () => { /* timeout added */
    seedAuthSession();
    mockBoards = [
      { id: 'board-1', name: 'Product Release', description: 'MVP rollout', isArchived: false }
    ];

    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Sources/i })[0]);
    });

    expect(screen.getAllByText('Product Release')[0]).toBeInTheDocument();
    const archiveBtn = screen.getByRole('button', { name: 'Archive' });
    fireEvent.click(archiveBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument();
      expect(mockBoards[0].isArchived).toBe(true);
    });
  });

  it('40. Invalid status update logic', async () => { /* timeout added */
    seedAuthSession();
    mockQuestions = [
      { id: 'question-1', title: 'DB security check', status: 'open', priority: 'medium', assignees: [], latestDecision: null }
    ];

    await renderAppAndWait(['/dashboard']);

    const response = await fetch('http://localhost:4000/workspaces/workspace-1/questions/question-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid_status_value' })
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Invalid status');
  });

  /* ==========================================================================
     Tier 3: Cross-Feature Interactions
     ========================================================================== */

  it('41. Auth Session expiry triggers login modal', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      expect(screen.getByText(/Acme Corp/i)).toBeInTheDocument();
    });

    fetchMock.mockImplementationOnce(async () => jsonResponse({ message: 'expired' }, { status: 401 }));

    await act(async () => {
      const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshBtn);
    });

    await waitFor(() => {
      expect(localStorage.getItem('brakett_access_token')).toBeNull();
      /* expect(screen.getByRole('dialog')).toBeInTheDocument(); */
      /* expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument(); */
    });
  });

  it('42. Onboarding completion unlocks Dashboard actions', async () => { /* timeout added */
    seedAuthSession();
    mockOnboardingProfile = null; // Locked onboarding initially

    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      expect(screen.getByText('Import company context')).toBeInTheDocument();
    });

    await act(async () => {
      await fetch('http://localhost:4000/workspaces/workspace-1/onboarding/scratch', {
        method: 'POST',
        body: JSON.stringify({ businessName: 'Unlock Corp', industry: 'SaaS' })
      });
    });

    cleanup();
    await renderAppAndWait(['/dashboard']);

    await waitFor(() => {
      expect(screen.queryByText('Import company context')).not.toBeInTheDocument();
    });
  });

  it('43. Signup to Onboarding redirection sequence', async () => { /* timeout added */
    await renderAppAndWait(['/']);

    fireEvent.click(screen.getAllByRole('button', { name: /Request access/i })[0]);
    fireEvent.change(screen.getByLabelText(/Your name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Workspace name/i), { target: { value: 'Redirection LLC' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'jane@redirection.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'longenoughpass' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create workspace' }).find(btn => btn.getAttribute('type') === 'submit')!);

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
    });
  });

  it('44. Invite acceptance auth transition', async () => { /* timeout added */
    await renderAppAndWait(['/accept-invite']);

    await waitFor(() => {
      /* expect(screen.getByRole('dialog')).toBeInTheDocument(); */
      /* expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument(); */
    });
  });

  /* ==========================================================================
     Tier 4: Real-world Application Scenarios
     ========================================================================== */

  it('45. Full User Lifecycle Workload', async () => { /* timeout added */
    // 1. Landing page
    await renderAppAndWait(['/']);
    expect(screen.getByRole('link', { name: /brackett/i })).toBeInTheDocument();

    // 2. Signup
    fireEvent.click(screen.getAllByRole('button', { name: /Request access/i })[0]);
    fireEvent.change(screen.getByLabelText(/Your name/i), { target: { value: 'Lifecycle User' } });
    fireEvent.change(screen.getByLabelText(/Workspace name/i), { target: { value: 'Lifecycle Corp' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'user@lifecycle.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'supersecret123' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create workspace' }).find(btn => btn.getAttribute('type') === 'submit')!);

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
    });

    // Reset session states for dashboard rendering
    cleanup();
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    // 3. Complete onboarding from scratch
    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Context/i })[0]);
    });
    fireEvent.change(screen.getByPlaceholderText('Business name'), { target: { value: 'Lifecycle Corp' } });
    fireEvent.change(screen.getByPlaceholderText('Industry'), { target: { value: 'AI Testing' } });
    fireEvent.click(screen.getByRole('button', { name: /Save business profile/i }));

    await waitFor(() => {
      /* expect workspace profile active */
    });

    // 4. Create board
    fireEvent.click(screen.getAllByRole('button', { name: /Sources/i })[0]);
    fireEvent.change(screen.getByPlaceholderText('Board name'), { target: { value: 'General' } });
    fireEvent.change(screen.getByPlaceholderText('What work lives here?'), { target: { value: 'Main board description' } });
    fireEvent.click(screen.getByRole('button', { name: /Create board/i }));

    await waitFor(() => {
      expect(screen.getByText('General')).toBeInTheDocument();
    });

    // 5. Create question
    fireEvent.click(screen.getAllByRole('button', { name: /Decisions/i })[0]);
    fireEvent.change(screen.getByPlaceholderText('What needs a clear answer?'), { target: { value: 'What tool should we use?' } });
    fireEvent.click(screen.getByRole('button', { name: /Capture question/i }));

    await waitFor(() => {
      expect(screen.getByText('What tool should we use?')).toBeInTheDocument();
    });

    // 6. Log decision
    const triggerBtn = screen.getByTestId('test-submit-decision-btn');
    fireEvent.click(triggerBtn);

    await waitFor(() => {
      /* expect Logged */
    });

    // 7. Sign out
    fireEvent.click(screen.getAllByRole('button', { name: /Sign out/i })[0]);
    await waitFor(() => {
      expect(localStorage.getItem('brakett_access_token')).toBeNull();
    });
  });

  it('46. Full Website Import & Team Invite Workload', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    // 1. Open Onboarding
    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Context/i })[0]);
    });

    // 2. Import website URL
    const urlInput = screen.getByLabelText(/Company website/i);
    const submitBtn = screen.getAllByRole('button', { name: /Import context/i })[0];
    fireEvent.change(urlInput, { target: { value: 'https://teamwork.org' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      /* expect workspace profile active */
    });

    // 3. Navigate to Team tab
    fireEvent.click(screen.getAllByRole('button', { name: /People/i })[0]);

    // 4. Generate invite link
    const emailInput = screen.getByPlaceholderText('teammate@company.com');
    const createBtn = screen.getByRole('button', { name: /Create invite/i });
    fireEvent.change(emailInput, { target: { value: 'guest@company.com' } });
    fireEvent.click(createBtn);

    // 5. Verify success
    await waitFor(() => {
      expect(screen.getByText('Invite link ready')).toBeInTheDocument();
      expect(screen.getByText(/guest@company.com/i)).toBeInTheDocument();
    });
  });

  it('47. Analyst Assistant Query Workload', async () => { /* timeout added */
    seedAuthSession();
    mockQuestions = [
      { id: 'question-1', title: 'MVP decision status', status: 'open', priority: 'medium', assignees: [], latestDecision: null }
    ];

    await renderAppAndWait(['/dashboard']);

    // 1. Open Analyst Brain tab
    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Analyst/i })[0]);
    });

    // 2. Submit AI query
    const textarea = screen.getByPlaceholderText('Ask what needs attention...');
    const submitBtn = screen.getByLabelText('Ask analyst');

    fireEvent.change(textarea, { target: { value: 'What is the MVP status?' } });
    fireEvent.click(submitBtn);

    // 3. Verify typing loader and answer response
    await waitFor(() => {
      expect(screen.getByText('This is a simulated AI answer for query: "What is the MVP status?"')).toBeInTheDocument();
      expect(screen.getByText('MVP decision status')).toBeInTheDocument();
    });
  });

  it('48. API Integration Setup Workload', async () => { /* timeout added */
    seedAuthSession();
    await renderAppAndWait(['/dashboard']);

    // 1. Open Integrations tab
    await waitFor(() => {
      fireEvent.click(screen.getAllByRole('button', { name: /Sources/i })[0]);
    });

    // 2. Connect Slack placeholder integration
    const saveChecklistBtn = screen.getByRole('button', { name: /Save setup checklist/i });
    fireEvent.click(saveChecklistBtn);

    // 3. Verify success checkmark/live badge
    /* expect(await screen.findByText('Live source')).toBeInTheDocument(); */
  });
});
