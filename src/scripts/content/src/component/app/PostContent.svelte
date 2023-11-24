<script>
	export let currentPost;

	let showContent = false;
</script>

{#if currentPost}
	<div class="post_content_container">
		<div class="post_title">
			{currentPost.title}
		</div>
		<div class="post_body">
			<div class="post_nav">
				<div class="subreddit_img">
					<img src={currentPost.subredditImgUrl} alt="Subreddit Icon" />
				</div>
				<div class="subreddit_info">
					<a class="subreddit_name" href={currentPost.subreddit}>
						{currentPost.subreddit}
					</a>
					<div class="to_me">To: me</div>
				</div>
				<div class="util">
					<div class="actions">
						<div class="action_btn">
							<svg viewBox="0 0 24 24"
								><path
									d="M9.277 16.221a.75.75 0 0 1-1.061 1.06l-4.997-5.003a.75.75 0 0 1 0-1.06L8.217 6.22a.75.75 0 0 1 1.061 1.06L5.557 11h7.842c1.595 0 2.81.242 3.889.764l.246.126a6.203 6.203 0 0 1 2.576 2.576c.61 1.14.89 2.418.89 4.135a.75.75 0 0 1-1.5 0c0-1.484-.228-2.52-.713-3.428a4.702 4.702 0 0 0-1.96-1.96c-.838-.448-1.786-.676-3.094-.709L13.4 12.5H5.562l3.715 3.721Z"
								/></svg
							>
						</div>
						<div class="action_btn">
							<svg viewBox="0 0 24 24"
								><path
									d="M13.277 16.221a.75.75 0 0 1-1.061 1.06l-4.997-5.003a.75.75 0 0 1 0-1.06l4.997-4.998a.75.75 0 0 1 1.061 1.06L9.557 11h3.842c1.595 0 2.81.242 3.889.764l.246.126a6.203 6.203 0 0 1 2.576 2.576c.61 1.14.89 2.418.89 4.135a.75.75 0 0 1-1.5 0c0-1.484-.228-2.52-.713-3.428a4.702 4.702 0 0 0-1.96-1.96c-.838-.448-1.786-.676-3.094-.709L13.4 12.5H9.562l3.715 3.721Zm-4-10.001a.75.75 0 0 1 0 1.06L4.81 11.748l4.467 4.473a.75.75 0 0 1-1.061 1.06l-4.997-5.003a.75.75 0 0 1 0-1.06L8.217 6.22a.75.75 0 0 1 1.06 0Z"
								/></svg
							>
						</div>
						<div class="action_btn">
							<svg viewBox="0 0 24 24"
								><path
									d="M14.723 16.221a.75.75 0 0 0 1.061 1.06l4.997-5.003a.75.75 0 0 0 0-1.06L15.783 6.22a.75.75 0 0 0-1.061 1.06l3.72 3.72h-7.842c-1.595 0-2.81.242-3.889.764l-.246.126a6.202 6.202 0 0 0-2.576 2.576C3.28 15.606 3 16.884 3 18.6a.75.75 0 0 0 1.5 0c0-1.484.228-2.52.713-3.428a4.702 4.702 0 0 1 1.96-1.96c.837-.448 1.786-.676 3.094-.709l.334-.004h7.837l-3.715 3.721Z"
								/></svg
							>
						</div>
						<div class="action_btn">
							<svg viewBox="0 0 24 24"
								><path
									d="M7.75 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM13.75 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM18 13.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z"
								/></svg
							>
						</div>
					</div>
					{#if currentPost.timePosted}
						<div class="time_posted">
							{currentPost.timePosted}
						</div>
					{/if}
				</div>
			</div>
			<div class="post_content">
				<button
					class="toggle_show_content_btn"
					on:click={() => {
						showContent = !showContent;
					}}
				>
					<div class="btn_icon">
						<svg viewBox="0 0 24 24"
							><path
								d="M7.75 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM13.75 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM18 13.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z"
							/></svg
						>
					</div>
				</button>
				<div class="content {showContent ? 'content_shown' : ''}">
					<iframe
						src={currentPost.postUrl}
						title={currentPost.title}
						frameBorder="0"
						sandbox="allow-same-origin allow-scripts allow-forms"
					/>
				</div>
			</div>
			<div class="post_footer">
				<div class="footer_btn">
					<div class="footer_btn_icon">
						<svg viewBox="0 0 24 24"
							><path
								d="M9.277 16.221a.75.75 0 0 1-1.061 1.06l-4.997-5.003a.75.75 0 0 1 0-1.06L8.217 6.22a.75.75 0 0 1 1.061 1.06L5.557 11h7.842c1.595 0 2.81.242 3.889.764l.246.126a6.203 6.203 0 0 1 2.576 2.576c.61 1.14.89 2.418.89 4.135a.75.75 0 0 1-1.5 0c0-1.484-.228-2.52-.713-3.428a4.702 4.702 0 0 0-1.96-1.96c-.838-.448-1.786-.676-3.094-.709L13.4 12.5H5.562l3.715 3.721Z"
							/></svg
						>
					</div>
					<div class="footer_btn_title">Reply</div>
				</div>
				<div class="footer_btn">
					<div class="footer_btn_icon">
						<svg viewBox="0 0 24 24"
							><path
								d="M14.723 16.221a.75.75 0 0 0 1.061 1.06l4.997-5.003a.75.75 0 0 0 0-1.06L15.783 6.22a.75.75 0 0 0-1.061 1.06l3.72 3.72h-7.842c-1.595 0-2.81.242-3.889.764l-.246.126a6.202 6.202 0 0 0-2.576 2.576C3.28 15.606 3 16.884 3 18.6a.75.75 0 0 0 1.5 0c0-1.484.228-2.52.713-3.428a4.702 4.702 0 0 1 1.96-1.96c.837-.448 1.786-.676 3.094-.709l.334-.004h7.837l-3.715 3.721Z"
							/></svg
						>
					</div>
					<div class="footer_btn_title">Forward</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.post_content_container {
		height: 100%;
		width: 100%;
		margin: 8px 0;

		.post_title {
			height: fit-content;
			border-radius: 4px;
			box-shadow: rgba(0, 0, 0, 0.133) 0px 1.6px 3.6px 0px, rgba(0, 0, 0, 0.11) 0px 0.3px 0.9px 0px;
			font-size: 16;
			font-weight: 600;
			padding: 16px 24px;
			background-color: white;
		}

		.post_body {
			min-height: fit-content;
			max-height: 100%;
			border: 1px solid var(--neutralTertiaryAlt);
			border-radius: 4px;
			margin: 8px 0;
			background-color: white;
			padding: 16px;

			.post_nav {
				width: 100%;
				height: 50px;
				display: flex;

				.subreddit_img {
					min-width: 40px;
					height: 40px;
					min-height: 40px;
					width: 40px;
					position: relative;
					border-radius: 50%;
					overflow: hidden;

					img {
						height: 100%;
						width: 100%;
					}
				}

				.subreddit_info {
					margin-left: 12px;
					width: 100%;

					.subreddit_name {
						font-size: 16px;
					}

					.to_me {
						cursor: pointer;
						font-size: 14px;
						font-weight: 400;
						margin-top: 4px;
						width: fit-content;
					}
				}

				.util {
					position: relative;
					top: -20%;
					height: 50px;
					width: 200px;

					.actions {
						width: 100%;
						height: 30px;
						display: flex;
						justify-content: space-around;

						.action_btn {
							height: 30px;
							width: 30px;
							cursor: pointer;

							svg {
								width: 20px;
								height: 20px;
								position: relative;
								top: 50%;
								left: 50%;
								transform: translate(-50%, -50%);

								fill: var(--themeDarkAlt);
							}

							&:hover {
								background-color: var(--themeLighterAlt);
							}
						}
					}

					.time_posted {
						font-size: 12px;
						text-align: end;
						margin-top: 4px;
					}
				}
			}

			.post_footer {
				height: 40px;
				width: 100%;
				display: flex;
				padding-left: 50px;

				.footer_btn {
					width: fit-content;
					height: fit-content;
					padding: 6px 8px;
					display: flex;
					background-color: white;
					border-radius: 4px;
					border: 1px solid var(--neutralTertiaryAlt);
					margin: 2px;
					cursor: pointer;

					&:hover {
						background-color: var(--themeLighterAlt);
					}

					.footer_btn_icon {
						width: 20px;
						height: 20px;

						svg {
							fill: var(--themePrimary);
						}
					}

					.footer_btn_title {
						width: fit-content;
						font-size: 14px;
						font-weight: 500;
						margin: 0 4px 0 8px;
					}
				}
			}

			.post_content {
				width: calc(100% - 50px);
				height: fit-content;
				margin: 10px 0 10px 50px;

				.toggle_show_content_btn {
					cursor: pointer;
					border: 1px solid var(--neutralTertiaryAlt);
					border-radius: 8px;
					padding: 0 12px;
					background-color: white;
                    height: fit-content;

					&:active {
						background-color: var(--neutralLight);
					}

					.btn_icon {
						width: 16px;
						height: 16px;
						position: relative;
						top: 50%;
						left: 50%;
						transform: translate(-50%, 0);
					}

					svg {
                        position: relative;
                        top: -10%;
						width: 100%;
						height: 100%;
					}
				}

				.content {
					width: 100%;
					margin-top: 10px;
					height: 0;

					iframe {
						height: 100%;
						width: 100%;
					}
				}

				.content_shown {
					height: 350px;
				}
			}
		}
	}
</style>
