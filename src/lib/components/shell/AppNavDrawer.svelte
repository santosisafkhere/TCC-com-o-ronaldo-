<script lang="ts">
	import { page } from '$app/state';
	import CompanionAvatar from '$lib/components/CompanionAvatar.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import PawLogo from '$lib/components/PawLogo.svelte';
	import {
		House,
		NotebookPen,
		HeartPulse,
		Bell,
		FileText,
		LayoutGrid,
		Plus,
		Pencil,
		Settings,
		Users,
		Archive,
		LogOut,
		Pin,
		PinOff,
		X
	} from '@lucide/svelte';
	import { t, getLocale } from '$lib/i18n';
	import type { CareStatus } from '$lib/careStatus';

	type Companion = { id: string; name: string; avatarPath?: string | null };
	type User = {
		id: string;
		displayName: string;
		role: 'admin' | 'member' | 'caretaker';
		avatarPath?: string | null;
	};

	interface Props {
		companions: Companion[];
		activeCompanion: Companion | null;
		user: User | null;
		companionStatus: Record<string, CareStatus>;
		/** Docked beside the content (wide screens) instead of floating over it. */
		pinned: boolean;
		onTogglePin: () => void;
		onClose: () => void;
	}

	let { companions, activeCompanion, user, companionStatus, pinned, onTogglePin, onClose }: Props =
		$props();

	const locale = getLocale();

	let sections = $derived(
		activeCompanion
			? [
					{ href: `/${activeCompanion.id}`, label: t(locale, 'nav.dashboard'), icon: House },
					{
						href: `/${activeCompanion.id}/journal`,
						label: t(locale, 'nav.journal'),
						icon: NotebookPen
					},
					{
						href: `/${activeCompanion.id}/health`,
						label: t(locale, 'nav.health'),
						icon: HeartPulse
					},
					{
						href: `/${activeCompanion.id}/reminders`,
						label: t(locale, 'nav.reminders'),
						icon: Bell
					},
					{
						href: `/${activeCompanion.id}/documents`,
						label: t(locale, 'nav.documents'),
						icon: FileText
					},
					{
						href: `/companions/${activeCompanion.id}/edit`,
						label: t(locale, 'nav.editCompanion'),
						icon: Pencil
					}
				]
			: []
	);

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (activeCompanion && href === `/${activeCompanion.id}`) return path === href;
		return path === href || path.startsWith(href + '/');
	}

	function dot(id: string): string {
		const s = companionStatus[id] ?? 'up-to-date';
		if (s === 'needs-attention') return 'bg-coral';
		if (s === 'due-today') return 'bg-gold';
		return 'bg-teal';
	}

	function dotTitle(id: string): string {
		const s = companionStatus[id] ?? 'up-to-date';
		if (s === 'needs-attention') return t(locale, 'overview.careStatus.needsAttention');
		if (s === 'due-today') return t(locale, 'overview.careStatus.dueToday');
		return t(locale, 'overview.careStatus.upToDate');
	}
</script>

