<script lang="ts">
	let { onclose, onsuccess }: { onclose: () => void; onsuccess: () => void } = $props();

	let mode: 'login' | 'register' = $state('register');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	function resetForm() {
		email = '';
		password = '';
		confirmPassword = '';
		error = '';
	}

	function switchMode(newMode: 'login' | 'register') {
		mode = newMode;
		resetForm();
	}

	async function handleSubmit() {
		error = '';

		if (!email || !password) {
			error = 'Fyll i alla fält.';
			return;
		}

		if (mode === 'register') {
			if (!confirmPassword) {
				error = 'Fyll i alla fält.';
				return;
			}
			if (password.length < 8) {
				error = 'Lösenordet måste vara minst 8 tecken.';
				return;
			}
			if (password !== confirmPassword) {
				error = 'Lösenorden matchar inte.';
				return;
			}
		}

		loading = true;

		try {
			const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.message || 'Ett oväntat fel uppstod.';
				return;
			}

			onsuccess();
		} catch {
			error = 'Kunde inte ansluta till servern.';
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSubmit();
		}
		if (e.key === 'Escape') {
			onclose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
	role="dialog"
	aria-modal="true"
	aria-label={mode === 'register' ? 'Skapa konto' : 'Logga in'}
	tabindex="-1"
>
	<div class="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
		<!-- Close button -->
		<div class="flex justify-end">
			<button
				onclick={onclose}
				class="text-zinc-500 hover:text-zinc-300 transition-colors"
				aria-label="Stäng"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>

		<!-- Title -->
		<h2 class="text-xl font-bold text-zinc-100 text-center mb-6">
			{mode === 'register' ? 'Skapa konto' : 'Logga in'}
		</h2>

		<!-- Mode tabs -->
		<div class="flex gap-2 mb-6">
			<button
				onclick={() => switchMode('register')}
				class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {mode === 'register'
					? 'bg-violet-600 text-white'
					: 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}"
			>
				Skapa konto
			</button>
			<button
				onclick={() => switchMode('login')}
				class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {mode === 'login'
					? 'bg-violet-600 text-white'
					: 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}"
			>
				Logga in
			</button>
		</div>

		<!-- Form -->
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="flex flex-col gap-4"
		>
			<div>
				<label for="auth-email" class="block text-sm text-zinc-400 mb-1">E-post</label>
				<input
					id="auth-email"
					type="email"
					bind:value={email}
					class="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
					placeholder="din@epost.se"
				/>
			</div>

			<div>
				<label for="auth-password" class="block text-sm text-zinc-400 mb-1">Lösenord</label>
				<input
					id="auth-password"
					type="password"
					bind:value={password}
					class="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
					placeholder="Minst 8 tecken"
				/>
			</div>

			{#if mode === 'register'}
				<div>
					<label for="auth-confirm" class="block text-sm text-zinc-400 mb-1">Bekräfta lösenord</label>
					<input
						id="auth-confirm"
						type="password"
						bind:value={confirmPassword}
						class="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
						placeholder="Upprepa lösenord"
					/>
				</div>
			{/if}

			{#if error}
				<p class="text-red-400 text-sm">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl transition-colors text-sm"
			>
				{#if loading}
					Vänta...
				{:else if mode === 'register'}
					Skapa konto
				{:else}
					Logga in
				{/if}
			</button>
		</form>
	</div>
</div>
