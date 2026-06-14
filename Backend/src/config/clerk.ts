export const CLERK_SECRET_PLACEHOLDER = 'sk_test_replace_me';
export const CLERK_PUBLISHABLE_PLACEHOLDER = 'pk_test_replace_me';

export const isClerkConfigured = () => {
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  const publishable = process.env.CLERK_PUBLISHABLE_KEY?.trim();

  return Boolean(
    secret &&
    secret !== CLERK_SECRET_PLACEHOLDER &&
    publishable &&
    publishable !== CLERK_PUBLISHABLE_PLACEHOLDER
  );
};
