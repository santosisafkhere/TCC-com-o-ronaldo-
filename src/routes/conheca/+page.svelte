<script lang="ts">
	import type { PageData } from './$types';
	import { getLocale } from '$lib/i18n';
	import { landingCopy } from '$lib/landing/content';
	import PawLogo from '$lib/components/PawLogo.svelte';
	import {
		ChevronRight,
		ChevronDown,
		Lock,
		QrCode,
		PawPrint,
		HeartPulse,
		CalendarDays,
		NotebookText,
		Check,
		ShieldCheck,
		Phone,
		MessageCircle,
		Users,
		CalendarClock,
		Stethoscope,
		Infinity as InfinityIcon,
		Plus,
		Menu,
		X
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	const locale = getLocale();
	const c = landingCopy(locale);
	const year = new Date().getFullYear();

	const loggedIn = $derived(!!data.user);
	let menuOpen = $state(false);

	const featureIcons = [HeartPulse, CalendarDays, PawPrint, NotebookText];
	const trustIcons = [Lock, QrCode, PawPrint];
	const togetherIcons = [Users, CalendarClock, Stethoscope];
	const bandIcons = [QrCode, InfinityIcon, ShieldCheck];

	const nav = [
		{ href: '#inicio', label: c.nav.home },
		{ href: '#funcoes', label: c.nav.features },
		{ href: '#perdido', label: c.nav.lost },
		{ href: '#duvidas', label: c.nav.faq }
	];
</script>

<svelte:head>
	<title>{c.meta.title}</title>
	<meta name="description" content={c.meta.description} />
	<link rel="canonical" href="{data.origin}/conheca" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={c.meta.title} />
	<meta property="og:description" content={c.meta.description} />
	<meta property="og:image" content="{data.origin}/landing/pets.webp" />
	<meta property="og:locale" content={locale === 'pt' ? 'pt_BR' : 'en_US'} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="theme-color" content="#3f1793" />
</svelte:head>

<div class="lp min-h-screen" id="inicio">
	<!-- ============ Hero (with header) ============ -->
	<section class="lp-hero relative overflow-hidden text-white">
		<div class="lp-blob lp-blob-right" aria-hidden="true"></div>

		<header
			class="relative z-20 mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
		>
			<a href="/conheca" class="flex items-center gap-3" aria-label="Achei Meu Pet">
				<span class="lp-logo flex h-11 w-11 items-center justify-center rounded-2xl">
					<PawLogo class="h-6 w-6 text-white" />
				</span>
				<span class="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
					>Achei Meu Pet</span
				>
			</a>

			<nav class="hidden items-center gap-8 text-[15px] lg:flex" aria-label={c.nav.features}>
				{#each nav as item (item.href)}
					<a href={item.href} class="lp-navlink">{item.label}</a>
				{/each}
			</nav>

			<div class="flex items-center gap-2.5">
				{#if loggedIn}
					<a href="/" class="lp-pill lp-pill-signup">{c.nav.dashboard}</a>
				{:else}
					<!-- The wrapper owns visibility: .lp-pill sets its own display. -->
					<div class="hidden items-center gap-2.5 sm:flex">
						<a href="/auth/login" class="lp-pill lp-pill-outline">{c.nav.login}</a>
						<a href="/auth/cadastro" class="lp-pill lp-pill-signup">{c.nav.signup}</a>
					</div>
				{/if}
				<button
					type="button"
					class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 lg:hidden"
					aria-expanded={menuOpen}
					aria-controls="lp-menu"
					aria-label="Menu"
					onclick={() => (menuOpen = !menuOpen)}
				>
					{#if menuOpen}<X class="h-5 w-5" />{:else}<Menu class="h-5 w-5" />{/if}
				</button>
			</div>
		</header>

		{#if menuOpen}
			<div
				id="lp-menu"
				class="relative z-20 mx-4 mb-2 rounded-2xl bg-white/10 p-3 backdrop-blur lg:hidden"
			>
				{#each nav as item (item.href)}
					<a
						href={item.href}
						class="block rounded-xl px-3 py-2.5"
						onclick={() => (menuOpen = false)}
					>
						{item.label}
					</a>
				{/each}
				{#if !loggedIn}
					<div class="mt-2 grid grid-cols-2 gap-2 sm:hidden">
						<a href="/auth/login" class="lp-pill lp-pill-outline justify-center">{c.nav.login}</a>
						<a href="/auth/cadastro" class="lp-pill lp-pill-signup justify-center">{c.nav.signup}</a
						>
					</div>
				{/if}
			</div>
		{/if}

		<div
			class="relative z-10 mx-auto grid max-w-6xl items-end gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:pt-8"
		>
			<div class="pb-10 lg:pb-20">
				<h1
					class="font-display text-[2.7rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-[3.7rem] xl:text-[4.1rem]"
				>
					{c.hero.titleA}
					<span class="relative mt-2 inline-block">
						<span
							class="lp-highlight inline-block rounded-[1.4rem] px-4 pb-2 pt-0.5 italic sm:px-5"
						>
							{c.hero.titleB}
						</span>
						<svg
							class="lp-spark absolute -right-12 top-1/2 h-12 w-10 -translate-y-1/2 sm:-right-14"
							viewBox="0 0 40 48"
							aria-hidden="true"
						>
							<path
								d="M6 8 L30 2 M4 24 L34 22 M6 40 L30 46"
								stroke="#ffc533"
								stroke-width="5"
								stroke-linecap="round"
								fill="none"
							/>
						</svg>
					</span>
				</h1>
				<p class="mt-6 max-w-[30rem] text-lg leading-relaxed text-white/90 sm:text-xl">
					{c.hero.lead}
				</p>

				<div class="mt-8 flex flex-wrap gap-3">
					{#if loggedIn}
						<a href="/" class="lp-pill lp-pill-cta lp-pill-lg">
							{c.nav.dashboard}
							<ChevronRight class="h-5 w-5" />
						</a>
					{:else}
						<a href="/auth/cadastro" class="lp-pill lp-pill-cta lp-pill-lg">
							{c.hero.primary}
							<ChevronRight class="h-5 w-5" />
						</a>
					{/if}
					<a href="#funcoes" class="lp-pill lp-pill-outline lp-pill-lg">
						<ChevronDown class="h-5 w-5" />
						{c.hero.secondary}
					</a>
				</div>

				<ul class="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/90">
					{#each c.hero.trust as label, i (label)}
						{@const Icon = trustIcons[i]}
						<li class="flex items-center gap-2"><Icon class="h-5 w-5" />{label}</li>
					{/each}
				</ul>
			</div>

			<!-- Bleeds past the content column to the right edge, like the mockup. -->
			<div class="relative -mx-4 sm:mx-0 lg:-mr-24 xl:-mr-44">
				<img
					src="/landing/pets.webp"
					alt={c.hero.imageAlt}
					width="630"
					height="335"
					fetchpriority="high"
					class="lp-pets relative w-full"
				/>
			</div>
		</div>

		<!-- Orange ribbon + white wave into the next section -->
		<svg
			class="relative z-10 -mt-1 block h-16 w-full sm:h-24"
			viewBox="0 0 1440 120"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<defs>
				<linearGradient id="lp-ribbon" x1="0" x2="1">
					<stop offset="0" stop-color="#ffb02e" />
					<stop offset="0.45" stop-color="#ff7a3d" />
					<stop offset="1" stop-color="#a24bf0" />
				</linearGradient>
			</defs>
			<path
				d="M0 34 C 360 4, 760 70, 1440 18 L1440 62 C 820 104, 380 40, 0 72 Z"
				fill="url(#lp-ribbon)"
			/>
			<path d="M0 62 C 420 30, 820 104, 1440 52 L1440 120 L0 120 Z" fill="#ffffff" />
		</svg>
	</section>

	<main>
		<!-- ============ Features ============ -->
		<section
			id="funcoes"
			class="mx-auto max-w-6xl scroll-mt-4 px-4 pb-20 pt-10 text-center sm:px-6"
		>
			<h2
				class="lp-ink font-display mx-auto max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
			>
				{c.features.title}
			</h2>
			<svg class="mx-auto mt-3 h-4 w-32" viewBox="0 0 128 16" aria-hidden="true">
				<path
					d="M4 12 C 40 2, 88 2, 124 10"
					stroke="#ff8a1f"
					stroke-width="4"
					fill="none"
					stroke-linecap="round"
				/>
			</svg>

			<div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
				{#each c.features.items as item, i (item.title)}
					{@const Icon = featureIcons[i]}
					<article
						class="lp-feature {i % 2 ? 'lp-feature-warm' : 'lp-feature-cool'} rounded-3xl px-6 py-8"
					>
						<Icon class="lp-feature-icon mx-auto h-14 w-14" strokeWidth={1.75} />
						<h3 class="lp-ink font-display mt-4 text-2xl font-extrabold">{item.title}</h3>
						<p class="lp-muted mt-2 leading-relaxed">{item.text}</p>
					</article>
				{/each}
			</div>
		</section>

		<!-- ============ App preview ============ -->
		<section class="relative overflow-hidden">
			<div class="lp-blob lp-blob-left" aria-hidden="true"></div>
			<div
				class="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 sm:px-6 lg:grid-cols-[1.15fr_1fr]"
			>
				<div class="relative">
					<img
						src="/landing/app.webp"
						alt={c.app.imageAlt}
						width="530"
						height="322"
						loading="lazy"
						class="relative mx-auto w-full max-w-[34rem]"
					/>
				</div>
				<div>
					<h2
						class="lp-ink font-display max-w-md text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.35rem]"
					>
						{c.app.title}
					</h2>
					<ul class="mt-7 space-y-4">
						{#each c.app.points as point (point)}
							<li class="flex items-center gap-3 text-lg">
								<span
									class="lp-check flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
								>
									<Check class="h-4 w-4" strokeWidth={3} />
								</span>
								<span class="lp-ink">{point}</span>
							</li>
						{/each}
					</ul>
					<a
						href={loggedIn ? '/' : '/auth/cadastro'}
						class="lp-pill lp-pill-signup lp-pill-lg mt-9"
					>
						{loggedIn ? c.nav.dashboard : c.app.cta}
						<ChevronRight class="h-5 w-5" />
					</a>
				</div>
			</div>
		</section>

		<!-- ============ Lost pet ============ -->
		<section id="perdido" class="lp-deep scroll-mt-4 text-white">
			<div
				class="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-24"
			>
				<div>
					<p class="lp-kicker text-[#ffb27a]">{c.lost.kicker}</p>
					<h2
						class="font-display mt-3 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl"
					>
						{c.lost.title}
					</h2>
					<p class="mt-5 text-lg leading-relaxed text-white/80">{c.lost.body}</p>
					<ol class="mt-10 space-y-7">
						{#each c.lost.steps as step, i (step.title)}
							<li class="flex gap-5">
								<span
									class="lp-step font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-extrabold"
								>
									{i + 1}
								</span>
								<div>
									<h3 class="font-semibold">{step.title}</h3>
									<p class="mt-1 leading-relaxed text-white/75">{step.text}</p>
								</div>
							</li>
						{/each}
					</ol>
					<p class="mt-10 flex items-start gap-3 text-sm text-white/75">
						<ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-[#ffc533]" />
						{c.lost.note}
					</p>
				</div>

				<!-- Sample poster: the same layout the public page prints. -->
				<div class="mx-auto w-full max-w-[21rem]">
					<div class="-rotate-2 overflow-hidden rounded-3xl bg-white text-[#2a1660] shadow-2xl">
						<div class="lp-poster-head px-6 py-4 text-center text-white">
							<p class="font-display text-3xl font-extrabold uppercase tracking-wide">
								{c.lost.poster.heading}
							</p>
						</div>
						<div class="px-6 pb-6 pt-5 text-center">
							<img
								src="/landing/thor.webp"
								alt=""
								width="200"
								height="200"
								loading="lazy"
								class="mx-auto h-32 w-32 rounded-2xl object-cover"
							/>
							<p class="font-display mt-4 text-3xl font-extrabold">{c.lost.poster.name}</p>
							<p class="text-sm text-[#6b5f8a]">{c.lost.poster.details}</p>
							<p class="mt-3 rounded-xl bg-[#f5f0ff] px-3 py-2 text-sm">{c.lost.poster.message}</p>
							<p class="mt-4 text-xs text-[#6b5f8a]">{c.lost.poster.contact}</p>
							<p class="font-display text-xl font-extrabold">(11) 9 8888-7777</p>
							<div class="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
								<span
									class="flex items-center justify-center gap-1.5 rounded-xl bg-[#6d28d9] py-2 text-white"
								>
									<Phone class="h-4 w-4" />{c.lost.poster.call}
								</span>
								<span
									class="flex items-center justify-center gap-1.5 rounded-xl bg-[#dcf5ea] py-2 text-[#0f6b4f]"
								>
									<MessageCircle class="h-4 w-4" />WhatsApp
								</span>
							</div>
							<div
								class="mt-5 flex items-center gap-3 border-t border-dashed border-[#e2d9f5] pt-4 text-left"
							>
								<img src={data.qr} alt="" width="64" height="64" class="h-16 w-16" />
								<p class="text-xs leading-snug text-[#6b5f8a]">{c.lost.poster.scan}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- ============ Shared care ============ -->
		<section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
			<p class="lp-kicker text-[#7c3aed]">{c.together.kicker}</p>
			<h2
				class="lp-ink font-display mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
			>
				{c.together.title}
			</h2>
			<div class="mt-10 grid gap-5 md:grid-cols-3">
				{#each c.together.cards as card, i (card.title)}
					{@const Icon = togetherIcons[i]}
					<article
						class="lp-feature {i % 2 ? 'lp-feature-warm' : 'lp-feature-cool'} rounded-3xl p-7"
					>
						<Icon class="lp-feature-icon h-9 w-9" strokeWidth={1.75} />
						<h3 class="lp-ink font-display mt-4 text-xl font-extrabold">{card.title}</h3>
						<p class="lp-muted mt-2 leading-relaxed">{card.text}</p>
					</article>
				{/each}
			</div>
		</section>

		<!-- ============ FAQ ============ -->
		<section id="duvidas" class="mx-auto max-w-3xl scroll-mt-4 px-4 pb-24 sm:px-6">
			<h2
				class="lp-ink font-display text-center text-3xl font-extrabold tracking-tight sm:text-4xl"
			>
				{c.faq.title}
			</h2>
			<div class="mt-8">
				{#each c.faq.items as item (item.q)}
					<details class="lp-faq group">
						<summary
							class="lp-ink flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold"
						>
							{item.q}
							<Plus
								class="h-5 w-5 shrink-0 text-[#7c3aed] transition-transform group-open:rotate-45"
							/>
						</summary>
						<p class="lp-muted -mt-1 pb-5 leading-relaxed">{item.a}</p>
					</details>
				{/each}
			</div>
		</section>
	</main>

	<!-- ============ Band + footer ============ -->
	<footer class="lp-band text-white">
		<div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 md:gap-0">
			{#each c.band as item, i (item.title)}
				{@const Icon = bandIcons[i]}
				<div
					class="flex items-center gap-4 md:justify-center md:px-6 {i > 0
						? 'md:border-l md:border-white/25'
						: ''}"
				>
					<Icon class="h-11 w-11 shrink-0" strokeWidth={1.75} />
					<div>
						<p class="font-display text-lg font-bold">{item.title}</p>
						<p class="text-sm text-white/80">{item.text}</p>
					</div>
				</div>
			{/each}
		</div>
		<div class="border-t border-white/15">
			<div
				class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-white/75 sm:px-6 md:flex-row md:items-center md:justify-between"
			>
				<div class="flex items-center gap-2.5">
					<span class="lp-logo flex h-8 w-8 items-center justify-center rounded-lg">
						<PawLogo class="h-4 w-4 text-white" />
					</span>
					<span
						><strong class="font-display text-white">Achei Meu Pet</strong> · {c.footer
							.tagline}</span
					>
				</div>
				<div class="flex gap-5">
					<a href="/auth/login" class="hover:text-white">{c.nav.login}</a>
					<span>© {year}</span>
				</div>
			</div>
		</div>
	</footer>
</div>

<style>
	/* Palette sampled from the approved mockup. The page is always light: it
	   is brand art, and the hero/band colors are baked into the images. */
	.lp {
		--ink: #2a1660;
		--muted: #4f4670;
		background: #ffffff;
		color: var(--ink);
		color-scheme: light;
		font-family: var(--font-sans);
	}
	.lp-ink {
		color: var(--ink);
	}
	.lp-muted {
		color: var(--muted);
	}

	.lp-hero {
		background: linear-gradient(110deg, #3f1793 0%, #4a1c9c 38%, #5e25ad 66%, #7a33c4 100%);
	}
	.lp-blob {
		position: absolute;
		border-radius: 999px;
		pointer-events: none;
	}
	.lp-blob-right {
		right: -8rem;
		top: 4rem;
		height: 26rem;
		width: 26rem;
		background: radial-gradient(circle at 30% 30%, #b45cf5 0%, #8c3fe0 45%, transparent 70%);
		opacity: 0.55;
	}
	.lp-blob-left {
		left: -10rem;
		bottom: -12rem;
		height: 26rem;
		width: 30rem;
		background: radial-gradient(circle, #efe6ff 0%, transparent 70%);
	}

	.lp-logo {
		background: linear-gradient(135deg, #b44cf0 0%, #ff6b6b 100%);
		box-shadow: 0 8px 20px -8px rgb(255 107 107 / 0.6);
	}
	.lp-navlink {
		color: rgb(255 255 255 / 0.9);
		transition: color 0.15s;
	}
	.lp-navlink:hover {
		color: #fff;
	}

	.lp-highlight {
		background: linear-gradient(90deg, #8b3ff0 0%, #a855f7 100%);
		box-shadow: 0 12px 30px -12px #a855f7;
	}
	.lp-pets {
		/* Fade the artwork's own purple into the hero gradient. */
		-webkit-mask-image:
			linear-gradient(to right, transparent 0, #000 10%, #000 90%, transparent 100%),
			linear-gradient(to bottom, transparent 0, #000 22%);
		-webkit-mask-composite: source-in;
		mask-image:
			linear-gradient(to right, transparent 0, #000 10%, #000 90%, transparent 100%),
			linear-gradient(to bottom, transparent 0, #000 22%);
		mask-composite: intersect;
	}

	.lp-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 999px;
		padding: 0.6rem 1.35rem;
		font-size: 0.95rem;
		font-weight: 700;
		white-space: nowrap;
		transition:
			transform 0.15s,
			box-shadow 0.15s,
			background-color 0.15s;
	}
	.lp-pill:hover {
		transform: translateY(-1px);
	}
	.lp-pill:focus-visible {
		outline: 3px solid #ffc533;
		outline-offset: 3px;
	}
	.lp-pill-lg {
		padding: 0.85rem 1.35rem;
		font-size: 1rem;
	}
	.lp-pill-outline {
		color: #fff;
		border: 2px solid rgb(255 255 255 / 0.85);
	}
	.lp-pill-outline:hover {
		background: rgb(255 255 255 / 0.1);
	}
	.lp-pill-signup {
		color: #fff;
		background: linear-gradient(90deg, #9d52f8 0%, #f27674 100%);
		box-shadow: 0 10px 24px -10px #c35fd0;
	}
	.lp-pill-cta {
		color: #fff;
		background: linear-gradient(90deg, #ff8a5c 0%, #c04ef0 100%);
		box-shadow: 0 12px 28px -10px #ff8a5c;
	}

	.lp-feature {
		border: 1px solid transparent;
		box-shadow: 0 18px 40px -28px rgb(42 22 96 / 0.35);
	}
	.lp-feature-cool {
		background: #f4effe;
	}
	.lp-feature-warm {
		background: #fff4e8;
	}
	.lp-feature-cool :global(.lp-feature-icon) {
		color: #7c3aed;
	}
	.lp-feature-warm :global(.lp-feature-icon) {
		color: #f7860f;
	}
	.lp-check {
		background: #6d28d9;
		color: #fff;
	}

	.lp-deep {
		background: linear-gradient(120deg, #2a1660 0%, #3f1793 60%, #5a23a8 100%);
	}
	.lp-kicker {
		font-size: 0.8rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.lp-step {
		background: linear-gradient(135deg, #ff8a5c, #c04ef0);
	}
	.lp-poster-head {
		background: linear-gradient(90deg, #ff6b4a, #e2458b);
	}

	.lp-faq {
		border-bottom: 1px solid #e9e1f7;
	}
	.lp-faq summary::-webkit-details-marker {
		display: none;
	}

	.lp-band {
		background: linear-gradient(110deg, #4e2399 0%, #5d27ad 100%);
	}

	@media (prefers-reduced-motion: reduce) {
		.lp-pill,
		.lp-pill:hover {
			transition: none;
			transform: none;
		}
	}
</style>
