const EXCLUDED_REDIRECT_PREFIXES = ['/login', '/change-password', '/forgot-password'];

const isSafeInAppPath = (pathname: string): boolean =>
  pathname.startsWith('/') && !pathname.startsWith('//') && !pathname.includes('://');

export const getSafeRedirectPath = (locationState: unknown): string => {
  const from = (locationState as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
  const pathname = from?.pathname;

  if (!pathname || !isSafeInAppPath(pathname) || EXCLUDED_REDIRECT_PREFIXES.some(path => pathname.startsWith(path))) {
    return '/dashboard';
  }

  const rawSearch = from?.search ?? '';
  const rawHash = from?.hash ?? '';
  const search = rawSearch && !rawSearch.startsWith('?') ? `?${rawSearch}` : rawSearch;
  const hash = rawHash && !rawHash.startsWith('#') ? `#${rawHash}` : rawHash;

  return `${pathname}${search}${hash}`;
};
