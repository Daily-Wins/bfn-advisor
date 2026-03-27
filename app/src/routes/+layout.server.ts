import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
		questionCount: locals.questionCount,
		questionsRemaining: locals.user ? null : Math.max(0, 5 - locals.questionCount),
	};
};