{#snippet navLink(href: string, label: string, Icon: typeof House)}
	<a
		{href}
		aria-current={isActive(href) ? 'page' : undefined}
		class="nav-item group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] transition-colors"
	>
		<Icon class="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
		<span class="truncate">{label}</span>
	</a>
{/snippet}

<nav
	class="drawer-panel relative flex h-full w-72 flex-col overflow-hidden"
	aria-label={t(locale, 'aria.mainNav')}
>
	<!-- Header: brand, pin, close -->
	<div class="flex h-20 shrink-0 items-center gap-2 px-4">
		<a
			href="/"
			class="flex min-w-0 flex-1 items-center gap-2.5"
			aria-label={t(locale, 'aria.einvaultHome')}
		>
			<span class="brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
				<PawLogo class="h-5 w-5 text-white" />
			</span>
			<span class="flex min-w-0 flex-col">
				<span class="font-display truncate text-[19px] font-extrabold tracking-tight text-white"
					>Achei Meu Pet</span
				>
				<svg class="mt-0.5 h-2 w-24" viewBox="0 0 96 8" aria-hidden="true"
					><path
						d="M4 6 C 34 0, 62 0, 92 4"
						stroke="#a46bf5"
						stroke-width="3"
						fill="none"
						stroke-linecap="round"
					/></svg
				>
			</span>
		</a>
		<button
			type="button"
			onclick={onTogglePin}
			class="icon-btn hidden lg:flex"
			aria-pressed={pinned}
			aria-label={pinned ? t(locale, 'nav.unpinMenu') : t(locale, 'nav.pinMenu')}
			title={pinned ? t(locale, 'nav.unpinMenu') : t(locale, 'nav.pinMenu')}
		>
			{#if pinned}<PinOff class="h-4 w-4" />{:else}<Pin class="h-4 w-4" />{/if}
		</button>
		{#if !pinned}
			<button
				type="button"
				onclick={onClose}
				class="icon-btn"
				aria-label={t(locale, 'nav.closeMenu')}
			>
				<X class="h-5 w-5" />
			</button>
		{/if}
	</div>

	<div class="relative z-10 flex-1 overflow-y-auto px-3 py-2">
		<!-- Pets -->
		<p class="nav-heading">{t(locale, 'layout.companionsHeading')}</p>
		<ul class="space-y-0.5">
			{#if companions.length > 1}
				<li>
					<a
						href="/"
						aria-current={page.url.pathname === '/' ? 'page' : undefined}
						class="nav-item flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] transition-colors"
					>
						<LayoutGrid class="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
						{t(locale, 'nav.overview')}
					</a>
				</li>
			{/if}
			{#each companions as c (c.id)}
				<li>
					<a
						href="/{c.id}"
						aria-current={activeCompanion?.id === c.id && page.url.pathname === `/${c.id}`
							? 'page'
							: undefined}
						class="nav-item flex items-center gap-3 rounded-xl px-2.5 py-2 text-[15px] transition-colors"
						class:is-current-pet={activeCompanion?.id === c.id}
					>
						<CompanionAvatar companionId={c.id} avatarPath={c.avatarPath} name={c.name} size="sm" />
						<span class="min-w-0 flex-1 truncate">{c.name}</span>
						<span class="h-2 w-2 shrink-0 rounded-full {dot(c.id)}" title={dotTitle(c.id)}></span>
					</a>
				</li>
			{/each}
			<li>
				<a
					href="/companions/new"
					class="nav-item flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] transition-colors"
					aria-current={page.url.pathname === '/companions/new' ? 'page' : undefined}
				>
					<Plus class="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
					{companions.length
						? t(locale, 'layout.addCompanion')
						: t(locale, 'layout.addFirstCompanion')}
				</a>
			</li>
		</ul>

		<!-- Sections of the open pet -->
		{#if activeCompanion}
			<p class="nav-heading mt-6">{activeCompanion.name}</p>
			<ul class="space-y-0.5">
				{#each sections as s (s.href)}
					<li>{@render navLink(s.href, s.label, s.icon)}</li>
				{/each}
			</ul>
		{/if}

		<!-- Administration -->
		{#if user?.role === 'admin'}
			<p class="nav-heading mt-6">{t(locale, 'nav.admin')}</p>
			<ul class="space-y-0.5">
				<li>{@render navLink('/admin/users', t(locale, 'nav.members'), Users)}</li>
				<li>{@render navLink('/admin/companions', t(locale, 'nav.adminCompanions'), Archive)}</li>
			</ul>
		{/if}
	</div>

	<!-- Footer: settings and sign out -->
	<!-- Decoration: a big soft paw and the orange-to-violet wave of the brand art -->
	<PawLogo
		class="paw-deco pointer-events-none absolute bottom-40 left-1/2 h-20 w-20 -translate-x-1/2"
	/>
	<svg
		class="pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full"
		viewBox="0 0 288 224"
		preserveAspectRatio="none"
		aria-hidden="true"
	>
		<defs>
			<linearGradient id="nav-wave" x1="0" x2="1" y1="0" y2="0">
				<stop offset="0" stop-color="#ff9a3c" />
				<stop offset="0.5" stop-color="#c04ef0" />
				<stop offset="1" stop-color="#7c3aed" />
			</linearGradient>
		</defs>
		<path
			d="M0 64 C 70 30, 170 30, 288 74 L288 90 C 170 50, 80 52, 0 84 Z"
			fill="url(#nav-wave)"
			opacity="0.9"
		/>
		<path d="M0 84 C 80 52, 170 50, 288 90 L288 224 L0 224 Z" fill="#3a1670" />
	</svg>

	<div class="relative z-10 shrink-0 space-y-0.5 px-3 pb-3 pt-2">
		{#if user}
			<div class="mb-1 flex items-center gap-3 rounded-xl px-2 py-2">
				<UserAvatar
					userId={user.id}
					displayName={user.displayName}
					avatarPath={user.avatarPath}
					size="md"
				/>
				<div class="min-w-0">
					<p class="truncate text-[15px] font-semibold text-white">{user.displayName}</p>
					<p class="text-xs text-white/60">{t(locale, `enum.role.${user.role}`)}</p>
				</div>
			</div>
		{/if}
		{@render navLink('/settings', t(locale, 'nav.settings'), Settings)}
		<form method="POST" action="/auth/logout">
			<button
				type="submit"
				class="nav-item flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] transition-colors"
			>
				<LogOut class="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
				{t(locale, 'nav.signOut')}
			</button>
		</form>
	</div>
</nav>

<style>
	/* Deep violet panel from the brand art. Fixed colors on purpose: the menu
	   looks the same in light and dark mode. */
	.drawer-panel {
		background: linear-gradient(180deg, #2f1257 0%, #301358 55%, #2f1354 100%);
		color: rgb(255 255 255 / 0.78);
	}
	.brand-mark {
		background: linear-gradient(135deg, #b44cf0 0%, #ff6b6b 100%);
		box-shadow: 0 8px 20px -8px rgb(255 107 107 / 0.6);
	}
	.nav-heading {
		padding: 0.9rem 0.75rem 0.45rem;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgb(255 255 255 / 0.55);
	}
	.nav-item {
		position: relative;
		color: rgb(255 255 255 / 0.82);
		border-radius: 0.85rem;
	}
	.nav-item:hover {
		background: rgb(255 255 255 / 0.08);
		color: #fff;
	}
	/* Current page: the bright violet pill of the mockup. */
	.nav-item[aria-current='page'] {
		background: linear-gradient(90deg, #8b2ff0 0%, #9d4cf5 100%);
		color: #fff;
		font-weight: 600;
		box-shadow: 0 10px 22px -12px #9d4cf5;
	}
	.nav-item[aria-current='page'] :global(svg) {
		color: #fff;
	}
	.is-current-pet {
		color: #fff;
		background: rgb(255 255 255 / 0.06);
	}
	:global(.paw-deco) {
		color: #8b4fe0;
		opacity: 0.55;
	}
	.icon-btn {
		display: flex;
		height: 2.25rem;
		width: 2.25rem;
		align-items: center;
		justify-content: center;
		border-radius: 0.6rem;
		color: rgb(255 255 255 / 0.7);
	}
	.icon-btn:hover {
		background: rgb(255 255 255 / 0.1);
		color: #fff;
	}
	.icon-btn:focus-visible,
	.nav-item:focus-visible {
		outline: 2px solid #ffc533;
		outline-offset: 1px;
	}
</style>
