import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AuthModal } from '../components/AuthModal';

interface ModalContextType {
  showAuthModal: (mode?: 'login' | 'signup') => void;
  hideAuthModal: () => void;
  showAlert: (title: string, message: string) => void;
  hideAlert: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [alertContent, setAlertContent] = useState<{ title: string; message: string } | null>(null);

  const showAuthModal = useCallback((mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const hideAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const showAlert = useCallback((title: string, message: string) => setAlertContent({ title, message }), []);
  const hideAlert = useCallback(() => setAlertContent(null), []);

  useEffect(() => {
    const handleShowAuthModal = (event: Event) => {
      const mode = (event as CustomEvent<{ mode?: 'login' | 'signup' }>).detail?.mode;
      showAuthModal(mode === 'signup' ? 'signup' : 'login');
    };

    const handleShowAlert = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; message?: string }>).detail;
      showAlert(detail?.title || 'Heads up', detail?.message || 'Something needs your attention.');
    };

    window.addEventListener('show-auth-modal', handleShowAuthModal);
    window.addEventListener('show-brackett-alert', handleShowAlert);

    return () => {
      window.removeEventListener('show-auth-modal', handleShowAuthModal);
      window.removeEventListener('show-brackett-alert', handleShowAlert);
    };
  }, [showAlert, showAuthModal]);

  return (
    <ModalContext.Provider value={{ showAuthModal, hideAuthModal, showAlert, hideAlert }}>
      {children}
      
      {/* Global Alert Modal */}
      <AnimatePresence>
        {alertContent && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={hideAlert}
              className="absolute inset-0 bg-zinc-950/30 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0.12 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="brackett-alert-title"
              className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-2xl"
            >
              <h3 id="brackett-alert-title" className="mb-2 font-sans text-lg font-semibold text-zinc-950">
                {alertContent.title}
              </h3>
              <p className="mb-6 font-sans text-sm leading-relaxed text-zinc-600">
                {alertContent.message}
              </p>
              <button
                onClick={hideAlert}
                className="cursor-pointer rounded-lg bg-zinc-950 px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-black"
              >
                Continue exploring
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={hideAuthModal}
        initialMode={authModalMode}
      />
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
