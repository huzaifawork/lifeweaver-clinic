// src/lib/utils/api-url.ts

/**
 * Get the base URL for API calls
 * Works in both client-side and server-side environments
 * Handles development (localhost) and production (Vercel) environments
 */
export function getApiBaseUrl(): string {
  // Server-side: Use NEXTAUTH_URL if available
  if (typeof window === 'undefined') {
    // Server-side
    if (process.env.NEXTAUTH_URL) {
      return process.env.NEXTAUTH_URL;
    }
    
    // Production URL for Lifeweaver Clinic
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    
    // Hardcoded production URL as fallback
    if (process.env.NODE_ENV === 'production') {
      return 'https://lifeweaver-clinic.vercel.app';
    }
    
    // Development fallback
    return 'http://localhost:9002';
  }
  
  // Client-side: Use current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Final fallback
  return 'http://localhost:9002';
}

/**
 * Get the full API URL for a given endpoint
 * @param endpoint - The API endpoint (e.g., '/api/calendar/sync-appointment')
 * @returns Full URL for the API call
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}