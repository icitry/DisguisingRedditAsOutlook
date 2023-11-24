<script>
	export let postData;
	export let selectPostCallback;
</script>

{#if postData}
	<div
		class="post_card_container {postData?.postSelected ? 'post_selected' : 'post_unselected'}"
		on:click={() => {
			selectPostCallback(postData);
		}}
	>
		<div class="select_post_util">
			<div class="select_check" />
		</div>
		<div class="post_data">
			<div class="author_data">
				{postData.subreddit}
			</div>
			<div class="post_title">
				{postData.title}
			</div>
		</div>
		<div class="delete_mail">
			<div class="delete_mail_icon">
				<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
					><path
						d="M12 1.75a3.25 3.25 0 0 1 3.245 3.066L15.25 5h5.25a.75.75 0 0 1 .102 1.493L20.5 6.5h-.796l-1.28 13.02a2.75 2.75 0 0 1-2.561 2.474l-.176.006H8.313a2.75 2.75 0 0 1-2.714-2.307l-.023-.174L4.295 6.5H3.5a.75.75 0 0 1-.743-.648L2.75 5.75a.75.75 0 0 1 .648-.743L3.5 5h5.25A3.25 3.25 0 0 1 12 1.75Zm6.197 4.75H5.802l1.267 12.872a1.25 1.25 0 0 0 1.117 1.122l.127.006h7.374c.6 0 1.109-.425 1.225-1.002l.02-.126L18.196 6.5ZM13.75 9.25a.75.75 0 0 1 .743.648L14.5 10v7a.75.75 0 0 1-1.493.102L13 17v-7a.75.75 0 0 1 .75-.75Zm-3.5 0a.75.75 0 0 1 .743.648L11 10v7a.75.75 0 0 1-1.493.102L9.5 17v-7a.75.75 0 0 1 .75-.75Zm1.75-6a1.75 1.75 0 0 0-1.744 1.606L10.25 5h3.5A1.75 1.75 0 0 0 12 3.25Z"
					/></svg
				>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.post_selected {
		background-color: var(--themeSecondarySurfaceSelected);
	}

	.post_unselected {
		background-color: white;

		.select_post_util {
			min-width: 50px;
			height: 100%;

			.select_check {
				visibility: hidden;
			}
		}

		&:hover {
			background-color: var(--neutralSecondarySurface);
		}
	}

	.post_card_container {
		position: relative;
		width: 100%;
		height: 80px;
		border-bottom: 1px solid var(--neutralTertiaryAlt);
		font-size: 14px;
		font-weight: 400;
		display: flex;

		&::before {
			content: '';
			position: absolute;
			left: 0;
			top: 0;
			height: 100%;
			width: 0;
			background-color: var(--neutralTertiaryAlt);
			transition: width 0.15s ease-in;
		}

		&:hover {
			&::before {
				width: 6px;
			}

			.select_post_util {
				.select_check {
					visibility: visible;
				}
			}

			.delete_mail {
				visibility: visible;
			}
		}

		.select_post_util {
			min-width: 50px;
			height: 100%;

			.select_check {
				width: 16px;
				height: 16px;
				border-radius: 50%;
				position: relative;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -100%);
				background-color: white;
				border: 2px var(--neutralSecondaryAlt) solid;
				cursor: pointer;
			}
		}

		.post_data {
			height: 100%;
			width: 100%;
			padding: 8px 0;
			cursor: default;

			.author_data {
				margin: 4px 0;
				height: fit-content;
				width: fit-content;
				white-space: nowrap;
				text-overflow: ellipsis;
				overflow: hidden;
				width: 250px;
				max-width: 250px;
			}

			.post_title {
				overflow: hidden;
				width: 250px;
				max-width: 250px;
				height: 50%;
				text-overflow: ellipsis;
			}
		}

		.delete_mail {
			height: 100%;
			width: 35px;
			cursor: pointer;
			visibility: hidden;

			.delete_mail_icon {
				position: relative;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				width: 18px;
				height: 18px;

				svg {
					fill: var(--neutralSecondaryAlt);
				}
			}

			&:hover {
				background-color: #ffecec;

				.delete_mail_icon {
					svg {
						fill: red;
					}
				}
			}
		}
	}
</style>
