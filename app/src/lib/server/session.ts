import { getDb } from '$lib/server/db';
import type { Cookies } from '@sveltejs/kit';

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const SESSION_COOKIE_NAME = 'session_id';

export async function createSession(
	userId: string,
	cookies: Cookies,
	isSecure: boolean,
): Promise<string> {
	const sessionId = crypto.randomUUID();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

	const db = getDb();

	await db.execute({
		sql: `INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
		args: [sessionId, userId, now.toISOString(), expiresAt.toISOString()],
	});

	cookies.set(SESSION_COOKIE_NAME, sessionId, {
		httpOnly: true,
		sameSite: 'lax',
		secure: isSecure,
		maxAge: SESSION_MAX_AGE_SECONDS,
		path: '/',
	});

	return sessionId;
}
