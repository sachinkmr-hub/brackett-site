import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardLayout } from './DashboardLayout';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  AreaChart: ({ children }: any) => children,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

vi.mock('./tabs/OverviewTab', async () => {
  const React = await import('react');
  return {
    OverviewTab: () => React.createElement(
      'section',
      null,
      React.createElement('h2', null, 'Welcome back, New Workspace'),
      React.createElement('p', null, 'Suggested first action'),
      React.createElement('button', { type: 'button' }, 'Import site')
    ),
  };
});

const dashboardMocks = vi.hoisted(() => ({
  loadDashboard: vi.fn(),
  logout: vi.fn(),
  submitWebsiteOnboarding: vi.fn(),
  submitScratchOnboarding: vi.fn(),
}));

vi.mock('./DashboardContext', () => ({
  useDashboard: () => ({
    isLoading: false,
    error: null,
    workspace: {
      id: 'workspace-1',
      name: 'New Workspace',
      slug: 'new-workspace',
    },
    onboardingProfile: null,
    boards: [],
    questions: [],
    members: [{
      userId: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'owner',
      joinedAt: new Date().toISOString(),
    }],
    invites: [],
    integrations: [],
    integrationCatalog: [],
    analytics: {
      total: 0,
      open: 0,
      in_progress: 0,
      answered: 0,
      archived: 0,
    },
    activityFeed: [],
    loadDashboard: dashboardMocks.loadDashboard,
    submitWebsiteOnboarding: dashboardMocks.submitWebsiteOnboarding,
    submitScratchOnboarding: dashboardMocks.submitScratchOnboarding,
  }),
}));

vi.mock('./GuidedTour', () => ({
  GuidedTour: () => null,
}));

vi.mock('../../providers/AuthProvider', () => ({
  useAuth: () => ({
    logout: dashboardMocks.logout,
  }),
}));

describe('DashboardLayout', () => {
  it('lands new workspaces in the dashboard with setup as the first action', () => {
    render(<DashboardLayout />);

    expect(screen.getByRole('heading', { name: /Welcome back, New Workspace/i })).toBeInTheDocument();
    expect(screen.getByText('Suggested first action')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import site/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Set up your workspace' })).not.toBeInTheDocument();
  }, 10000);
});
