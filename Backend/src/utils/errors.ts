export const getErrorMessage = (
  error: unknown,
  fallback = 'An unexpected error occurred'
) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
};

export const errorMessageIncludes = (error: unknown, search: string) =>
  getErrorMessage(error).includes(search);

export const errorMessageEquals = (error: unknown, expected: string) =>
  getErrorMessage(error) === expected;
