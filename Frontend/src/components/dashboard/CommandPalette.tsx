import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutGrid, Globe, Users, Link2, MessageSquare, BrainCircuit, Sparkles, UserPlus } from 'lucide-react';
import { TabKey } from './types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabKey) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelectTab }) => {
  const [search, setSearch] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const tabs: Array<{ id: TabKey; label: string; icon: React.ReactNode; desc: string; group: 'Jump to' | 'Actions' }> = [
    { id: 'overview', label: 'Open command center', icon: <LayoutGrid size={16} />, desc: 'Needs attention, changes, readiness', group: 'Jump to' },
    { id: 'discussions', label: 'Review open decisions', icon: <MessageSquare size={16} />, desc: 'Threads, owners, source trails', group: 'Jump to' },
    { id: 'analyst', label: 'Ask analyst', icon: <BrainCircuit size={16} />, desc: 'Query workspace context', group: 'Actions' },
    { id: 'onboarding', label: 'Import website context', icon: <Globe size={16} />, desc: 'Build the company profile from a URL', group: 'Actions' },
    { id: 'team', label: 'Invite teammate', icon: <UserPlus size={16} />, desc: 'Share a workspace invite link', group: 'Actions' },
    { id: 'integrations', label: 'Connect source', icon: <Link2 size={16} />, desc: 'Slack, docs, CRM, product tools', group: 'Actions' },
    { id: 'team', label: 'Open workspace settings', icon: <Users size={16} />, desc: 'Members, roles, pending invites', group: 'Jump to' },
  ];

  const filtered = tabs.filter(t => t.label.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase()));
  const grouped = ['Actions', 'Jump to'].map((group) => ({
    group,
    items: filtered.filter((item) => item.group === group),
  })).filter((section) => section.items.length);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[16vh]">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/24 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.96, y: -12, filter: 'blur(6px)' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="premium-panel relative w-full max-w-2xl overflow-hidden rounded-[24px] shadow-[0_34px_120px_rgba(15,23,42,0.20),0_20px_80px_rgba(37,99,235,0.10)]"
          >
            <div className="trace-line flex items-center border-b border-slate-200/80 bg-white/58 px-4 py-3 backdrop-blur-xl">
              <Search size={18} className="text-blue-600" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-transparent px-3 py-2 text-base font-medium text-slate-950 placeholder:text-slate-400 focus:outline-none"
                placeholder="Search or run an action..."
              />
              <div className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-500 shadow-sm">ESC</div>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {grouped.map((section) => (
                <div key={section.group} className="pb-2">
                  <p className="premium-label px-3 py-2 text-[10px] font-semibold text-slate-500">{section.group}</p>
                  {section.items.map(tab => (
                    <button
                      key={`${tab.group}-${tab.label}`}
                      onClick={() => {
                        onSelectTab(tab.id);
                        onClose();
                      }}
                      className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/70 hover:shadow-[0_14px_38px_rgba(37,99,235,0.09)] focus:bg-white focus:outline-none"
                    >
                      <div className="rounded-xl border border-slate-200/80 bg-white p-2 text-blue-600 shadow-sm group-hover:border-blue-200">
                        {tab.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-[650] text-slate-950">{tab.label}</p>
                        <p className="truncate text-xs text-slate-500">{tab.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-500">
                  <Sparkles size={18} className="mx-auto mb-2 text-blue-400" />
                  No commands found.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
