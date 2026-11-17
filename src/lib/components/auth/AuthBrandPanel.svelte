<script lang="ts">
	import PawLogo from '$lib/components/PawLogo.svelte';
	import Ein from '$lib/components/Ein.svelte';

	let {
		tagline,
		subtext,
		footer,
		image,
		imageAlt = ''
	}: {
		tagline: string;
		subtext: string;
		footer: string;
		/** Full-bleed banner artwork shown instead of the built-in layout from md up. */
		image?: string;
		imageAlt?: string;
	} = $props();
</script>

{#if image}
	<!-- Banner artwork (wide screens). Phones keep the compact strip below. -->
	<!-- The in-flow spacer keeps the row at least as tall as the artwork, so
	     nothing is cropped. When the form beside it is taller (sign-up), the
	     cell stretches and the space under the artwork is filled with the same
	     gradient as the artwork's bottom edge, so it reads as one piece. -->
	<div class="auth-banner relative hidden overflow-hidden md:block">
		<div class="aspect-[880/930]" aria-hidden="true"></div>
		<img
			src={image}
			alt={imageAlt}
			width="880"
			height="930"
			fetchpriority="high"
			class="absolute inset-x-0 top-0 h-auto w-full"
		/>
	</div>
{/if}

<div
	class={[
		'bg-auth-brand relative flex flex-col justify-between overflow-hidden px-8 py-7 text-white md:px-11 md:py-12',
		image && 'md:hidden'
	]}
>
	<!-- Radial accent blobs -->
	<div
		class="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-20"
		style="background: radial-gradient(circle, hsl(252 100% 65%), transparent 70%);"
		aria-hidden="true"
	></div>
	<div
		class="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full opacity-15"
		style="background: radial-gradient(circle, hsl(13 100% 67%), transparent 70%);"
		aria-hidden="true"
	></div>

	<div class="relative z-10 flex items-center gap-2.5 self-start">
		<div
			class="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-lg"
			aria-hidden="true"
		>
			<PawLogo class="h-5 w-5 text-white" />
		</div>
		<span class="font-display text-xl font-extrabold tracking-tight text-white">Achei Meu Pet</span>
	</div>

	<div class="relative z-10 hidden justify-center md:flex" aria-hidden="true">
		<Ein pose="welcome" class="h-36 w-36 drop-shadow-lg" />
	</div>

	<div class="relative z-10 hidden md:block">
		<p class="font-display text-4xl font-extrabold leading-[1.03] tracking-tight">{tagline}</p>
		<p class="mt-3 max-w-[30ch] text-[15px] text-white/80">{subtext}</p>
		<div class="mt-5 flex gap-2" aria-hidden="true">
			<span class="h-2.5 w-2.5 rounded-full bg-primary"></span>
			<span class="h-2.5 w-2.5 rounded-full bg-coral"></span>
			<span class="h-2.5 w-2.5 rounded-full bg-gold"></span>
			<span class="h-2.5 w-2.5 rounded-full bg-teal"></span>
		</div>
	</div>

	<p class="relative z-10 hidden text-xs text-white/50 md:block">{footer}</p>
</div>

<style>
	/* Sampled from the bottom row of /login-banner.webp. */
	.auth-banner {
		background: linear-gradient(
			90deg,
			#6731ae 0%,
			#502799 25%,
			#4d2687 50%,
			#5b2d90 75%,
			#8838ae 100%
		);
	}
</style>
