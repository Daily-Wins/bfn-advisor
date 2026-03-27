import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from './auth';
import { getOrCreateAnonymousSession } from '$lib/server/queries';

const appHandle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;
  event.locals.anonymousSessionId = '';
  event.locals.questionCount = 0;

  // Check Auth0 session
  const session = await event.locals.auth();
  if (session?.user?.email) {
    event.locals.user = {
      id: session.user.id ?? session.user.email,
      email: session.user.email,
    };
    return resolve(event);
  }

  // Anonymous session tracking for freemium gating
  let anonId = event.cookies.get('anon_id');
  if (!anonId) {
    anonId = crypto.randomUUID();
    event.cookies.set('anon_id', anonId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: event.url.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const anonSession = await getOrCreateAnonymousSession(anonId);
  event.locals.anonymousSessionId = anonId;
  event.locals.questionCount = anonSession.questionCount;

  return resolve(event);
};

export const handle = sequence(authHandle, appHandle);
