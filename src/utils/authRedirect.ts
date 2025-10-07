// src/utils/authRedirect.ts
// Utility functions for storing and retrieving post-authentication redirect paths

/**
 * Stores the current page path for redirect after authentication
 * Uses sessionStorage (more secure than query params, auto-clears on tab close)
 */
export function storeAuthReturnPath() {
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const fullPath = currentPath + currentSearch;
  
  // Store the complete path for after auth
  sessionStorage.setItem('auth_return_path', fullPath);
  
  console.log('[Auth Redirect] Stored return path:', fullPath);
}

/**
 * Retrieves the stored return path
 * Returns null if no path was stored
 */
export function getAuthReturnPath(): string | null {
  return sessionStorage.getItem('auth_return_path');
}

/**
 * Clears the stored return path
 * Should be called after redirect is complete
 */
export function clearAuthReturnPath() {
  sessionStorage.removeItem('auth_return_path');
}

/**
 * Validates that a return path is safe to redirect to
 * Only allows internal community/category paths
 */
export function isValidReturnPath(path: string): boolean {
  // Security: Only allow internal community paths, no auth pages
  return path.startsWith('/communities/') && !path.includes('/auth');
}

/**
 * Extracts the community slug from a path
 * Returns null if no community found
 */
export function extractCommunityFromPath(path: string): string | null {
  const match = path.match(/\/communities\/([^\/\?]+)/);
  return match ? match[1] : null;
}
