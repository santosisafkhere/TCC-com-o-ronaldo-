<script lang="ts">
	import { page } from '$app/state';
	import CompanionAvatar from '$lib/components/CompanionAvatar.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import PawLogo from '$lib/components/PawLogo.svelte';
	import AccountSheet from './AccountSheet.svelte';
	import {
		Menu,
		Search,
		Plus,
		ChevronRight,
		BookOpen,
		Activity,
		Bell,
		Weight
	} from '@lucide/svelte';
	import { t, getLocale } from '$lib/i18n';
	import { currentFabSection, orderFabActions } from '$lib/nav/fabSections';

	type Companion = { id: string; name: string; avatarPath?: string | null };
	type User = {
		id: string;
		displayName: string;
		role: 'admin' | 'member' | 'caretaker';
		avatarPath?: string | null;
	};

	interface Props {
		activeCompanion: Companion | null;
		user: User | null;
		today: string;
		menuOpen: boolean;
		/** When the menu is docked the brand already shows in it. */
		menuPinned: boolean;
		onToggleMenu: () => void;
		onOpenSearch: () => void;
	}

	let { activeCompanion, user, today, menuOpen, menuPinned, onToggleMenu, onOpenSearch }: Props =
		$props();

	const locale = getLocale();

	let accountOpen = $state(false);
	let addOpen = $state(false);

	$effect(() => {
		page.url.pathname; // close popovers on navigation
		accountOpen = false;
		addOpen = false;
	});

	// Name of the screen being shown, for the breadcrumb.
	let section = $derived.by(() => {
		const path = page.url.pathname;
		const parts = path.split('/').filter(Boolean);
		if (path === '/') return t(locale, 'nav.overview');
		if (path === '/settings') return t(locale, 'nav.settings');
		if (path === '/admin/users') return t(locale, 'nav.members');
		if (path === '/admin/companions') return t(locale, 'nav.adminCompanions');
		if (path === '/companions/new') return t(locale, 'layout.addCompanion');
		if (parts[0] === 'companions' && parts[2] === 'edit') return t(locale, 'nav.editCompanion');
		if (activeCompanion && parts[0] === activeCompanion.id) {
			const map: Record<string, string> = {
				journal: t(locale, 'nav.journal'),
				health: t(locale, 'nav.health'),
				reminders: t(locale, 'nav.reminders'),
				documents: t(locale, 'nav.documents')
			};
			return parts[1] ? (map[parts[1]] ?? '') : t(locale, 'nav.dashboard');
		}
		return '';
	});

	const ADD_ICONS = {
		journal: BookOpen,
		health: Activity,
		reminders: Bell,
		weight: Weight
	} as const;

	let addActions = $derived(
		activeCompanion
			? orderFabActions(
					[
						{
							key: 'journal',
							href: `/${activeCompanion.id}/journal/${today}`,
							label: t(locale, 'nav.fab.addJournal')
						},
						{
							key: 'health',
							href: `/${activeCompanion.id}/health?new=1`,
							label: t(locale, 'nav.fab.logHealth')
						},
						{
							key: 'reminders',
							href: `/${activeCompanion.id}/reminders?new=1`,
							label: t(locale, 'nav.fab.addReminder')
						},
						{
							key: 'weight',
							href: `/${activeCompanion.id}/health?new=weight`,
							label: t(locale, 'nav.fab.recordWeight')
						}
					],
					currentFabSection(page.url.pathname)
				)
			: []
	);
</script>

