<script lang="ts">
	import type { ActionData } from './$types';
	import AuthBrandPanel from '$lib/components/auth/AuthBrandPanel.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { t, getLocale } from '$lib/i18n';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
	const locale = getLocale();
</script>

<svelte:head>
	<title>{t(locale, 'page.signup.title')} | Achei Meu Pet</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-background p-4 md:p-0">
	<div
		class="w-full max-w-sm md:max-w-none md:w-[860px] rounded-2xl overflow-hidden shadow-2xl md:grid md:grid-cols-[1.05fr_0.95fr]"
	>
		<AuthBrandPanel
			tagline={t(locale, 'page.login.tagline')}
			subtext={t(locale, 'page.login.taglineSubtext')}
			footer={t(locale, 'page.login.brandFooter')}
			image="/login-banner.webp"
			imageAlt={t(locale, 'page.login.bannerAlt')}
		/>

		<div class="flex flex-col justify-center bg-card px-8 py-8 md:px-11 md:py-10">
			<h1 class="font-display font-bold text-2xl text-foreground mb-1">
				{t(locale, 'page.signup.heading')}
			</h1>
			<p class="text-sm text-muted-foreground mb-6">{t(locale, 'page.signup.subheading')}</p>

			<form method="POST" onsubmit={() => (loading = true)} class="space-y-3.5">
				{#if form?.error}
					<Alert variant="coral">
						<AlertDescription>{form.error}</AlertDescription>
					</Alert>
				{/if}

				<div class="space-y-1.5">
					<Label for="displayName">{t(locale, 'page.signup.nameLabel')}</Label>
					<Input
						id="displayName"
						name="displayName"
						type="text"
						required
						maxlength={80}
						autocomplete="name"
						value={form?.values?.displayName ?? ''}
					/>
				</div>
				<div class="space-y-1.5">
					<Label for="username">{t(locale, 'page.login.usernameLabel')}</Label>
					<Input
						id="username"
						name="username"
						type="text"
						required
						minlength={3}
						maxlength={32}
						pattern="[a-zA-Z0-9_\-]+"
						autocomplete="username"
						autocapitalize="none"
						spellcheck={false}
						value={form?.values?.username ?? ''}
					/>
					<p class="text-xs text-muted-foreground">{t(locale, 'page.signup.usernameHint')}</p>
				</div>
				<div class="space-y-1.5">
					<Label for="email">
						{t(locale, 'page.signup.emailLabel')}
						<span class="font-normal text-muted-foreground"
							>({t(locale, 'page.signup.optional')})</span
						>
					</Label>
					<Input
						id="email"
						name="email"
						type="email"
						maxlength={254}
						autocomplete="email"
						value={form?.values?.email ?? ''}
					/>
					<p class="text-xs text-muted-foreground">{t(locale, 'page.signup.emailHint')}</p>
				</div>
				<div class="space-y-3.5">
					<div class="space-y-1.5">
						<Label for="password">{t(locale, 'page.login.passwordLabel')}</Label>
						<Input
							id="password"
							name="password"
							type="password"
							required
							minlength={8}
							maxlength={128}
							autocomplete="new-password"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="confirmPassword">{t(locale, 'page.setup.confirmPasswordLabel')}</Label>
						<Input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							required
							minlength={8}
							maxlength={128}
							autocomplete="new-password"
						/>
					</div>
				</div>

				<!-- Honeypot: hidden from people and assistive tech; bots fill it. -->
				<div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
					<label for="website">Website</label>
					<input id="website" name="website" type="text" tabindex="-1" autocomplete="off" />
				</div>

				<Button type="submit" class="w-full mt-2" disabled={loading}>
					{loading ? t(locale, 'page.signup.creating') : t(locale, 'page.signup.submit')}
				</Button>
			</form>

			<p class="mt-6 text-center text-sm text-muted-foreground">
				{t(locale, 'page.signup.haveAccount')}
				<a href="/auth/login" class="font-semibold text-primary hover:underline"
					>{t(locale, 'page.login.signIn')}</a
				>
				·
				<a href="/conheca" class="hover:underline">{t(locale, 'page.login.learnMore')}</a>
			</p>
		</div>
	</div>
</div>
