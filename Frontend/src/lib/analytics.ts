// The Pendo snippet in index.html installs a stub that queues calls until the
// real agent downloads. The agent is frequently blocked (ad blockers, strict
// privacy modes, offline dev), and some methods are missing from the stub, so
// every call has to be optional. Analytics must never be able to break auth.
type PendoAgent = Record<string, ((...args: unknown[]) => void) | undefined>;

const getPendoAgent = (): PendoAgent | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return (window as unknown as { pendo?: PendoAgent }).pendo || null;
};

export const trackWithPendo = (method: string, ...args: unknown[]) => {
  try {
    const agent = getPendoAgent();
    agent?.[method]?.(...args);
  } catch (error) {
    console.warn(`Pendo "${method}" failed; continuing without analytics.`, error);
  }
};
