<script lang="ts">
	import type { PageData } from './$types';
	import { t, getLocale } from '$lib/i18n';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Phone, MessageCircle, Printer, PawPrint } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	const locale = getLocale();

	let pet = $derived(data.pet);
	let contact = $derived(data.contact);
	let isLost = $derived(!!pet.lostAt);
	let avatarFailed = $state(false);

	let details = $derived(
		[
			pet.breed,
			pet.sex === 'male' || pet.sex === 'female' ? t(locale, `enum.sex.${pet.sex}`) : null
		]
			.filter(Boolean)
			.join(' · ')
	);

	let lostSince = $derived(
		pet.lostAt ? new Date(pet.lostAt).toLocaleDateString(locale, { dateStyle: 'long' }) : ''
	);

	let whatsappHref = $derived(
		contact?.whatsapp
			? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
					t(locale, 'public.whatsappText', { name: pet.name })
				)}`
			: null
	);
</script>

<svelte:head>
	<title>{pet.name} | Achei Meu Pet</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main
	class="min-h-screen bg-background text-foreground flex justify-center p-4 sm:p-8 print:p-0 print:bg-white print:text-black"
>
	<article class="w-full max-w-md space-y-6 text-center">
		{#if isLost}
			<header
				class="rounded-xl bg-coral text-coral-foreground px-4 py-3 print:border-4 print:border-black print:bg-white print:text-black"
			>
				<h1 class="font-display font-extrabold text-3xl print:text-6xl tracking-wide uppercase">
					{t(locale, 'public.lostHeading')}
				</h1>
				<p class="text-sm print:text-lg mt-0.5">
					{t(locale, 'public.lostSince', { date: lostSince })}
				</p>
			</header>
		{/if}

		<div class="flex justify-center">
			{#if pet.hasAvatar && !avatarFailed}
				<img
					src={data.avatarUrl}
					alt={pet.name}
					onerror={() => (avatarFailed = true)}
					class="h-56 w-56 print:h-80 print:w-80 rounded-2xl object-cover border border-border shadow-md print:shadow-none"
				/>
			{:else}
				<div
					class="h-56 w-56 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"
				>
					<PawPrint class="h-20 w-20" />
				</div>
			{/if}
		</div>

		<div class="space-y-1">
			{#if isLost}
				<h2 class="font-display font-bold text-4xl print:text-5xl">{pet.name}</h2>
			{:else}
				<h1 class="font-display font-bold text-3xl">
					{t(locale, 'public.foundHeading', { name: pet.name })}
				</h1>
			{/if}
			{#if details}
				<p class="text-muted-foreground print:text-black print:text-xl">{details}</p>
			{/if}
		</div>

		<p class="text-base print:text-xl">
			{isLost ? t(locale, 'public.lostIntro') : t(locale, 'public.foundIntro')}
		</p>

		{#if pet.lostMessage}
			<p
				class="rounded-xl border border-border bg-card px-4 py-3 text-left whitespace-pre-line print:border-black print:text-lg"
			>
				{pet.lostMessage}
			</p>
		{/if}

		{#if contact}
			<section class="rounded-xl border border-border bg-card p-4 space-y-3 print:border-black">
				{#if contact.name}
					<p class="text-sm text-muted-foreground print:text-black print:text-lg">
						{t(locale, 'public.contact', { name: contact.name })}
					</p>
				{/if}
				<p class="font-display font-bold text-2xl print:text-5xl">{contact.phone}</p>
				<div class="flex flex-col sm:flex-row gap-2 print:hidden">
					<Button href="tel:{contact.phone.replace(/[^\d+]/g, '')}" class="flex-1 gap-2">
						<Phone class="h-4 w-4" />
						{t(locale, 'public.call')}
					</Button>
					{#if whatsappHref}
						<Button
							href={whatsappHref}
							target="_blank"
							rel="noopener noreferrer"
							variant="secondary"
							class="flex-1 gap-2"
						>
							<MessageCircle class="h-4 w-4" />
							{t(locale, 'public.whatsapp')}
						</Button>
					{/if}
				</div>
			</section>
		{:else}
			<p class="text-sm text-muted-foreground">{t(locale, 'public.noContact')}</p>
		{/if}

		{#if isLost}
			<!-- Poster footer: only on paper, so a passer-by can open this page. -->
			<div class="hidden print:flex items-center justify-center gap-4 pt-2">
				<img src={data.qr} alt="" class="h-32 w-32" />
				<p class="text-left text-base max-w-[14rem]">
					{t(locale, 'public.scanHint')}<br />
					<span class="text-xs break-all">{data.pageUrl}</span>
				</p>
			</div>

			<Button variant="ghost" class="gap-2 print:hidden" onclick={() => window.print()}>
				<Printer class="h-4 w-4" />
				{t(locale, 'public.print')}
			</Button>
		{/if}

		<p class="text-xs text-muted-foreground print:hidden">Achei Meu Pet</p>
	</article>
</main>
