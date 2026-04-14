import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/private', () => ({
  AUTH_AUTH0_ID: 'id',
  AUTH_AUTH0_SECRET: 'secret',
  AUTH_AUTH0_ISSUER: 'https://example.com',
  AUTH_SECRET: 'super-secret',
}));

// Auth0 handle is a pass-through in tests
vi.mock('../../../auth', () => ({
  handle: async ({
    event,
    resolve,
  }: {
    event: unknown;
    resolve: (e: unknown) => Promise<Response>;
  }) => resolve(event),
}));

// Replace SvelteKit's sequence with simple compose to avoid request-store internals
vi.mock('@sveltejs/kit/hooks', () => ({
  sequence: (
    ...handlers: Array<
      (args: {
        event: unknown;
        resolve: (e: unknown) => Promise<Response>;
      }) => Promise<Response>
    >
  ) => {
    return async ({
      event,
      resolve,
    }: {
      event: unknown;
      resolve: (e: unknown) => Promise<Response>;
    }) => {
      let i = 0;
      const next = async (ev: unknown): Promise<Response> => {
        const h = handlers[i++];
        if (!h) return resolve(ev);
        return h({ event: ev, resolve: next });
      };
      return next(event);
    };
  },
}));

const getOrCreateAnonymousSession = vi
  .fn()
  .mockResolvedValue({ id: 'anon-xyz', questionCount: 2 });

vi.mock('../queries', () => ({
  getOrCreateAnonymousSession: (...args: unknown[]) =>
    getOrCreateAnonymousSession(...args),
}));

import { handle } from '../../../hooks.server';

interface TestLocals {
  user: { id: string; email: string } | null;
  anonymousSessionId: string;
  questionCount: number;
  auth: () => Promise<{ user?: { id?: string; email?: string } } | null>;
}

interface FakeEvent {
  locals: TestLocals;
  cookies: {
    get: (name: string) => string | undefined;
    set: (name: string, value: string, opts: unknown) => void;
  };
  url: URL;
  request: Request;
}

function createEvent(options: {
  cookie?: string;
  auth?: () => Promise<{ user?: { id?: string; email?: string } } | null>;
}): { event: FakeEvent; cookieStore: Map<string, string> } {
  const cookieStore = new Map<string, string>();
  if (options.cookie) cookieStore.set('anon_id', options.cookie);

  const event: FakeEvent = {
    locals: {
      user: null,
      anonymousSessionId: '',
      questionCount: 0,
      auth: options.auth ?? (async () => null),
    },
    cookies: {
      get: (name: string) => cookieStore.get(name),
      set: (name: string, value: string) => {
        cookieStore.set(name, value);
      },
    },
    url: new URL('http://localhost/'),
    request: new Request('http://localhost/'),
  };

  return { event, cookieStore };
}

describe('appHandle (hooks.server.ts)', () => {
  beforeEach(() => {
    getOrCreateAnonymousSession.mockClear();
    getOrCreateAnonymousSession.mockResolvedValue({
      id: 'anon-xyz',
      questionCount: 2,
    });
  });

  it('sets event.locals.user when Auth0 session has email', async () => {
    const { event } = createEvent({
      auth: async () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
    });

    await handle({
      event: event as unknown as Parameters<typeof handle>[0]['event'],
      resolve: async (e) => {
        const ev = e as unknown as FakeEvent;
        expect(ev.locals.user).toEqual({ id: 'user-1', email: 'test@example.com' });
        return new Response('ok');
      },
    });

    expect(getOrCreateAnonymousSession).not.toHaveBeenCalled();
  });

  it('creates anon_id cookie when no cookie present', async () => {
    const { event, cookieStore } = createEvent({ auth: async () => null });

    await handle({
      event: event as unknown as Parameters<typeof handle>[0]['event'],
      resolve: async () => new Response('ok'),
    });

    expect(cookieStore.has('anon_id')).toBe(true);
    expect(cookieStore.get('anon_id')).toMatch(/[0-9a-f-]{10,}/);
  });

  it('calls getOrCreateAnonymousSession and populates locals for anonymous users', async () => {
    const { event } = createEvent({
      cookie: 'existing-anon',
      auth: async () => null,
    });

    await handle({
      event: event as unknown as Parameters<typeof handle>[0]['event'],
      resolve: async (e) => {
        const ev = e as unknown as FakeEvent;
        expect(ev.locals.user).toBeNull();
        expect(ev.locals.anonymousSessionId).toBe('existing-anon');
        expect(ev.locals.questionCount).toBe(2);
        return new Response('ok');
      },
    });

    expect(getOrCreateAnonymousSession).toHaveBeenCalledWith('existing-anon');
  });

  it('falls back to anonymous when auth() throws', async () => {
    const { event } = createEvent({
      cookie: 'anon-err',
      auth: async () => {
        throw new Error('token expired');
      },
    });

    await handle({
      event: event as unknown as Parameters<typeof handle>[0]['event'],
      resolve: async (e) => {
        const ev = e as unknown as FakeEvent;
        expect(ev.locals.user).toBeNull();
        expect(ev.locals.anonymousSessionId).toBe('anon-err');
        return new Response('ok');
      },
    });

    expect(getOrCreateAnonymousSession).toHaveBeenCalledWith('anon-err');
  });
});
