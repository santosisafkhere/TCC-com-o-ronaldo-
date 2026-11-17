<script lang="ts">
	import { page } from '$app/state';
	import CompanionAvatar from '$lib/components/CompanionAvatar.svelte';
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
	type User = { id: string; role: 'admin' | 'member' | 'caretaker' };

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
		class="nav-item group flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors"
	>
		<Icon class="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
		<span class="truncate">{label}</span>
	</a>
{/snippet}

<nav class="flex h-full w-72 flex-col bg-card" aria-label={t(locale, 'aria.mainNav')}>
	<!-- Header: brand, pin, close -->
	<div class="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
		<a
			href="/"
			class="flex min-w-0 flex-1 items-center gap-2.5"
			aria-label={t(locale, 'aria.einvaultHome')}
		>
			<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
				<PawLogo class="h-4 w-4 text-white" />
			</span>
			<span class="font-display truncate text-[17px] font-extrabold tracking-tight text-foreground"
				>Achei Meu Pet</span
			>
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

	<div class="flex-1 overflow-y-auto px-3 py-4">
		<!-- Pets -->
		<p class="nav-heading">{t(locale, 'layout.companionsHeading')}</p>
		<ul class="space-y-0.5">
			{#if companions.length > 1}
				<li>
					<a
						href="/"
						aria-current={page.url.pathname === '/' ? 'page' : undefined}
						class="nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors"
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
						class="nav-item flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-[14px] transition-colors"
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
					class="nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors"
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
	<div class="shrink-0 space-y-0.5 border-t border-border px-3 py-3">
		{@render navLink('/settings', t(locale, 'nav.settings'), Settings)}
		<form method="POST" action="/auth/logout">
			<button
				type="submit"
				class="nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors"
			>
				<LogOut class="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
				{t(locale, 'nav.signOut')}
			</button>
		</form>
	</div>
</nav>

<style>
	.nav-heading {
		padding: 0 0.75rem 0.4rem;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: hsl(var(--muted-foreground));
	}
	.nav-item {
		position: relative;
		color: hsl(var(--muted-foreground));
	}
	.nav-item:hover {
		background: hsl(var(--accent));
		color: hsl(var(--foreground));
	}
	/* Current page: solid tint plus a short bar on the left edge. */
	.nav-item[aria-current='page'] {
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--foreground));
		font-weight: 600;
	}
	.nav-item[aria-current='page']::before {
		content: '';
		position: absolute;
		left: -0.75rem;
		top: 0.45rem;
		bottom: 0.45rem;
		width: 3px;
		border-radius: 0 3px 3px 0;
		background: hsl(var(--primary));
	}
	.nav-item[aria-current='page'] :global(svg) {
		color: hsl(var(--primary));
	}
	.is-current-pet {
		color: hsl(var(--foreground));
	}
	.icon-btn {
		display: flex;
		height: 2.25rem;
		width: 2.25rem;
		align-items: center;
		justify-content: center;
		border-radius: 0.6rem;
		color: hsl(var(--muted-foreground));
	}
	.icon-btn:hover {
		background: hsl(var(--accent));
		color: hsl(var(--foreground));
	}
	.icon-btn:focus-visible,
	.nav-item:focus-visible {
		outline: 2px solid hsl(var(--primary));
		outline-offset: 1px;
	}
</style>
