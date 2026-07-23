export function getMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
  // Remove trailing /api/v1 or /api to get origin
  const origin = baseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}
