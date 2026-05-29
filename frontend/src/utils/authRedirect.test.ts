import { describe, expect, it } from 'vitest';

import { getSafeRedirectPath } from './authRedirect';

describe('getSafeRedirectPath', () => {
  it('returns /dashboard when state is null', () => {
    expect(getSafeRedirectPath(null)).toBe('/dashboard');
  });

  it('returns /dashboard when state is undefined', () => {
    expect(getSafeRedirectPath(undefined)).toBe('/dashboard');
  });

  it('returns /dashboard when from.pathname is missing', () => {
    expect(getSafeRedirectPath({ from: {} })).toBe('/dashboard');
  });

  it('returns /dashboard for excluded prefix /login', () => {
    expect(getSafeRedirectPath({ from: { pathname: '/login' } })).toBe('/dashboard');
  });

  it('returns /dashboard for excluded prefix /change-password', () => {
    expect(getSafeRedirectPath({ from: { pathname: '/change-password' } })).toBe('/dashboard');
  });

  it('returns /dashboard for excluded prefix /forgot-password', () => {
    expect(getSafeRedirectPath({ from: { pathname: '/forgot-password' } })).toBe('/dashboard');
  });

  it('returns /dashboard for relative path without leading slash', () => {
    expect(getSafeRedirectPath({ from: { pathname: 'brigades' } })).toBe('/dashboard');
  });

  it('returns /dashboard for protocol-relative URL //evil.com', () => {
    expect(getSafeRedirectPath({ from: { pathname: '//evil.com' } })).toBe('/dashboard');
  });

  it('returns /dashboard for absolute URL https://evil.com', () => {
    expect(getSafeRedirectPath({ from: { pathname: 'https://evil.com' } })).toBe('/dashboard');
  });

  it('returns /dashboard for absolute URL http://evil.com', () => {
    expect(getSafeRedirectPath({ from: { pathname: 'http://evil.com' } })).toBe('/dashboard');
  });

  it('returns pathname for a safe in-app path', () => {
    expect(getSafeRedirectPath({ from: { pathname: '/brigades' } })).toBe('/brigades');
  });

  it('appends search and hash that already have leading ? and #', () => {
    expect(
      getSafeRedirectPath({ from: { pathname: '/brigades', search: '?tab=active', hash: '#crew' } })
    ).toBe('/brigades?tab=active#crew');
  });

  it('normalizes search without leading ? to include it', () => {
    expect(
      getSafeRedirectPath({ from: { pathname: '/brigades', search: 'tab=active' } })
    ).toBe('/brigades?tab=active');
  });

  it('normalizes hash without leading # to include it', () => {
    expect(
      getSafeRedirectPath({ from: { pathname: '/brigades', hash: 'crew' } })
    ).toBe('/brigades#crew');
  });

  it('normalizes both search and hash without their leading characters', () => {
    expect(
      getSafeRedirectPath({ from: { pathname: '/brigades', search: 'tab=active', hash: 'crew' } })
    ).toBe('/brigades?tab=active#crew');
  });
});
