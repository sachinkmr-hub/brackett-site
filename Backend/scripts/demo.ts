import { buildAnalystBrief, type AnalystRecord } from '../src/modules/private_ai/analyst.js';
// Synthetic data for a repeatable interview demonstration. No real customer claims.
const records: AnalystRecord[] = [
  { id: 'pricing', title: 'Pricing experiment', status: 'open', priority: 'high', sourceExcerpt: 'Synthetic interview: two teams requested annual billing.' },
  { id: 'checkout', title: 'Checkout failures', status: 'in_progress', priority: 'critical', sourceLabel: 'Engineering board' },
  { id: 'onboarding', title: 'Onboarding copy', status: 'answered', priority: 'medium', sourceExcerpt: 'Synthetic usability observation.' },
];
for (const query of ['Review open questions', 'Which decisions need a source?', 'pricing', 'headcount']) {
  console.log(JSON.stringify(buildAnalystBrief(query, records, 1), null, 2));
}