<header class="topbar sticky z-30 border-b border-border" style="top: var(--demo-bar-h, 0px)">
	<div class="flex h-16 items-center gap-2 px-3 sm:px-5">
		{#if !menuPinned}
			<button
				type="button"
				onclick={onToggleMenu}
				class="tb-btn"
				aria-label={t(locale, 'nav.openMenu')}
				aria-expanded={menuOpen}
				aria-controls="app-nav"
			>
				<Menu class="h-5 w-5" />
			</button>
			<a
				href="/"
				class="mr-1 hidden items-center gap-2 sm:flex"
				aria-label={t(locale, 'aria.einvaultHome')}
			>
				<span class="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
					<PawLogo class="h-3.5 w-3.5 text-white" />
				</span>
				<span class="font-display text-[15px] font-extrabold tracking-tight text-foreground"
					>Achei Meu Pet</span
				>
			</a>
		{/if}

		<!-- Where am I: pet and screen -->
		<div class="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
			{#if !menuPinned}<span class="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true"
				></span>{/if}
			{#if activeCompanion}
				<a
					href="/{activeCompanion.id}"
					class="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-accent"
				>
					<CompanionAvatar
						companionId={activeCompanion.id}
						avatarPath={activeCompanion.avatarPath}
						name={activeCompanion.name}
						size="sm"
					/>
					<span class="truncate font-semibold text-foreground">{activeCompanion.name}</span>
				</a>
				{#if section}
					<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground/70" />
					<span class="truncate text-muted-foreground">{section}</span>
				{/if}
			{:else if section}
				<span class="truncate px-1.5 font-semibold text-foreground">{section}</span>
			{/if}
		</div>

		<!-- Quick add for the open pet -->
		{#if activeCompanion}
			<div class="relative">
				<button
					type="button"
					class="tb-btn tb-btn-primary"
					aria-label={t(locale, 'nav.fab.quickAdd')}
					aria-expanded={addOpen}
					aria-haspopup="menu"
					onclick={() => {
						addOpen = !addOpen;
						accountOpen = false;
					}}
				>
					<Plus class="h-5 w-5" />
					<span class="hidden pr-1 text-sm font-semibold md:inline">{t(locale, 'nav.add')}</span>
				</button>
				{#if addOpen}
					<button
						type="button"
						class="fixed inset-0 z-40 cursor-default"
						aria-hidden="true"
						tabindex="-1"
						onclick={() => (addOpen = false)}
					></button>
					<div
						role="menu"
						tabindex="-1"
						class="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover py-1.5 shadow-xl"
						onkeydown={(e) => e.key === 'Escape' && (addOpen = false)}
					>
						{#each addActions as a (a.key)}
							{@const Icon = ADD_ICONS[a.key as keyof typeof ADD_ICONS]}
							<a
								role="menuitem"
								href={a.href}
								class="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent"
							>
								<Icon
									class="h-4 w-4 shrink-0 {a.highlight ? 'text-primary' : 'text-muted-foreground'}"
								/>
								{a.label}
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<button
			type="button"
			onclick={onOpenSearch}
			class="tb-btn"
			aria-label={t(locale, 'aria.openSearch')}
		>
			<Search class="h-5 w-5" />
			<kbd
				class="ml-1 hidden h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground lg:inline-flex"
				aria-hidden="true">Ctrl K</kbd
			>
		</button>

		{#if user}
			<div class="relative">
				<button
					type="button"
					class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent"
					aria-haspopup="dialog"
					aria-expanded={accountOpen}
					aria-label={t(locale, 'aria.accountMenu')}
					onclick={() => {
						accountOpen = !accountOpen;
						addOpen = false;
					}}
				>
					<UserAvatar
						userId={user.id}
						displayName={user.displayName}
						avatarPath={user.avatarPath}
						size="sm"
					/>
				</button>
				<AccountSheet
					{user}
					open={accountOpen}
					onclose={() => (accountOpen = false)}
					variant="dropdown"
				/>
			</div>
		{/if}
	</div>
</header>

<style>
	.topbar {
		background: hsl(var(--background) / 0.85);
		backdrop-filter: blur(10px);
	}
	.tb-btn {
		display: inline-flex;
		height: 2.5rem;
		min-width: 2.5rem;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		border-radius: 0.65rem;
		padding: 0 0.5rem;
		color: hsl(var(--muted-foreground));
		transition:
			background-color 0.15s,
			color 0.15s;
	}
	.tb-btn:hover {
		background: hsl(var(--accent));
		color: hsl(var(--foreground));
	}
	.tb-btn:focus-visible {
		outline: 2px solid hsl(var(--primary));
		outline-offset: 2px;
	}
	.tb-btn-primary {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		padding: 0 0.6rem;
	}
	.tb-btn-primary:hover {
		background: hsl(var(--primary) / 0.9);
		color: hsl(var(--primary-foreground));
	}
</style>
