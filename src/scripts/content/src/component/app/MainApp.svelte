<script>
	import PostContent from './PostContent.svelte';
	import PostsList from './PostsList.svelte';

	export let windowScrollY;
	export let currentPath;
	let currentPost;
</script>

<div class="main_app">
	<div class="scroll_list_container">
		<div class="container_navbar">
			<div class="left_side">
				<div class="nav_option option_active">Focused</div>
				<div class="nav_option">Other</div>
			</div>
			<div class="right_side">
				<div class="filter_btn">
					<div class="filter_icon">
						<svg viewBox="0 0 24 24"
							><path
								d="M13.5 16a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h3Zm3-5a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1 0-1.5h9Zm3-5a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1 0-1.5h15Z"
							/></svg
						>
					</div>
					<div class="title">Filter</div>
				</div>
			</div>
		</div>
		<PostsList bind:windowScrollY bind:currentPost {currentPath}/>
	</div>
	<PostContent bind:currentPost />
</div>

<style lang="scss">
	.main_app {
		width: 100%;
		height: 100%;
		margin-right: 21px;
		display: flex;
	}

	.scroll_list_container {
		box-shadow: rgba(0, 0, 0, 0.14) 0px 1px 2px 0px, rgba(0, 0, 0, 0.12) 0px 0px 2px 0px;
		width: 350px;
		margin: 8px;
		border-radius: 4px;
		height: calc(100% - 190px);
		max-height: calc(100% - 190px);

		.container_navbar {
			height: 44px;
			border-bottom: 1px solid var(--neutralTertiaryAlt);
			display: flex;
			justify-content: space-between;
			padding: 2px 8px;

			.left_side {
				height: 100%;
				width: fit-content;
				display: flex;
			}

			.right_side {
				height: 100%;
				width: fit-content;
				display: flex;
			}

			.nav_option {
				position: relative;
				top: 50%;
				transform: translate(0, -50%);
				height: 32px;
				font-size: 16px;
				cursor: pointer;
				width: fit-content;
				padding: 0 16px;
				text-align: center;
				line-height: 32px;
				border-radius: 4px;

				&:hover {
					background-color: var(--neutralLight);
				}
			}

			.option_active {
				position: relative;
				font-weight: 600;

				&::before {
					position: absolute;
					left: 50%;
					bottom: 0;
					transform: translate(-50%, 0);
					width: 60%;
					height: 3px;
					background-color: var(--themePrimary);
					z-index: 1;
					content: '';
					transition: width 0.25s ease-in-out;
				}

				&:hover::before {
					width: 80%;
				}
			}

			.filter_btn {
				display: flex;
				position: relative;
				top: 50%;
				transform: translate(0, -50%);
				height: 32px;
				cursor: pointer;
				border-radius: 4px;
				padding: 0 12px 0 4px;

				&:hover {
					background-color: var(--neutralLight);
				}

				.filter_icon {
					width: 32px;
					height: 32px;

					svg {
						position: relative;
						left: 50%;
						top: 50%;
						transform: translate(-50%, -50%);
						width: 19px;
						height: 19px;
						fill: var(--neutralPrimary);
					}
				}

				.title {
					color: var(--neutralPrimary);
					line-height: 32px;
					font-size: 14px;
				}
			}
		}
	}
</style>
