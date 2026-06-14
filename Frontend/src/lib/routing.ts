const SPA_PATH_PARAM = 'spa_path';
const ROOT_ROUTE_SEGMENTS = new Set(['accept-invite', 'dashboard', 'onboarding']);

const normalizeBasePath = (value?: string | null) => {
  if (!value || value === './' || value === '.') {
    return '/';
  }

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '');
  return withoutTrailingSlash || '/';
};

const inferBasePathFromLocation = () => {
  const segments = window.location.pathname.split('/').filter(Boolean);

  if (!segments.length || ROOT_ROUTE_SEGMENTS.has(segments[0])) {
    return '/';
  }

  return `/${segments[0]}`;
};

export const getAppBasePath = () => {
  const explicitBasePath = (import.meta.env.VITE_APP_BASE_PATH as string | undefined)?.trim();
  if (explicitBasePath) {
    return normalizeBasePath(explicitBasePath);
  }

  const viteBasePath = normalizeBasePath(import.meta.env.BASE_URL);
  return viteBasePath === '/' ? inferBasePathFromLocation() : viteBasePath;
};

const stripAppBasePath = (path: string) => {
  const basePath = getAppBasePath();
  if (basePath === '/') {
    return path || '/';
  }

  if (path === basePath) {
    return '/';
  }

  if (path.startsWith(`${basePath}/`)) {
    return path.slice(basePath.length) || '/';
  }

  return path || '/';
};

export const getCurrentAppSearchParams = () => {
  const currentParams = new URLSearchParams(window.location.search);
  const redirectedPath = currentParams.get(SPA_PATH_PARAM);

  if (!redirectedPath) {
    return currentParams;
  }

  try {
    const parsed = new URL(redirectedPath, window.location.origin);
    return parsed.searchParams;
  } catch {
    return new URLSearchParams();
  }
};

export const buildAppUrl = (path = '/', search?: URLSearchParams | string) => {
  const base = getAppBasePath();
  const normalizedBase = base === '/' ? '' : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`, window.location.origin);

  if (search) {
    url.search = typeof search === 'string' ? search : search.toString();
  }

  return url;
};

export const buildAssetUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return buildAppUrl(normalizedPath).toString();
};

export const applySpaPathRedirect = () => {
  const params = new URLSearchParams(window.location.search);
  const redirectedPath = params.get(SPA_PATH_PARAM);

  if (!redirectedPath) {
    return;
  }

  const parsed = new URL(redirectedPath, window.location.origin);
  const appPath = stripAppBasePath(parsed.pathname);
  const basePath = getAppBasePath();
  const normalizedBase = basePath === '/' ? '' : basePath;
  const nextUrl = `${normalizedBase}${appPath}${parsed.search}${parsed.hash}`;

  window.history.replaceState({}, '', nextUrl || '/');
};
