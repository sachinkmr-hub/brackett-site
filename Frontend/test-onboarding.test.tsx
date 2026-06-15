import { ModalProvider } from './src/providers/ModalProvider';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { OnboardingTab } from './src/components/dashboard/tabs/OnboardingTab';
import { expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('./src/components/dashboard/DashboardContext', () => ({
  useDashboard: () => ({
    onboardingProfile: null,
    submitWebsiteOnboarding: vi.fn(),
    submitScratchOnboarding: vi.fn(),
  })
}));

it('renders OnboardingTab', () => {
  render(<MemoryRouter><ModalProvider><OnboardingTab /></ModalProvider></MemoryRouter>);
  screen.debug();
  expect(screen.getByText(/Give brackett enough context/i)).toBeInTheDocument();
});
