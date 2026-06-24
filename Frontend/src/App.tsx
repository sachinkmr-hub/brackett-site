import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ClerkSessionBridge } from './components/ClerkSessionBridge';
import { InviteAcceptPage } from './components/InviteAcceptPage';
import { LandingPage } from './pages/LandingPage';
import { useAuth } from './providers/AuthProvider';
import { useModal } from './providers/ModalProvider';
import { isClerkBridgeRequest, isClerkCallbackRequest, isClerkFrontendConfigured } from './lib/clerk';
import { buildAppUrl } from './lib/routing';

import { OnboardingFlow } from './pages/OnboardingFlow';

// Lazy load the massive Dashboard component
const DashboardApp = React.lazy(() => import('./components/DashboardApp'));

export default function App() {
  const { isAuthenticated, isLoadingSession } = useAuth();
  console.log(`RENDER App: isAuthenticated=${isAuthenticated}, isLoadingSession=${isLoadingSession}`);
  const { showAuthModal } = useModal();
  const isClerkEnabled = isClerkFrontendConfigured();
  const clerkBridge = isClerkEnabled ? <ClerkSessionBridge /> : null;
  const isClerkCallback = isClerkCallbackRequest();
  const isClerkBridge = isClerkBridgeRequest();

  if (isClerkEnabled && (isClerkCallback || isClerkBridge) && !isAuthenticated) {
    return (
      <>
        {clerkBridge}
        <div className="flex min-h-screen items-center justify-center bg-white px-6">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-950" />
            <h1 className="text-xl font-semibold text-zinc-950">Finishing Google sign-in</h1>
            <p className="mt-2 text-sm text-zinc-500">
              We're connecting your Google session to your brackett workspace.
            </p>
          </div>
          {isClerkCallback && <AuthenticateWithRedirectCallback />}
        </div>
      </>
    );
  }

  if (isLoadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-950" />
      </div>
    );
  }

  return (
    <>
      {clerkBridge}
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-950" />
        </div>
      }>
        <ErrorBoundary fallback={
          <div className="flex min-h-screen items-center justify-center bg-white p-4">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-xl">
              <h1 className="mb-4 text-2xl font-semibold text-zinc-950">Something went wrong</h1>
              <p className="mb-6 text-sm text-zinc-500">We've encountered an unexpected error. Our team has been notified.</p>
              <button onClick={() => window.location.assign(buildAppUrl('/'))} className="rounded-lg bg-zinc-950 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black">Return Home</button>
            </div>
          </div>
        }>
          <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          
          <Route path="/accept-invite" element={
            <InviteAcceptPage
              isAuthenticated={isAuthenticated}
              onShowAuth={(mode) => showAuthModal(mode)}
            />
          } />
          
          <Route path="/onboarding" element={
            isAuthenticated ? <OnboardingFlow /> : <Navigate to="/" replace />
          } />
          
          <Route path="/dashboard/*" element={
            isAuthenticated ? <DashboardApp /> : <Navigate to="/" replace />
          } />
          
          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </Suspense>
      <SpeedInsights />
    </>
  );
}
