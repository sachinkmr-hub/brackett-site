import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { ModalProvider } from './providers/ModalProvider';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import { getClerkPublishableKey, isClerkFrontendConfigured } from './lib/clerk.ts';
import { applySpaPathRedirect, getAppBasePath } from './lib/routing.ts';
import { COLORS } from './theme/tokens';
import './index.css';

const clerkPublishableKey = getClerkPublishableKey();
applySpaPathRedirect();

const routerBasename = getAppBasePath();
const appNode = (
  <BrowserRouter basename={routerBasename === '/' ? undefined : routerBasename}>
    <ModalProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ModalProvider>
  </BrowserRouter>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isClerkFrontendConfigured() && clerkPublishableKey ? (
      <ClerkProvider 
        publishableKey={clerkPublishableKey}
        appearance={{
          layout: {
            logoImageUrl: '/favicon.svg', // Assuming we'll have an SVG favicon or Clerk will fallback gracefully
            socialButtonsVariant: 'iconButton'
          },
          variables: {
            colorPrimary: COLORS.brand.blue,
            colorText: COLORS.ui.textMain,
            colorBackground: COLORS.ui.tileLight,
            fontFamily: 'Inter, sans-serif'
          }
        }}
      >
        {appNode}
        <Analytics />
      </ClerkProvider>
    ) : (
      <>
        {appNode}
        <Analytics />
      </>
    )}
  </StrictMode>,
);
