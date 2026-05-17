// Edge-safe constants only. NEVER import firebase-admin or anything Node-only here.
//
// IMPORTANT: must be named exactly `__session`. Firebase Hosting strips every
// cookie other than `__session` on requests/responses that flow through
// Cloud Run / Cloud Functions rewrites — see
// https://firebase.google.com/docs/hosting/manage-cache#using_cookies
export const SESSION_COOKIE = '__session';
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000; // 5 days
