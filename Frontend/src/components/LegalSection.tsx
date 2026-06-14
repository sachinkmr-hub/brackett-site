import React from 'react';
import { motion } from 'motion/react';

const legalCards = [
  {
    id: 'privacy',
    eyebrow: 'Privacy',
    title: 'Workspace data stays private',
    bullets: [
      'We do not sell your data or workspace content to anyone.',
      'Your workspace records and decisions are strictly scoped to your team.',
      'We only collect the data necessary to run the product securely.',
      'You can request data export or deletion at any time.',
    ],
  },
  {
    id: 'terms',
    eyebrow: 'Usage',
    title: 'Clear boundaries',
    bullets: [
      'You retain full ownership of the context you bring into brackett.',
      'Do not use the service to violate laws or abuse third-party integrations.',
      'We may suspend access if an account creates risk for the platform.',
    ],
  },
  {
    id: 'cookie-pref',
    eyebrow: 'Storage',
    title: 'Essential tracking only',
    bullets: [
      'We only use essential storage required for sign-in and session continuity.',
      'No invasive tracking cookies or hidden third-party advertising pixels.',
      'Any future analytics tooling will be strictly separated and disclosed.',
    ],
  },
];

export const LegalSection: React.FC = () => {
  return (
    <section className="border-t border-[rgba(0,0,0,0.05)] bg-[#F8F7F4]" aria-label="Policies">
      <div className="mx-auto max-w-[1100px] px-6 py-24 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Trust Center
          </p>
          <h2 className="mt-4 font-syne text-[32px] font-semibold tracking-tight text-zinc-950">
            Clear rules for team context.
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-zinc-600">
            brackett is designed around private workspaces, explicit access, and source-backed decisions.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {legalCards.map((card, index) => (
            <motion.section
              key={card.id}
              id={card.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-[#FFFFFF] p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)]"
            >
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-500">
                {card.eyebrow}
              </p>
              <h3 className="mt-4 font-syne text-xl font-semibold text-zinc-950">
                {card.title}
              </h3>
              <ul className="mt-5 space-y-3 text-[14px] leading-relaxed text-zinc-600 list-disc pl-5">
                {card.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </motion.section>
          ))}
        </div>
      </div>
    </section>
  );
};
