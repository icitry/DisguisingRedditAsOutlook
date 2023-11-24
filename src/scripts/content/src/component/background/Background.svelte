<script>
	import Header from './Header.svelte';
	import MainAppBackground from './MainAppBackground.svelte';
	import NavigationPane from './NavigationPane.svelte';
	import Ribbon from './Ribbon.svelte';
	import Sidebar from './Sidebar.svelte';
	let userInitials = 'JD';
</script>

<div class="background">
	<Header bind:userInitials />
	<Sidebar />
	<MainAppBackground>
		<Ribbon />
		<div class="main_module">
			<NavigationPane />
			<slot />
		</div>
	</MainAppBackground>
</div>

<style lang="scss">
	.background {
		font-family: 'Segoe UI', 'Segoe UI Web (West European)', 'Segoe UI', -apple-system,
			BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
		color: black;
		width: 100%;
		height: 100%;
		overflow-y: hidden;
		overflow-x: hidden;
		position: fixed;
		left: 0;
		top: 0;
		background-color: var(--whiteTranslucent90);
		display: flex;
	}

	.main_module {
		display: flex;
		width: 100%;
		height: 100%;
	}
</style>
