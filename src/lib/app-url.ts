import 'server-only';

const PRODUCTION_URL = 'https://hr.bosscoderacademy.com';

/**
 * Base URL for links that leave the app (emails, Slack). Uses APP_BASE_URL when
 * it points somewhere real, otherwise the production portal — a link in an email
 * must never be localhost, even when it's sent from a dev server (which talks to
 * the same database and mails real people) or APP_BASE_URL isn't set.
 */
export function appBaseUrl(): string {
  const env = process.env.APP_BASE_URL?.trim().replace(/\/$/, '');
  if (env && !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(env)) return env;
  return PRODUCTION_URL;
}
