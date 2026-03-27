// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session } from '@auth/core/types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: { id: string; email: string } | null;
			anonymousSessionId: string;
			questionCount: number;
			auth(): Promise<Session | null>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
