import { json } from '@sveltejs/kit';
import { verify } from '@node-rs/argon2';
import { getDb } from '$lib/server/db';
import { createSession } from '$lib/server/session';
import type { RequestHandler } from './$types';

function invalidCredentials() {
	return json(
		{ error: 'invalid_credentials', message: 'Fel e-post eller lösenord.' },
		{ status: 401 },
	);
}

export const POST: RequestHandler = async (event) => {
	const { email, password } = await event.request.json();

	if (!email || !password) {
		return json(
			{ error: 'validation', message: 'E-post och lösenord krävs.' },
			{ status: 400 },
		);
	}

	const db = getDb();

	const result = await db.execute({
		sql: `SELECT id, email, password_hash FROM users WHERE email = ?`,
		args: [email],
	});

	const user = result.rows[0];

	if (!user) {
		return invalidCredentials();
	}

	const passwordValid = await verify(String(user.password_hash), password);

	if (!passwordValid) {
		return invalidCredentials();
	}

	const isSecure = event.url.protocol === 'https:';
	await createSession(String(user.id), event.cookies, isSecure);

	return json({ ok: true, user: { id: String(user.id), email: String(user.email) } });
};
