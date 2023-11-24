<script>
	import { convertPercentToWindowY, getScrollPercent } from '../../lib/dom/scroll';
	import PostCard from './PostCard.svelte';

	export let windowScrollY;
	export let currentPost;
	export let currentPath;

	const pathRegex = new RegExp('^(/r/[0-9a-zA-Z_]+(/)?)$');

	let listContainer;
	let posts = [];

	let authViewObserver;
	let anonViewObserver;
	const config = { childList: true, subtree: true };

	const parsePostInfoToList = (postNode) => {
		if (!postNode) return;
		if (typeof postNode.querySelector !== 'function') return;

		let postId = posts.length;

		let subreddit;
		let subredditImgUrl;

		if (pathRegex.test(currentPath)) {
			subreddit = currentPath;
			subredditImgUrl = document.body
				.querySelector('#AppRouter-main-content')
				?.querySelector('img')
				?.getAttribute('src');
		} else {
			subreddit = postNode.querySelector(`[data-click-id*="subreddit"]`);
			subredditImgUrl = subreddit?.querySelector('img')?.getAttribute('src');
			subreddit = subreddit?.getAttribute('href');

			if (!subreddit) {
				subreddit = postNode.querySelector(`[data-post-click-location*="subreddit-link"]`);
				subredditImgUrl = subreddit?.querySelector('faceplate-img')?.getAttribute('src');
				subreddit = subreddit?.querySelector('a')?.getAttribute('href');
			}
		}

		if (!subreddit) return;

		let body = postNode.querySelector(`[data-click-id*="body"]`);
		let bodyUrl = body?.getAttribute('href');
		let title = body?.textContent;

		if (!bodyUrl || !title) {
			title = postNode.querySelector(`[slot*="title"]`)?.textContent;
			bodyUrl = postNode.querySelector(`[slot*="full-post-link"]`)?.getAttribute('href');
		}

		if (!bodyUrl || !title) return;

		let timePosted = postNode.querySelector(`[data-click-id*="timestamp"]`)?.textContent;

		if (!timePosted) {
			timePosted = postNode.querySelector('faceplate-timeago time')?.textContent;
		}

		posts = [
			...posts,
			{
				id: postId,
				title: title,
				subreddit: subreddit,
				subredditImgUrl: subredditImgUrl,
				postSelected: false,
				postUrl: bodyUrl,
				timePosted: timePosted
			}
		];
	};

	const postAddedCallback = (mutationsList, observer) => {
		for (const mutation of mutationsList) {
			if (mutation.type === 'childList') {
				mutation.addedNodes.forEach((node) => {
					parsePostInfoToList(node);
				});
			}
		}
	};

	const syncScrolls = () => {
		let postListScrollPercent = getScrollPercent(listContainer);
		windowScrollY = convertPercentToWindowY(postListScrollPercent);
	};

	const selectPostCallback = (postData) => {
		currentPost = postData.postSelected ? null : postData;
		for (var i = 0; i < posts.length; i++) {
			if (posts[i].id === currentPost?.id) {
				posts[i].postSelected = true;
			} else {
				posts[i].postSelected = false;
			}
		}
	};

	$: {
		let nodes = document.querySelectorAll(`[data-testid*="post-container"]`);
		if (!nodes || nodes.length < 1) nodes = document.querySelectorAll('shreddit-post');

		nodes.forEach((node) => {
			parsePostInfoToList(node);
		});

		authViewObserver = new MutationObserver(postAddedCallback);
		authViewObserver.observe(document, config);
	}

	$: if(posts.length < 7) {
		windowScrollY = convertPercentToWindowY(99);
	}
</script>

<div
	class="posts_list"
	bind:this={listContainer}
	on:scroll={() => {
		syncScrolls();
	}}
>
	{#each posts as post}
		<PostCard postData={post} {selectPostCallback} />
	{/each}
</div>

<style lang="scss">
	::-webkit-scrollbar {
		width: 12px;
	}

	::-webkit-scrollbar-thumb {
		background: var(--neutralTertiaryAlt);
		border: 3px solid transparent;
		border-radius: 9px;
		background-clip: content-box;

		&:hover {
			background: var(--neutralSecondaryAlt);
			border: 3px solid transparent;
			border-radius: 9px;
			background-clip: content-box;
		}
	}

	::-webkit-scrollbar-button:single-button {
		width: 12px;
		display: block;
		background-size: 10px;
		background-repeat: no-repeat;
	}

	/* Up */
	::-webkit-scrollbar-button:single-button:vertical:decrement {
		height: 12px;
		width: 12px;
		background-position: center 4px;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='rgb(224, 224, 224)'><polygon points='50,00 0,50 100,50'/></svg>");
	}

	::-webkit-scrollbar-button:single-button:vertical:decrement:hover {
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='rgb(166, 166, 166)'><polygon points='50,00 0,50 100,50'/></svg>");
	}

	::-webkit-scrollbar-button:single-button:vertical:decrement:active {
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='rgb(166, 166, 166)'><polygon points='50,00 0,50 100,50'/></svg>");
	}

	/* Down */
	::-webkit-scrollbar-button:single-button:vertical:increment {
		height: 12px;
		width: 22px;
		background-position: center 2px;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='rgb(224, 224, 224)'><polygon points='0,0 100,0 50,50'/></svg>");
	}

	::-webkit-scrollbar-button:single-button:vertical:increment:hover {
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='rgb(166, 166, 166)'><polygon points='0,0 100,0 50,50'/></svg>");
	}

	::-webkit-scrollbar-button:single-button:vertical:increment:active {
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='rgb(166, 166, 166)'><polygon points='0,0 100,0 50,50'/></svg>");
	}

	.posts_list {
		width: 100%;
		height: 100%;
		overflow-y: scroll;
		overflow-x: hidden;
		background-color: var(--neutralSecondarySurface);
	}
</style>
