/** Deterministic triage baseline. Evidence metadata is not independent verification. */
export type AnalystRecord = {
  id: string; title: string; status: string; priority?: string | null;
  description?: string | null; sourceUrl?: string | null;
  sourceLabel?: string | null; sourceExcerpt?: string | null;
  category?: string | null; board?: string | null;
};
const openStatuses = new Set(['open', 'active', 'in_progress']);
const stopWords = new Set('what which should we the a an is are to for before next decision meeting summarize highest priority unresolved questions team this week decisions them likely most first how can our do does tell me of and with about'.split(' '));
export const hasSourceEvidence = (record: Pick<AnalystRecord, 'sourceUrl' | 'sourceExcerpt'>) =>
  Boolean(record.sourceUrl?.trim() || record.sourceExcerpt?.trim());

export function buildAnalystBrief(query: string, records: AnalystRecord[], liveSources = 0) {
  const started = performance.now();
  const terms = [...new Set(query.toLowerCase().split(/[^a-z0-9]+/)
    .filter(term => term.length > 2 && !stopWords.has(term)))];
  const intent = /source|evidence|trust/.test(query.toLowerCase()) ? 'source_gaps'
    : /priorit|block|review|unresolved/.test(query.toLowerCase()) ? 'priority' : 'search';
  const intentTerms = new Set('source sources evidence trust open need needs missing gap gaps trail trails review block blockers unresolved'.split(' '));
  const searchTerms = intent === 'search' ? terms : terms.filter(term => !intentTerms.has(term));
  const open = records.filter(record => openStatuses.has(record.status));
  const gaps = open.filter(record => !hasSourceEvidence(record));
  const high = open.filter(record => ['high', 'critical'].includes(record.priority || ''));
  const candidates = intent === 'source_gaps' ? gaps : intent === 'priority' ? open : records;
  const priority = (record: AnalystRecord) => ({ critical: 4, high: 3, medium: 2, low: 1 }[record.priority || 'medium'] || 0);
  const matches = candidates.map(record => {
    const words = new Set([record.title, record.description, record.category, record.sourceExcerpt, record.board]
      .filter(Boolean).join(' ').toLowerCase().split(/[^a-z0-9]+/));
    return { record, score: searchTerms.filter(term => words.has(term)).length };
  }).filter(({ score }) => !searchTerms.length || score > 0)
    .sort((a, b) => b.score - a.score || priority(b.record) - priority(a.record) || a.record.id.localeCompare(b.record.id))
    .slice(0, 5).map(({ record }) => record);
  const evidenceCount = matches.filter(hasSourceEvidence).length;
  const confidence = !matches.length ? 'no_matching_records'
    : evidenceCount === matches.length ? 'workspace_grounded' : 'insufficient_evidence';
  return {
    query, confidence,
    answer: matches.length
      ? `Found ${matches.length} matching workspace record(s). ${evidenceCount} include a source URL or excerpt; these are user-supplied evidence, not independently verified facts. ${intent === 'source_gaps' ? 'Review the missing evidence before deciding.' : 'Review the listed records before making a decision.'}`
      : 'No matching workspace records. I cannot answer this question from the available evidence. Capture relevant evidence or refine the question.',
    summary: { openLoops: open.length, highPriority: high.length, sourceGaps: gaps.length, liveSources, boards: 0 },
    sources: matches.map(record => ({ ...record, evidenceStatus: hasSourceEvidence(record) ? 'attached' : 'missing' })),
    nextActions: [
      ...(!matches.length ? ['Capture a relevant question with a source URL or excerpt.'] : []),
      ...(gaps.length ? ['Attach evidence to open records with missing source material.'] : []),
      ...(high.length ? ['Review high-priority open decisions with the responsible team member.'] : []),
      'A person must review evidence and log the final decision.',
    ],
    execution: {
      method: 'deterministic-triage-v1', intent, modelCalls: 0, inputTokens: 0, outputTokens: 0,
      modelCostUsd: 0, latencyMs: Math.round((performance.now() - started) * 100) / 100,
      limitations: ['Lexical retrieval; no semantic search.', 'Connected integrations do not establish answer correctness.', 'Source attachments are not independently verified.'],
    },
  };
}
