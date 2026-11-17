<script lang="ts">
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import AppFooter from '$lib/components/AppFooter.svelte';
	import { ToastRegion } from '$lib/components/ui/toast';
	import SearchPalette from '$lib/components/SearchPalette.svelte';
	import AppTopBar from '$lib/components/shell/AppTopBar.svelte';
	import AppNavDrawer from '$lib/components/shell/AppNavDrawer.svelte';
	import { t, getLocale } from '$lib/i18n';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const locale = getLocale();

	let activeCompanionId = $derived(page.params.companionId ?? null);
	let activeCompanion = $derived(
		data.companions.find((c) => c.id === activeCompanionId) ??
			data.archivedCompanions?.find((c) => c.id === activeCompanionId) ??
			null
	);

	let searchOpen = $state(false);

	// ---- Navigation menu -------------------------------------------------
	// Closed by default so the content gets the whole screen; the hamburger
	// opens it over the page and choosing a destination closes it again. On
	// wide screens it can be pinned open beside the content (remembered per
	// browser).
	const PIN_KEY = 'amp.menuPinned';
	let menuOpen = $state(false);
	let pinPreference = $state(false);
	const WIDE_QUERY = '(min-width: 1024px)';
	let wide = $state(browser && window.matchMedia(WIDE_QUERY).matches);
	let docked = $derived(pinPreference && wide);

	if (browser) {
		try {
			pinPreference = localStorage.getItem(PIN_KEY) === '1';
		} catch {
			/* storage unavailable: default (unpinned) */
		}
	}

	// Follow the window crossing the wide-screen breakpoint.
	$effect(() => {
		const mq = window.matchMedia(WIDE_QUERY);
		const onChange = (e: MediaQueryListEvent) => (wide = e.matches);
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	function togglePin() {
		pinPreference = !pinPreference;
		menuOpen = false;
		try {
			localStorage.setItem(PIN_KEY, pinPreference ? '1' : '0');
		} catch {
			/* not persisted; fine */
		}
	}

	let drawerEl = $state<HTMLElement | null>(null);
	let returnFocus: HTMLElement | null = null;

	async function openMenu() {
		returnFocus = document.activeElement as HTMLElement | null;
		menuOpen = true;
		await tick();
		drawerEl?.querySelector<HTMLElement>('[aria-current="page"], a, button')?.focus();
	}

	function closeMenu() {
		if (!menuOpen) return;
		menuOpen = false;
		returnFocus?.focus();
	}

	afterNavigate(() => {
		menuOpen = false;
	});

	// No page scroll behind the open overlay menu.
	$effect(() => {
		if (!browser) return;
		document.documentElement.style.overflow = menuOpen && !docked ? 'hidden' : '';
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && menuOpen) {
			closeMenu();
			return;
		}
		if (!(e.ctrlKey || e.metaKey) || e.key !== 'k' || e.defaultPrevented) return;
		const tgt = e.target as HTMLElement;
		if (
			tgt instanceof HTMLInputElement ||
			tgt instanceof HTMLTextAreaElement ||
			tgt.isContentEditable
		)
			return;
		e.preventDefault();
		searchOpen = true;
	}}
/>

<div class="min-h-screen bg-background">
	{#if docked}
		<!-- Pinned: a fixed column beside the content. -->
		<div
			id="app-nav"
			class="fixed bottom-0 left-0 z-30 border-r border-border"
			style="top: var(--demo-bar-h, 0px)"
		>
			<AppNavDrawer
				companions={data.companions}
				{activeCompanion}
				user={data.user}
				companionStatus={data.companionStatus}
				pinned
				onTogglePin={togglePin}
				onClose={closeMenu}
			/>
		</div>
	{:else if menuOpen}
		<!-- Overlay: slides in over the page. -->
		<button
			type="button"
			class="drawer-backdrop fixed inset-0 z-40 cursor-default"
			aria-label={t(locale, 'nav.closeMenu')}
			tabindex="-1"
			onclick={closeMenu}
		></button>
		<div
			id="app-nav"
			bind:this={drawerEl}
			class="drawer fixed bottom-0 left-0 z-50 shadow-2xl"
			style="top: var(--demo-bar-h, 0px)"
			role="dialog"
			aria-modal="true"
			aria-label={t(locale, 'aria.mainNav')}
		>
			<AppNavDrawer
				companions={data.companions}
				{activeCompanion}
				user={data.user}
				companionStatus={data.companionStatus}
				pinned={false}
				onTogglePin={togglePin}
				onClose={closeMenu}
			/>
		</div>
	{/if}

	<div class="flex min-h-screen min-w-0 flex-col" class:pl-72={docked}>
		<AppTopBar
			{activeCompanion}
			user={data.user}
			today={data.today}
			{menuOpen}
			menuPinned={docked}
			onToggleMenu={() => (menuOpen ? closeMenu() : openMenu())}
			onOpenSearch={() => (searchOpen = true)}
		/>

		<main
			class="mx-auto w-full min-w-0 max-w-7xl flex-1 animate-fade-in px-4 py-6 sm:px-6 lg:px-10 lg:py-8"
		>
			{@render children()}
		</main>

		<AppFooter version={data.version} year={data.year} />
	</div>
</div>

<ToastRegion ariaLabel={t(locale, 'common.reminder.toastAriaRegion')} />

<SearchPalette
	bind:open={searchOpen}
	companions={data.companions.map((c) => ({ id: c.id, name: c.name }))}
/>

<style>
	.drawer-backdrop {
		background: rgb(15 10 30 / 0.45);
		animation: fade 0.18s ease-out;
	}
	.drawer {
		animation: slide 0.22s cubic-bezier(0.16, 1, 0.3, 1);
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	@keyframes slide {
		from {
			transform: translateX(-100%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.drawer,
		.drawer-backdrop {
			animation: none;
		}
	}
</style>
