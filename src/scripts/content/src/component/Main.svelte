<script>
	import { initExtensionState, initStorageEventListener } from '../lib/storage/browser';
	import { extensionEnabled } from '../lib/store/stores';
	import MainApp from './app/MainApp.svelte';
	import Background from './background/Background.svelte';

	export let rootId;
	let currentPath = '';
	let windowScrollY;

	const initAppState = async () => {
		await initStorageEventListener();
		await initExtensionState();
	};

	const toggleSiteVisibilityState = (visible) => {
		if (!visible) {
			for (let i = 0; i < document.body.children.length; i++) {
				if (document.body.children[i].id !== rootId) {
					document.body.children[i].style.position = 'relative';
					document.body.children[i].style.zIndex = '-999';
				}
			}
		} else {
			for (let i = 0; i < document.body.children.length; i++) {
				if (document.body.children[i].id !== rootId) {
					document.body.children[i].style.position = null;
					document.body.children[i].style.zIndex = null;
				}
			}
			document.querySelector('html').style.overflow = null;
			currentPath = window.location.pathname;
		}
	};

	$: initAppState();

	$: toggleSiteVisibilityState(!$extensionEnabled);
</script>

<svelte:window bind:scrollY={windowScrollY} />

{#if $extensionEnabled}
	<Background>
		<MainApp bind:windowScrollY {currentPath} />
	</Background>
{/if}
