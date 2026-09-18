// Standard client-side storage for Supabase auth tokens
export function brokeredPreviewStorage() {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}
