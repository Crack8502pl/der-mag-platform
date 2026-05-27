const EXCLUDED_REDIRECT_PREFIXES = ['/login', '/change-password', '/forgot-password'];

export const getSafeRedirectPath = (locationState: unknown): string => {
  const from = (locationState as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
  const pathname = from?.pathname;

  if (!pathname || EXCLUDED_REDIRECT_PREFIXES.some(path => pathname.startsWith(path))) {
    return '/dashboard';
  }

  return `${pathname}${from?.search ?? ''}${from?.hash ?? ''}`;
};
