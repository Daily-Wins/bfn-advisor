import { json } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { getDb } from '$lib/server/db';
import { createSession } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const { email, password } = await event.request.json();

	if (!email || !String(email).includes('@')) {
		return json(
			{ error: 'validation', message: 'Ange en giltig e-postadress.' },
			{ status: 400 },
		);
	}

	if (!password || String(password).length < 8) {
		return json(
			{ error: 'validation', message: 'Lösenordet måste vara minst 8 tecken.' },
			{ status: 400 },
		);
	}

	const passwordHash = await hash(password);
	const userId = crypto.randomUUID();
	const db = getDb();

	try {
		await db.execute({
			sql: `INSERT INTO users (id, email, password_hash, created_at, anonymous_session_id) VALUES (?, ?, ?, ?, ?)`,
			args: [userId, email, passwordHash, new Date().toISOString(), event.locals.anonymousSessionId],
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		if (message.includes('UNIQUE') || message.includes('unique')) {
			return json(
				{ error: 'email_taken', message: 'E-postadressen används redan.' },
				{ status: 409 },
			);
		}
		throw err;
	}

	const isSecure = event.url.protocol === 'https:';
	await createSession(userId, event.cookies, isSecure);

	return json({ ok: true, user: { id: userId, email } });
};
