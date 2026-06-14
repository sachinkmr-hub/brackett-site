/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, useScroll } from 'motion/react';
import { BrackettWordmark } from './BrackettLogo';
import { NavItem } from '../types';
import { useModal } from '../providers/ModalProvider';

const NAV_ITEMS: NavItem[] = [
  { id: 'purpose', label: 'Why', targetId: 'purpose-section' },
  { id: 'how-it-works', label: 'Flow', targetId: 'how-it-works-section' },
  { id: 'product', label: 'Preview', targetId: 'product-section' },
  { id: 'pricing', label: 'Pricing', targetId: 'pricing-section' }
];

export const Navigation: React.FC = () => {
  const [activeItem, setActiveItem] = useState<string>('purpose');
  const { showAuthModal } = useModal();
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const handleScroll = () => {
      // Find which section is currently in view
      const scrollPosition = window.scrollY + 120; // offset for sticky navbar height

      for (const item of NAV_ITEMS) {
        const el = document.getElementById(item.targetId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveItem(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger on mount
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      const lenis = (window as any).lenis;
      if (lenis) {
        lenis.scrollTo(el, { offset: -72 });
      } else {
        const offset = 72; // fixed navbar offset
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = el.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <>
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-indigo-500 origin-left z-[1000]"
      style={{ scaleX: scrollYProgress }}
    />
    <header className="fixed left-0 right-0 top-0 z-[999] flex h-[72px] w-full items-center justify-between border-b border-[rgba(99,102,241,0.2)] bg-[rgba(10,14,26,0.8)] px-4 backdrop-blur-[12px] transition-colors duration-300 md:px-6">
      <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between">
        
        {/* Left Side: Logo & Text */}
        <a 
          href="#top" 
          onClick={(e) => {
            e.preventDefault();
            const lenis = (window as any).lenis;
            if (lenis) {
              lenis.scrollTo(0, { duration: 1.2 });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="group flex items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
          id="nav-logo-link"
          aria-label="brackett Home"
        >
          <BrackettWordmark markSize={24} markClassName="animate-logo-pulse transition-transform duration-300 group-hover:scale-105" />
        </a>

        {/* Center: Pill-shaped nav segment (3-4 items) */}
        <nav className="hidden items-center rounded-xl border border-slate-200/80 bg-white/74 px-1 py-1 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl md:flex">
          <ul className="flex items-center m-0 p-0 list-none">
            {NAV_ITEMS.map((item) => {
              const isActive = activeItem === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.targetId}`}
                    onClick={(e) => handleNavClick(e, item.targetId)}
                    className={`block select-none rounded-lg px-4 py-2 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      isActive
                        ? 'bg-[#1A1A2E] text-white shadow-[0_8px_24px_rgba(15,23,42,0.14)]'
                        : 'text-slate-400 hover:bg-[#1A1A2E]/50 hover:text-white'
                    }`}
                    id={`nav-item-${item.id}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right: Sign in & Get Started button */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => showAuthModal('login')}
            className="hidden cursor-pointer rounded-lg text-sm font-medium text-slate-300 outline-none transition-colors duration-200 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:block"
            id="nav-signin-btn"
          >
            Sign in
          </button>
          
          <button
            onClick={() => showAuthModal('signup')}
            className="premium-button cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold text-white outline-none transition hover:animate-amber-shimmer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            id="nav-getstarted-btn"
          >
            Create workspace
          </button>
        </div>

      </div>
    </header>
    </>
  );
};
