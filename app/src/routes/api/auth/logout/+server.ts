import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { SESSION_COOKIE_NAME } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const sessionId = event.cookies.get(SESSION_COOKIE_NAME);

	if (sessionId) {
		const db = getDb();
		await db.execute({
			sql: `DELETE FROM sessions WHERE id = ?`,
			args: [sessionId],
		});
	}

	event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

	return json({ ok: true });
};
