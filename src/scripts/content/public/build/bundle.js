var app = (function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	/**
	 * @template T
	 * @template S
	 * @param {T} tar
	 * @param {S} src
	 * @returns {T & S}
	 */
	function assign(tar, src) {
		// @ts-ignore
		for (const k in src) tar[k] = src[k];
		return /** @type {T & S} */ (tar);
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	let src_url_equal_anchor;

	/**
	 * @param {string} element_src
	 * @param {string} url
	 * @returns {boolean}
	 */
	function src_url_equal(element_src, url) {
		if (element_src === url) return true;
		if (!src_url_equal_anchor) {
			src_url_equal_anchor = document.createElement('a');
		}
		// This is actually faster than doing URL(..).href
		src_url_equal_anchor.href = url;
		return element_src === src_url_equal_anchor.href;
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	function subscribe(store, ...callbacks) {
		if (store == null) {
			for (const callback of callbacks) {
				callback(undefined);
			}
			return noop;
		}
		const unsub = store.subscribe(...callbacks);
		return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
	}

	/** @returns {void} */
	function component_subscribe(component, store, callback) {
		component.$$.on_destroy.push(subscribe(store, callback));
	}

	function create_slot(definition, ctx, $$scope, fn) {
		if (definition) {
			const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
			return definition[0](slot_ctx);
		}
	}

	function get_slot_context(definition, ctx, $$scope, fn) {
		return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
	}

	function get_slot_changes(definition, $$scope, dirty, fn) {
		if (definition[2] && fn) {
			const lets = definition[2](fn(dirty));
			if ($$scope.dirty === undefined) {
				return lets;
			}
			if (typeof lets === 'object') {
				const merged = [];
				const len = Math.max($$scope.dirty.length, lets.length);
				for (let i = 0; i < len; i += 1) {
					merged[i] = $$scope.dirty[i] | lets[i];
				}
				return merged;
			}
			return $$scope.dirty | lets;
		}
		return $$scope.dirty;
	}

	/** @returns {void} */
	function update_slot_base(
		slot,
		slot_definition,
		ctx,
		$$scope,
		slot_changes,
		get_slot_context_fn
	) {
		if (slot_changes) {
			const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
			slot.p(slot_context, slot_changes);
		}
	}

	/** @returns {any[] | -1} */
	function get_all_dirty_from_scope($$scope) {
		if ($$scope.ctx.length > 32) {
			const dirty = [];
			const length = $$scope.ctx.length / 32;
			for (let i = 0; i < length; i++) {
				dirty[i] = -1;
			}
			return dirty;
		}
		return -1;
	}

	/** @type {typeof globalThis} */
	const globals =
		typeof window !== 'undefined'
			? window
			: typeof globalThis !== 'undefined'
			? globalThis
			: // @ts-ignore Node typings have this
			  global;

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data(text, data) {
		data = '' + data;
		if (text.data === data) return;
		text.data = /** @type {string} */ (data);
	}

	/**
	 * @returns {void} */
	function set_input_value(input, value) {
		input.value = value == null ? '' : value;
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	/** @returns {void} */
	function add_flush_callback(fn) {
		flush_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {void} */
	function bind(component, name, callback) {
		const index = component.$$.props[name];
		if (index !== undefined) {
			component.$$.bound[index] = callback;
			callback(component.$$.ctx[index]);
		}
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	/** @returns {void} */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				const nodes = children(options.target);
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	const PUBLIC_VERSION = '4';

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	const subscriber_queue = [];

	/**
	 * Create a `Writable` store that allows both updating and reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#writable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Writable<T>}
	 */
	function writable(value, start = noop) {
		/** @type {import('./public.js').Unsubscriber} */
		let stop;
		/** @type {Set<import('./private.js').SubscribeInvalidateTuple<T>>} */
		const subscribers = new Set();
		/** @param {T} new_value
		 * @returns {void}
		 */
		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (stop) {
					// store is ready
					const run_queue = !subscriber_queue.length;
					for (const subscriber of subscribers) {
						subscriber[1]();
						subscriber_queue.push(subscriber, value);
					}
					if (run_queue) {
						for (let i = 0; i < subscriber_queue.length; i += 2) {
							subscriber_queue[i][0](subscriber_queue[i + 1]);
						}
						subscriber_queue.length = 0;
					}
				}
			}
		}

		/**
		 * @param {import('./public.js').Updater<T>} fn
		 * @returns {void}
		 */
		function update(fn) {
			set(fn(value));
		}

		/**
		 * @param {import('./public.js').Subscriber<T>} run
		 * @param {import('./private.js').Invalidator<T>} [invalidate]
		 * @returns {import('./public.js').Unsubscriber}
		 */
		function subscribe(run, invalidate = noop) {
			/** @type {import('./private.js').SubscribeInvalidateTuple<T>} */
			const subscriber = [run, invalidate];
			subscribers.add(subscriber);
			if (subscribers.size === 1) {
				stop = start(set, update) || noop;
			}
			run(value);
			return () => {
				subscribers.delete(subscriber);
				if (subscribers.size === 0 && stop) {
					stop();
					stop = null;
				}
			};
		}
		return { set, update, subscribe };
	}

	const extensionEnabled = writable(false);

	extensionEnabled.subscribe((value) => {

	});

	const EXTENSION_STATE_KEY = 'rto_state_enabled';

	const getExtensionState = async () => {
	    if(typeof window === 'undefined') return;
	    
	    var browser = window?.chrome ? window.chrome : window.browser;

	    if(!browser) return false;

	    let result = await browser.storage?.local?.get(EXTENSION_STATE_KEY);

	    return result ? result[EXTENSION_STATE_KEY] : false;
	};

	const extensionStateChanged = (changes, areaName) => {
	    let newValue = changes[EXTENSION_STATE_KEY].newValue;
	    extensionEnabled.set(newValue);
	};

	const initStorageEventListener = async () => {
	    if(typeof window === 'undefined') return;

	    var browser = window?.chrome ? window.chrome : window.browser;

	    if(!browser) return;

	    await browser.storage?.onChanged?.addListener(extensionStateChanged);
	};

	const initExtensionState = async () => {
	    extensionEnabled.set(await getExtensionState());
	};

	/* src\component\app\PostContent.svelte generated by Svelte v4.2.0 */

	function create_if_block$2(ctx) {
		let div22;
		let div0;
		let t0_value = /*currentPost*/ ctx[0].title + "";
		let t0;
		let t1;
		let div21;
		let div10;
		let div1;
		let img;
		let img_src_value;
		let t2;
		let div3;
		let a;
		let t3_value = /*currentPost*/ ctx[0].subreddit + "";
		let t3;
		let a_href_value;
		let t4;
		let div2;
		let t6;
		let div9;
		let div8;
		let t10;
		let t11;
		let div13;
		let button;
		let t12;
		let div12;
		let iframe;
		let iframe_src_value;
		let iframe_title_value;
		let div12_class_value;
		let t13;
		let div20;
		let mounted;
		let dispose;
		let if_block = /*currentPost*/ ctx[0].timePosted && create_if_block_1(ctx);

		return {
			c() {
				div22 = element("div");
				div0 = element("div");
				t0 = text(t0_value);
				t1 = space();
				div21 = element("div");
				div10 = element("div");
				div1 = element("div");
				img = element("img");
				t2 = space();
				div3 = element("div");
				a = element("a");
				t3 = text(t3_value);
				t4 = space();
				div2 = element("div");
				div2.textContent = "To: me";
				t6 = space();
				div9 = element("div");
				div8 = element("div");
				div8.innerHTML = `<div class="action_btn svelte-197edsm"><svg viewBox="0 0 24 24" class="svelte-197edsm"><path d="M9.277 16.221a.75.75 0 0 1-1.061 1.06l-4.997-5.003a.75.75 0 0 1 0-1.06L8.217 6.22a.75.75 0 0 1 1.061 1.06L5.557 11h7.842c1.595 0 2.81.242 3.889.764l.246.126a6.203 6.203 0 0 1 2.576 2.576c.61 1.14.89 2.418.89 4.135a.75.75 0 0 1-1.5 0c0-1.484-.228-2.52-.713-3.428a4.702 4.702 0 0 0-1.96-1.96c-.838-.448-1.786-.676-3.094-.709L13.4 12.5H5.562l3.715 3.721Z"></path></svg></div> <div class="action_btn svelte-197edsm"><svg viewBox="0 0 24 24" class="svelte-197edsm"><path d="M13.277 16.221a.75.75 0 0 1-1.061 1.06l-4.997-5.003a.75.75 0 0 1 0-1.06l4.997-4.998a.75.75 0 0 1 1.061 1.06L9.557 11h3.842c1.595 0 2.81.242 3.889.764l.246.126a6.203 6.203 0 0 1 2.576 2.576c.61 1.14.89 2.418.89 4.135a.75.75 0 0 1-1.5 0c0-1.484-.228-2.52-.713-3.428a4.702 4.702 0 0 0-1.96-1.96c-.838-.448-1.786-.676-3.094-.709L13.4 12.5H9.562l3.715 3.721Zm-4-10.001a.75.75 0 0 1 0 1.06L4.81 11.748l4.467 4.473a.75.75 0 0 1-1.061 1.06l-4.997-5.003a.75.75 0 0 1 0-1.06L8.217 6.22a.75.75 0 0 1 1.06 0Z"></path></svg></div> <div class="action_btn svelte-197edsm"><svg viewBox="0 0 24 24" class="svelte-197edsm"><path d="M14.723 16.221a.75.75 0 0 0 1.061 1.06l4.997-5.003a.75.75 0 0 0 0-1.06L15.783 6.22a.75.75 0 0 0-1.061 1.06l3.72 3.72h-7.842c-1.595 0-2.81.242-3.889.764l-.246.126a6.202 6.202 0 0 0-2.576 2.576C3.28 15.606 3 16.884 3 18.6a.75.75 0 0 0 1.5 0c0-1.484.228-2.52.713-3.428a4.702 4.702 0 0 1 1.96-1.96c.837-.448 1.786-.676 3.094-.709l.334-.004h7.837l-3.715 3.721Z"></path></svg></div> <div class="action_btn svelte-197edsm"><svg viewBox="0 0 24 24" class="svelte-197edsm"><path d="M7.75 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM13.75 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM18 13.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z"></path></svg></div>`;
				t10 = space();
				if (if_block) if_block.c();
				t11 = space();
				div13 = element("div");
				button = element("button");
				button.innerHTML = `<div class="btn_icon svelte-197edsm"><svg viewBox="0 0 24 24" class="svelte-197edsm"><path d="M7.75 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM13.75 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM18 13.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z"></path></svg></div>`;
				t12 = space();
				div12 = element("div");
				iframe = element("iframe");
				t13 = space();
				div20 = element("div");
				div20.innerHTML = `<div class="footer_btn svelte-197edsm"><div class="footer_btn_icon svelte-197edsm"><svg viewBox="0 0 24 24" class="svelte-197edsm"><path d="M9.277 16.221a.75.75 0 0 1-1.061 1.06l-4.997-5.003a.75.75 0 0 1 0-1.06L8.217 6.22a.75.75 0 0 1 1.061 1.06L5.557 11h7.842c1.595 0 2.81.242 3.889.764l.246.126a6.203 6.203 0 0 1 2.576 2.576c.61 1.14.89 2.418.89 4.135a.75.75 0 0 1-1.5 0c0-1.484-.228-2.52-.713-3.428a4.702 4.702 0 0 0-1.96-1.96c-.838-.448-1.786-.676-3.094-.709L13.4 12.5H5.562l3.715 3.721Z"></path></svg></div> <div class="footer_btn_title svelte-197edsm">Reply</div></div> <div class="footer_btn svelte-197edsm"><div class="footer_btn_icon svelte-197edsm"><svg viewBox="0 0 24 24" class="svelte-197edsm"><path d="M14.723 16.221a.75.75 0 0 0 1.061 1.06l4.997-5.003a.75.75 0 0 0 0-1.06L15.783 6.22a.75.75 0 0 0-1.061 1.06l3.72 3.72h-7.842c-1.595 0-2.81.242-3.889.764l-.246.126a6.202 6.202 0 0 0-2.576 2.576C3.28 15.606 3 16.884 3 18.6a.75.75 0 0 0 1.5 0c0-1.484.228-2.52.713-3.428a4.702 4.702 0 0 1 1.96-1.96c.837-.448 1.786-.676 3.094-.709l.334-.004h7.837l-3.715 3.721Z"></path></svg></div> <div class="footer_btn_title svelte-197edsm">Forward</div></div>`;
				attr(div0, "class", "post_title svelte-197edsm");
				if (!src_url_equal(img.src, img_src_value = /*currentPost*/ ctx[0].subredditImgUrl)) attr(img, "src", img_src_value);
				attr(img, "alt", "Subreddit Icon");
				attr(img, "class", "svelte-197edsm");
				attr(div1, "class", "subreddit_img svelte-197edsm");
				attr(a, "class", "subreddit_name svelte-197edsm");
				attr(a, "href", a_href_value = /*currentPost*/ ctx[0].subreddit);
				attr(div2, "class", "to_me svelte-197edsm");
				attr(div3, "class", "subreddit_info svelte-197edsm");
				attr(div8, "class", "actions svelte-197edsm");
				attr(div9, "class", "util svelte-197edsm");
				attr(div10, "class", "post_nav svelte-197edsm");
				attr(button, "class", "toggle_show_content_btn svelte-197edsm");
				if (!src_url_equal(iframe.src, iframe_src_value = /*currentPost*/ ctx[0].postUrl)) attr(iframe, "src", iframe_src_value);
				attr(iframe, "title", iframe_title_value = /*currentPost*/ ctx[0].title);
				attr(iframe, "frameborder", "0");
				attr(iframe, "sandbox", "allow-same-origin allow-scripts allow-forms");
				attr(iframe, "class", "svelte-197edsm");
				attr(div12, "class", div12_class_value = "content " + (/*showContent*/ ctx[1] ? 'content_shown' : '') + " svelte-197edsm");
				attr(div13, "class", "post_content svelte-197edsm");
				attr(div20, "class", "post_footer svelte-197edsm");
				attr(div21, "class", "post_body svelte-197edsm");
				attr(div22, "class", "post_content_container svelte-197edsm");
			},
			m(target, anchor) {
				insert(target, div22, anchor);
				append(div22, div0);
				append(div0, t0);
				append(div22, t1);
				append(div22, div21);
				append(div21, div10);
				append(div10, div1);
				append(div1, img);
				append(div10, t2);
				append(div10, div3);
				append(div3, a);
				append(a, t3);
				append(div3, t4);
				append(div3, div2);
				append(div10, t6);
				append(div10, div9);
				append(div9, div8);
				append(div9, t10);
				if (if_block) if_block.m(div9, null);
				append(div21, t11);
				append(div21, div13);
				append(div13, button);
				append(div13, t12);
				append(div13, div12);
				append(div12, iframe);
				append(div21, t13);
				append(div21, div20);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[2]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*currentPost*/ 1 && t0_value !== (t0_value = /*currentPost*/ ctx[0].title + "")) set_data(t0, t0_value);

				if (dirty & /*currentPost*/ 1 && !src_url_equal(img.src, img_src_value = /*currentPost*/ ctx[0].subredditImgUrl)) {
					attr(img, "src", img_src_value);
				}

				if (dirty & /*currentPost*/ 1 && t3_value !== (t3_value = /*currentPost*/ ctx[0].subreddit + "")) set_data(t3, t3_value);

				if (dirty & /*currentPost*/ 1 && a_href_value !== (a_href_value = /*currentPost*/ ctx[0].subreddit)) {
					attr(a, "href", a_href_value);
				}

				if (/*currentPost*/ ctx[0].timePosted) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_1(ctx);
						if_block.c();
						if_block.m(div9, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (dirty & /*currentPost*/ 1 && !src_url_equal(iframe.src, iframe_src_value = /*currentPost*/ ctx[0].postUrl)) {
					attr(iframe, "src", iframe_src_value);
				}

				if (dirty & /*currentPost*/ 1 && iframe_title_value !== (iframe_title_value = /*currentPost*/ ctx[0].title)) {
					attr(iframe, "title", iframe_title_value);
				}

				if (dirty & /*showContent*/ 2 && div12_class_value !== (div12_class_value = "content " + (/*showContent*/ ctx[1] ? 'content_shown' : '') + " svelte-197edsm")) {
					attr(div12, "class", div12_class_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div22);
				}

				if (if_block) if_block.d();
				mounted = false;
				dispose();
			}
		};
	}

	// (54:5) {#if currentPost.timePosted}
	function create_if_block_1(ctx) {
		let div;
		let t_value = /*currentPost*/ ctx[0].timePosted + "";
		let t;

		return {
			c() {
				div = element("div");
				t = text(t_value);
				attr(div, "class", "time_posted svelte-197edsm");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, t);
			},
			p(ctx, dirty) {
				if (dirty & /*currentPost*/ 1 && t_value !== (t_value = /*currentPost*/ ctx[0].timePosted + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	function create_fragment$a(ctx) {
		let if_block_anchor;
		let if_block = /*currentPost*/ ctx[0] && create_if_block$2(ctx);

		return {
			c() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
			},
			p(ctx, [dirty]) {
				if (/*currentPost*/ ctx[0]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block$2(ctx);
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};
	}

	function instance$7($$self, $$props, $$invalidate) {
		let { currentPost } = $$props;
		let showContent = false;

		const click_handler = () => {
			$$invalidate(1, showContent = !showContent);
		};

		$$self.$$set = $$props => {
			if ('currentPost' in $$props) $$invalidate(0, currentPost = $$props.currentPost);
		};

		return [currentPost, showContent, click_handler];
	}

	class PostContent extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$7, create_fragment$a, safe_not_equal, { currentPost: 0 });
		}
	}

	const getScrollPercent = (container) => {
	    return 100 * container.scrollTop / (container.scrollHeight - container.clientHeight);
	};

	const convertPercentToWindowY = (percent) => {
	    return percent / 100 * document.body.scrollHeight;
	};

	/* src\component\app\PostCard.svelte generated by Svelte v4.2.0 */

	function create_if_block$1(ctx) {
		let div7;
		let div1;
		let t0;
		let div4;
		let div2;
		let t1_value = /*postData*/ ctx[0].subreddit + "";
		let t1;
		let t2;
		let div3;
		let t3_value = /*postData*/ ctx[0].title + "";
		let t3;
		let t4;
		let div6;
		let div7_class_value;
		let mounted;
		let dispose;

		return {
			c() {
				div7 = element("div");
				div1 = element("div");
				div1.innerHTML = `<div class="select_check svelte-1hji08m"></div>`;
				t0 = space();
				div4 = element("div");
				div2 = element("div");
				t1 = text(t1_value);
				t2 = space();
				div3 = element("div");
				t3 = text(t3_value);
				t4 = space();
				div6 = element("div");
				div6.innerHTML = `<div class="delete_mail_icon svelte-1hji08m"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="svelte-1hji08m"><path d="M12 1.75a3.25 3.25 0 0 1 3.245 3.066L15.25 5h5.25a.75.75 0 0 1 .102 1.493L20.5 6.5h-.796l-1.28 13.02a2.75 2.75 0 0 1-2.561 2.474l-.176.006H8.313a2.75 2.75 0 0 1-2.714-2.307l-.023-.174L4.295 6.5H3.5a.75.75 0 0 1-.743-.648L2.75 5.75a.75.75 0 0 1 .648-.743L3.5 5h5.25A3.25 3.25 0 0 1 12 1.75Zm6.197 4.75H5.802l1.267 12.872a1.25 1.25 0 0 0 1.117 1.122l.127.006h7.374c.6 0 1.109-.425 1.225-1.002l.02-.126L18.196 6.5ZM13.75 9.25a.75.75 0 0 1 .743.648L14.5 10v7a.75.75 0 0 1-1.493.102L13 17v-7a.75.75 0 0 1 .75-.75Zm-3.5 0a.75.75 0 0 1 .743.648L11 10v7a.75.75 0 0 1-1.493.102L9.5 17v-7a.75.75 0 0 1 .75-.75Zm1.75-6a1.75 1.75 0 0 0-1.744 1.606L10.25 5h3.5A1.75 1.75 0 0 0 12 3.25Z"></path></svg></div>`;
				attr(div1, "class", "select_post_util svelte-1hji08m");
				attr(div2, "class", "author_data svelte-1hji08m");
				attr(div3, "class", "post_title svelte-1hji08m");
				attr(div4, "class", "post_data svelte-1hji08m");
				attr(div6, "class", "delete_mail svelte-1hji08m");

				attr(div7, "class", div7_class_value = "post_card_container " + ((/*postData*/ ctx[0]?.postSelected)
				? 'post_selected'
				: 'post_unselected') + " svelte-1hji08m");
			},
			m(target, anchor) {
				insert(target, div7, anchor);
				append(div7, div1);
				append(div7, t0);
				append(div7, div4);
				append(div4, div2);
				append(div2, t1);
				append(div4, t2);
				append(div4, div3);
				append(div3, t3);
				append(div7, t4);
				append(div7, div6);

				if (!mounted) {
					dispose = listen(div7, "click", /*click_handler*/ ctx[2]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*postData*/ 1 && t1_value !== (t1_value = /*postData*/ ctx[0].subreddit + "")) set_data(t1, t1_value);
				if (dirty & /*postData*/ 1 && t3_value !== (t3_value = /*postData*/ ctx[0].title + "")) set_data(t3, t3_value);

				if (dirty & /*postData*/ 1 && div7_class_value !== (div7_class_value = "post_card_container " + ((/*postData*/ ctx[0]?.postSelected)
				? 'post_selected'
				: 'post_unselected') + " svelte-1hji08m")) {
					attr(div7, "class", div7_class_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div7);
				}

				mounted = false;
				dispose();
			}
		};
	}

	function create_fragment$9(ctx) {
		let if_block_anchor;
		let if_block = /*postData*/ ctx[0] && create_if_block$1(ctx);

		return {
			c() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
			},
			p(ctx, [dirty]) {
				if (/*postData*/ ctx[0]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block$1(ctx);
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};
	}

	function instance$6($$self, $$props, $$invalidate) {
		let { postData } = $$props;
		let { selectPostCallback } = $$props;

		const click_handler = () => {
			selectPostCallback(postData);
		};

		$$self.$$set = $$props => {
			if ('postData' in $$props) $$invalidate(0, postData = $$props.postData);
			if ('selectPostCallback' in $$props) $$invalidate(1, selectPostCallback = $$props.selectPostCallback);
		};

		return [postData, selectPostCallback, click_handler];
	}

	class PostCard extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$6, create_fragment$9, safe_not_equal, { postData: 0, selectPostCallback: 1 });
		}
	}

	/* src\component\app\PostsList.svelte generated by Svelte v4.2.0 */

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[15] = list[i];
		return child_ctx;
	}

	// (128:1) {#each posts as post}
	function create_each_block(ctx) {
		let postcard;
		let current;

		postcard = new PostCard({
				props: {
					postData: /*post*/ ctx[15],
					selectPostCallback: /*selectPostCallback*/ ctx[3]
				}
			});

		return {
			c() {
				create_component(postcard.$$.fragment);
			},
			m(target, anchor) {
				mount_component(postcard, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const postcard_changes = {};
				if (dirty & /*posts*/ 1) postcard_changes.postData = /*post*/ ctx[15];
				postcard.$set(postcard_changes);
			},
			i(local) {
				if (current) return;
				transition_in(postcard.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(postcard.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(postcard, detaching);
			}
		};
	}

	function create_fragment$8(ctx) {
		let div;
		let current;
		let mounted;
		let dispose;
		let each_value = ensure_array_like(/*posts*/ ctx[0]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		return {
			c() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div, "class", "posts_list svelte-11rnglo");
			},
			m(target, anchor) {
				insert(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}

				/*div_binding*/ ctx[8](div);
				current = true;

				if (!mounted) {
					dispose = listen(div, "scroll", /*scroll_handler*/ ctx[9]);
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (dirty & /*posts, selectPostCallback*/ 9) {
					each_value = ensure_array_like(/*posts*/ ctx[0]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(div, null);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_each(each_blocks, detaching);
				/*div_binding*/ ctx[8](null);
				mounted = false;
				dispose();
			}
		};
	}

	function instance$5($$self, $$props, $$invalidate) {
		let { windowScrollY } = $$props;
		let { currentPost } = $$props;
		let { currentPath } = $$props;
		const pathRegex = new RegExp('^(/r/[0-9a-zA-Z_]+(/)?)$');
		let listContainer;
		let posts = [];
		let authViewObserver;
		const config = { childList: true, subtree: true };

		const parsePostInfoToList = postNode => {
			if (!postNode) return;
			if (typeof postNode.querySelector !== 'function') return;
			let postId = posts.length;
			let subreddit;
			let subredditImgUrl;

			if (pathRegex.test(currentPath)) {
				subreddit = currentPath;
				subredditImgUrl = document.body.querySelector('#AppRouter-main-content')?.querySelector('img')?.getAttribute('src');
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

			$$invalidate(0, posts = [
				...posts,
				{
					id: postId,
					title,
					subreddit,
					subredditImgUrl,
					postSelected: false,
					postUrl: bodyUrl,
					timePosted
				}
			]);
		};

		const postAddedCallback = (mutationsList, observer) => {
			for (const mutation of mutationsList) {
				if (mutation.type === 'childList') {
					mutation.addedNodes.forEach(node => {
						parsePostInfoToList(node);
					});
				}
			}
		};

		const syncScrolls = () => {
			let postListScrollPercent = getScrollPercent(listContainer);
			$$invalidate(4, windowScrollY = convertPercentToWindowY(postListScrollPercent));
		};

		const selectPostCallback = postData => {
			$$invalidate(5, currentPost = postData.postSelected ? null : postData);

			for (var i = 0; i < posts.length; i++) {
				if (posts[i].id === currentPost?.id) {
					$$invalidate(0, posts[i].postSelected = true, posts);
				} else {
					$$invalidate(0, posts[i].postSelected = false, posts);
				}
			}
		};

		function div_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				listContainer = $$value;
				$$invalidate(1, listContainer);
			});
		}

		const scroll_handler = () => {
			syncScrolls();
		};

		$$self.$$set = $$props => {
			if ('windowScrollY' in $$props) $$invalidate(4, windowScrollY = $$props.windowScrollY);
			if ('currentPost' in $$props) $$invalidate(5, currentPost = $$props.currentPost);
			if ('currentPath' in $$props) $$invalidate(6, currentPath = $$props.currentPath);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*authViewObserver*/ 128) {
				{
					let nodes = document.querySelectorAll(`[data-testid*="post-container"]`);
					if (!nodes || nodes.length < 1) nodes = document.querySelectorAll('shreddit-post');

					nodes.forEach(node => {
						parsePostInfoToList(node);
					});

					$$invalidate(7, authViewObserver = new MutationObserver(postAddedCallback));
					authViewObserver.observe(document, config);
				}
			}

			if ($$self.$$.dirty & /*posts*/ 1) {
				if (posts.length < 7) {
					$$invalidate(4, windowScrollY = convertPercentToWindowY(99));
				}
			}
		};

		return [
			posts,
			listContainer,
			syncScrolls,
			selectPostCallback,
			windowScrollY,
			currentPost,
			currentPath,
			authViewObserver,
			div_binding,
			scroll_handler
		];
	}

	class PostsList extends SvelteComponent {
		constructor(options) {
			super();

			init(this, options, instance$5, create_fragment$8, safe_not_equal, {
				windowScrollY: 4,
				currentPost: 5,
				currentPath: 6
			});
		}
	}

	/* src\component\app\MainApp.svelte generated by Svelte v4.2.0 */

	function create_fragment$7(ctx) {
		let div9;
		let div8;
		let div7;
		let t6;
		let postslist;
		let updating_windowScrollY;
		let updating_currentPost;
		let t7;
		let postcontent;
		let updating_currentPost_1;
		let current;

		function postslist_windowScrollY_binding(value) {
			/*postslist_windowScrollY_binding*/ ctx[3](value);
		}

		function postslist_currentPost_binding(value) {
			/*postslist_currentPost_binding*/ ctx[4](value);
		}

		let postslist_props = { currentPath: /*currentPath*/ ctx[1] };

		if (/*windowScrollY*/ ctx[0] !== void 0) {
			postslist_props.windowScrollY = /*windowScrollY*/ ctx[0];
		}

		if (/*currentPost*/ ctx[2] !== void 0) {
			postslist_props.currentPost = /*currentPost*/ ctx[2];
		}

		postslist = new PostsList({ props: postslist_props });
		binding_callbacks.push(() => bind(postslist, 'windowScrollY', postslist_windowScrollY_binding));
		binding_callbacks.push(() => bind(postslist, 'currentPost', postslist_currentPost_binding));

		function postcontent_currentPost_binding(value) {
			/*postcontent_currentPost_binding*/ ctx[5](value);
		}

		let postcontent_props = {};

		if (/*currentPost*/ ctx[2] !== void 0) {
			postcontent_props.currentPost = /*currentPost*/ ctx[2];
		}

		postcontent = new PostContent({ props: postcontent_props });
		binding_callbacks.push(() => bind(postcontent, 'currentPost', postcontent_currentPost_binding));

		return {
			c() {
				div9 = element("div");
				div8 = element("div");
				div7 = element("div");
				div7.innerHTML = `<div class="left_side svelte-n458dz"><div class="nav_option option_active svelte-n458dz">Focused</div> <div class="nav_option svelte-n458dz">Other</div></div> <div class="right_side svelte-n458dz"><div class="filter_btn svelte-n458dz"><div class="filter_icon svelte-n458dz"><svg viewBox="0 0 24 24" class="svelte-n458dz"><path d="M13.5 16a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h3Zm3-5a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1 0-1.5h9Zm3-5a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1 0-1.5h15Z"></path></svg></div> <div class="title svelte-n458dz">Filter</div></div></div>`;
				t6 = space();
				create_component(postslist.$$.fragment);
				t7 = space();
				create_component(postcontent.$$.fragment);
				attr(div7, "class", "container_navbar svelte-n458dz");
				attr(div8, "class", "scroll_list_container svelte-n458dz");
				attr(div9, "class", "main_app svelte-n458dz");
			},
			m(target, anchor) {
				insert(target, div9, anchor);
				append(div9, div8);
				append(div8, div7);
				append(div8, t6);
				mount_component(postslist, div8, null);
				append(div9, t7);
				mount_component(postcontent, div9, null);
				current = true;
			},
			p(ctx, [dirty]) {
				const postslist_changes = {};
				if (dirty & /*currentPath*/ 2) postslist_changes.currentPath = /*currentPath*/ ctx[1];

				if (!updating_windowScrollY && dirty & /*windowScrollY*/ 1) {
					updating_windowScrollY = true;
					postslist_changes.windowScrollY = /*windowScrollY*/ ctx[0];
					add_flush_callback(() => updating_windowScrollY = false);
				}

				if (!updating_currentPost && dirty & /*currentPost*/ 4) {
					updating_currentPost = true;
					postslist_changes.currentPost = /*currentPost*/ ctx[2];
					add_flush_callback(() => updating_currentPost = false);
				}

				postslist.$set(postslist_changes);
				const postcontent_changes = {};

				if (!updating_currentPost_1 && dirty & /*currentPost*/ 4) {
					updating_currentPost_1 = true;
					postcontent_changes.currentPost = /*currentPost*/ ctx[2];
					add_flush_callback(() => updating_currentPost_1 = false);
				}

				postcontent.$set(postcontent_changes);
			},
			i(local) {
				if (current) return;
				transition_in(postslist.$$.fragment, local);
				transition_in(postcontent.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(postslist.$$.fragment, local);
				transition_out(postcontent.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div9);
				}

				destroy_component(postslist);
				destroy_component(postcontent);
			}
		};
	}

	function instance$4($$self, $$props, $$invalidate) {
		let { windowScrollY } = $$props;
		let { currentPath } = $$props;
		let currentPost;

		function postslist_windowScrollY_binding(value) {
			windowScrollY = value;
			$$invalidate(0, windowScrollY);
		}

		function postslist_currentPost_binding(value) {
			currentPost = value;
			$$invalidate(2, currentPost);
		}

		function postcontent_currentPost_binding(value) {
			currentPost = value;
			$$invalidate(2, currentPost);
		}

		$$self.$$set = $$props => {
			if ('windowScrollY' in $$props) $$invalidate(0, windowScrollY = $$props.windowScrollY);
			if ('currentPath' in $$props) $$invalidate(1, currentPath = $$props.currentPath);
		};

		return [
			windowScrollY,
			currentPath,
			currentPost,
			postslist_windowScrollY_binding,
			postslist_currentPost_binding,
			postcontent_currentPost_binding
		];
	}

	class MainApp extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$4, create_fragment$7, safe_not_equal, { windowScrollY: 0, currentPath: 1 });
		}
	}

	/* src\component\background\Header.svelte generated by Svelte v4.2.0 */

	function create_fragment$6(ctx) {
		let div19;
		let div0;
		let t0;
		let div2;
		let t2;
		let div6;
		let t4;
		let div18;
		let div9;
		let t7;
		let div10;
		let t8;
		let div11;
		let t9;
		let div12;
		let t10;
		let div13;
		let t11;
		let div14;
		let t12;
		let div17;
		let div16;
		let div15;
		let input1;
		let mounted;
		let dispose;

		return {
			c() {
				div19 = element("div");
				div0 = element("div");
				div0.innerHTML = `<svg viewBox="0 0 2048 2048" class="svelte-1m3qrf6"><path d="M192 0q40 0 75 15t61 41 41 61 15 75q0 40-15 75t-41 61-61 41-75 15q-40 0-75-15t-61-41-41-61-15-75q0-40 15-75t41-61 61-41 75-15zm768 0q40 0 75 15t61 41 41 61 15 75q0 40-15 75t-41 61-61 41-75 15q-40 0-75-15t-61-41-41-61-15-75q0-40 15-75t41-61 61-41 75-15zm768 384q-40 0-75-15t-61-41-41-61-15-75q0-40 15-75t41-61 61-41 75-15q40 0 75 15t61 41 41 61 15 75q0 40-15 75t-41 61-61 41-75 15zM192 768q40 0 75 15t61 41 41 61 15 75q0 40-15 75t-41 61-61 41-75 15q-40 0-75-15t-61-41-41-61-15-75q0-40 15-75t41-61 61-41 75-15zm768 0q40 0 75 15t61 41 41 61 15 75q0 40-15 75t-41 61-61 41-75 15q-40 0-75-15t-61-41-41-61-15-75q0-40 15-75t41-61 61-41 75-15zm768 0q40 0 75 15t61 41 41 61 15 75q0 40-15 75t-41 61-61 41-75 15q-40 0-75-15t-61-41-41-61-15-75q0-40 15-75t41-61 61-41 75-15zM192 1536q40 0 75 15t61 41 41 61 15 75q0 40-15 75t-41 61-61 41-75 15q-40 0-75-15t-61-41-41-61-15-75q0-40 15-75t41-61 61-41 75-15zm768 0q40 0 75 15t61 41 41 61 15 75q0 40-15 75t-41 61-61 41-75 15q-40 0-75-15t-61-41-41-61-15-75q0-40 15-75t41-61 61-41 75-15zm768 0q40 0 75 15t61 41 41 61 15 75q0 40-15 75t-41 61-61 41-75 15q-40 0-75-15t-61-41-41-61-15-75q0-40 15-75t41-61 61-41 75-15z"></path></svg>`;
				t0 = space();
				div2 = element("div");
				div2.innerHTML = `<div class="title svelte-1m3qrf6">Outlook</div>`;
				t2 = space();
				div6 = element("div");
				div6.innerHTML = `<div class="search_container svelte-1m3qrf6"><div class="search_box svelte-1m3qrf6"><div class="search_icon svelte-1m3qrf6"><svg viewBox="0 0 2048 2048" class="svelte-1m3qrf6"><path d="M1344 0q97 0 187 25t168 71 142 110 111 143 71 168 25 187q0 97-25 187t-71 168-110 142-143 111-168 71-187 25q-125 0-239-42t-211-121l-785 784q-19 19-45 19t-45-19-19-45q0-26 19-45l784-785q-79-96-121-210t-42-240q0-97 25-187t71-168 110-142T989 96t168-71 187-25zm0 1280q119 0 224-45t183-124 123-183 46-224q0-119-45-224t-124-183-183-123-224-46q-119 0-224 45T937 297 814 480t-46 224q0 119 45 224t124 183 183 123 224 46z" fill="#333333"></path></svg></div> <input class="search_text svelte-1m3qrf6" placeholder="Search"/></div></div>`;
				t4 = space();
				div18 = element("div");
				div9 = element("div");
				div9.innerHTML = `<div class="meet_icon svelte-1m3qrf6"><svg viewBox="0 0 2048 2048" class="svelte-1m3qrf6"><path d="M2048 1544l-512-256v248H0V512h1536v248l512-256v1040zm-640-904H128v768h1280V640zm512 71l-384 193v240l384 193V711z"></path></svg></div> <div class="meet_title">Meet Now</div>`;
				t7 = space();
				div10 = element("div");
				div10.innerHTML = `<svg viewBox="0 0 2048 2048" class="svelte-1m3qrf6"><path d="M1894 1151q35 63 53 132t19 142q0 116-44 218t-120 177-178 120-218 44q-75 0-147-20t-138-58q-26 3-53 5t-53 2q-122 0-235-31t-212-89-180-138-139-179-90-212-32-236q0-32 3-64t8-65q-36-63-55-133T64 623q0-116 44-218t120-177 179-120 218-44q78 0 153 21t142 63q24-2 47-3t48-2q122 0 235 31t212 89 180 138 139 179 90 212 32 236q0 31-2 61t-7 62zm-519 94q0-64-21-112t-57-84-81-62-93-47-93-39-81-36-57-41-22-52q0-29 14-48t36-30 47-17 50-5q27 0 49 3t44 9 43 14 46 19q25 10 47 10 43 0 67-28t25-70q0-33-16-56t-43-40-61-27-68-15-67-7-56-2q-68 0-138 16t-127 53-93 92-37 135q0 63 21 110t57 83 81 62 93 48 93 39 81 38 57 43 22 55q0 31-13 51t-33 31-46 15-51 5q-47 0-82-11t-64-25-56-25-57-12q-44 0-72 25t-29 71q0 36 19 62t49 45 70 30 78 18 75 9 63 3q73 0 143-15t124-51 87-94 33-143z"></path></svg>`;
				t8 = space();
				div11 = element("div");
				div11.innerHTML = `<svg viewBox="0 0 2048 2048" class="svelte-1m3qrf6"><path d="M1963 128q35 0 60 25t25 60v1622q0 35-25 60t-60 25H597q-35 0-60-25t-25-60v-299H85q-35 0-60-25t-25-60V597q0-35 25-60t60-25h427V213q0-35 25-60t60-25h1366zM389 939l242 420h152V689H635v429L402 689H241v670h148V939zm1531 853v-256h-256v256h256zm0-384v-256h-256v256h256zm0-384V768h-256v256h256zm0-384V256H640v256h299q35 0 60 25t25 60v854q0 35-25 60t-60 25H640v256h896V640h384z"></path></svg>`;
				t9 = space();
				div12 = element("div");
				div12.innerHTML = `<svg viewBox="0 0 2048 2048" class="svelte-1m3qrf6"><path d="M128 640v768h256v128H0V128h256V0h128v128h768V0h128v128h256v640h-128V640H128zm128-384H128v256h1280V256h-128v128h-128V256H384v128H256V256zm1792 828q0 20-8 39t-23 34q-208 208-412 414t-413 412q-32 30-75 30t-73-30l-411-410q-15-14-23-33t-8-41q0-43 31-74l177-177q31-31 74-31 42 0 73 31l160 160 576-575q30-30 73-30 20 0 40 8t35 22l176 177q14 14 22 33t9 41zM885 1642l143-143-144-144-143 144 144 143zm1025-559l-144-144q-199 200-395 397t-397 397q36 36 71 72t72 72q200-199 397-396t396-398z"></path></svg>`;
				t10 = space();
				div13 = element("div");
				div13.innerHTML = `<svg viewBox="0 0 2048 2048" class="svelte-1m3qrf6"><path d="M1783 988v18q0 9 1 18v18q0 9-1 18l259 161-159 383-297-68q-24 26-50 50l68 297-383 159-161-259h-18q-9 0-18 1h-18q-9 0-18-1l-161 259-383-159 68-297q-26-24-50-50l-297 68L6 1221l259-161v-18q0-9-1-18v-18q0-9 1-18L6 827l159-383 297 68q24-26 50-50l-68-297L827 6l161 259h18q9 0 18-1h18q9 0 18 1L1221 6l383 159-68 297q26 24 50 50l297-68 159 383-259 161zm-117 130q2-24 4-47t2-48q0-23-2-47t-4-47l236-147-86-208-271 63q-31-38-63-70t-71-64l63-271-208-86-148 236q-23-2-47-4t-47-2q-24 0-47 2t-48 4L782 146l-208 86 63 271q-38 31-70 63t-64 71l-271-63-86 208 236 148q-2 24-4 47t-2 48q0 23 2 47t4 47l-236 147 86 208 271-63q31 38 63 70t71 64l-63 271 208 86 148-236q23 2 47 4t47 2q24 0 47-2t48-4l147 236 208-86-63-271q38-31 70-63t64-71l271 63 86-208-236-148zm-642-470q78 0 146 29t120 81 80 119 30 147q0 78-29 146t-81 120-119 80-147 30q-78 0-146-29t-120-81-80-119-30-147q0-78 29-146t81-120 119-80 147-30zm0 640q55 0 103-20t84-57 56-84 21-103q0-55-20-103t-57-84-84-56-103-21q-55 0-103 20t-84 57-56 84-21 103q0 55 20 103t57 84 84 56 103 21z"></path></svg>`;
				t11 = space();
				div14 = element("div");
				div14.innerHTML = `<svg viewBox="0 0 2048 2048" class="svelte-1m3qrf6"><path d="M960 0q97 0 187 25t168 71 143 110 110 142 71 169 25 187q0 145-55 269t-157 225q-83 82-127 183t-45 219v256q0 40-15 75t-41 61-61 41-75 15H832q-40 0-75-15t-61-41-41-61-15-75v-256q0-118-44-219t-128-183q-102-101-157-225t-55-269q0-97 25-187t71-168 110-143T604 96t169-71T960 0zm128 1920q26 0 45-19t19-45v-192H768v192q0 26 19 45t45 19h256zm67-384q13-129 66-234t143-196q83-84 127-183t45-219q0-119-45-224t-124-183-183-123-224-46q-119 0-224 45T553 297 430 480t-46 224q0 119 44 218t128 184q90 91 143 196t66 234h390z"></path></svg>`;
				t12 = space();
				div17 = element("div");
				div16 = element("div");
				div15 = element("div");
				input1 = element("input");
				attr(div0, "class", "app_launcher svelte-1m3qrf6");
				attr(div2, "class", "region1 svelte-1m3qrf6");
				attr(div6, "class", "region2 svelte-1m3qrf6");
				attr(div9, "class", "meet_now_button svelte-1m3qrf6");
				attr(div10, "class", "nav_button svelte-1m3qrf6");
				attr(div11, "class", "nav_button svelte-1m3qrf6");
				attr(div12, "class", "nav_button svelte-1m3qrf6");
				attr(div13, "class", "nav_button svelte-1m3qrf6");
				attr(div14, "class", "nav_button svelte-1m3qrf6");
				attr(input1, "class", "user_initials svelte-1m3qrf6");
				attr(input1, "type", "text");
				attr(div15, "class", "icon_outline svelte-1m3qrf6");
				attr(div16, "class", "current_user svelte-1m3qrf6");
				attr(div17, "class", "nav_button svelte-1m3qrf6");
				attr(div18, "class", "region3 svelte-1m3qrf6");
				attr(div19, "class", "header_container svelte-1m3qrf6");
			},
			m(target, anchor) {
				insert(target, div19, anchor);
				append(div19, div0);
				append(div19, t0);
				append(div19, div2);
				append(div19, t2);
				append(div19, div6);
				append(div19, t4);
				append(div19, div18);
				append(div18, div9);
				append(div18, t7);
				append(div18, div10);
				append(div18, t8);
				append(div18, div11);
				append(div18, t9);
				append(div18, div12);
				append(div18, t10);
				append(div18, div13);
				append(div18, t11);
				append(div18, div14);
				append(div18, t12);
				append(div18, div17);
				append(div17, div16);
				append(div16, div15);
				append(div15, input1);
				set_input_value(input1, /*userInitials*/ ctx[0]);

				if (!mounted) {
					dispose = listen(input1, "input", /*input1_input_handler*/ ctx[1]);
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (dirty & /*userInitials*/ 1 && input1.value !== /*userInitials*/ ctx[0]) {
					set_input_value(input1, /*userInitials*/ ctx[0]);
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div19);
				}

				mounted = false;
				dispose();
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { userInitials } = $$props;

		function input1_input_handler() {
			userInitials = this.value;
			$$invalidate(0, userInitials);
		}

		$$self.$$set = $$props => {
			if ('userInitials' in $$props) $$invalidate(0, userInitials = $$props.userInitials);
		};

		return [userInitials, input1_input_handler];
	}

	class Header extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$3, create_fragment$6, safe_not_equal, { userInitials: 0 });
		}
	}

	/* src\component\background\MainAppBackground.svelte generated by Svelte v4.2.0 */

	function create_fragment$5(ctx) {
		let div;
		let current;
		const default_slot_template = /*#slots*/ ctx[1].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

		return {
			c() {
				div = element("div");
				if (default_slot) default_slot.c();
				attr(div, "class", "main_app_background svelte-rgc3cj");
			},
			m(target, anchor) {
				insert(target, div, anchor);

				if (default_slot) {
					default_slot.m(div, null);
				}

				current = true;
			},
			p(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[0],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
							null
						);
					}
				}
			},
			i(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				if (default_slot) default_slot.d(detaching);
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;

		$$self.$$set = $$props => {
			if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
		};

		return [$$scope, slots];
	}

	class MainAppBackground extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$2, create_fragment$5, safe_not_equal, {});
		}
	}

	/* src\component\background\NavigationPane.svelte generated by Svelte v4.2.0 */

	function create_fragment$4(ctx) {
		let div54;

		return {
			c() {
				div54 = element("div");
				div54.innerHTML = `<div class="navigation_section svelte-rmur07"><div class="section_nav svelte-rmur07"><div class="collapse_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-rmur07"></path></svg></div> <div class="title svelte-rmur07">Favorites</div></div> <div class="section_body svelte-rmur07"><div class="section_item item_selected svelte-rmur07"><div class="item_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="M6.25 3h11.5a3.25 3.25 0 0 1 3.245 3.066L21 6.25v11.5a3.25 3.25 0 0 1-3.066 3.245L17.75 21H6.25a3.25 3.25 0 0 1-3.245-3.066L3 17.75V6.25a3.25 3.25 0 0 1 3.066-3.245L6.25 3h11.5-11.5ZM4.5 14.5v3.25a1.75 1.75 0 0 0 1.606 1.744l.144.006h11.5a1.75 1.75 0 0 0 1.744-1.607l.006-.143V14.5h-3.825a3.752 3.752 0 0 1-3.475 2.995l-.2.005a3.752 3.752 0 0 1-3.632-2.812l-.043-.188H4.5v3.25-3.25Zm13.25-10H6.25a1.75 1.75 0 0 0-1.744 1.606L4.5 6.25V13H9a.75.75 0 0 1 .743.648l.007.102a2.25 2.25 0 0 0 4.495.154l.005-.154a.75.75 0 0 1 .648-.743L15 13h4.5V6.25a1.75 1.75 0 0 0-1.607-1.744L17.75 4.5Z" class="svelte-rmur07"></path></svg></div> <div class="item_title svelte-rmur07">Inbox</div></div> <div class="section_item svelte-rmur07"><div class="item_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="M5.694 12 2.299 3.272c-.236-.607.356-1.188.942-.982l.093.04 18 9a.75.75 0 0 1 .097 1.283l-.097.058-18 9c-.583.291-1.217-.244-1.065-.847l.03-.096L5.694 12 2.299 3.272 5.694 12ZM4.402 4.54l2.61 6.71h6.627a.75.75 0 0 1 .743.648l.007.102a.75.75 0 0 1-.649.743l-.101.007H7.01l-2.609 6.71L19.322 12 4.401 4.54Z" class="svelte-rmur07"></path></svg></div> <div class="item_title svelte-rmur07">Sent Items</div></div> <div class="section_item svelte-rmur07"><div class="item_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="m20.877 2.826.153.144.145.153a3.579 3.579 0 0 1-.145 4.908L9.062 19.999a2.25 2.25 0 0 1-1 .58l-5.115 1.395a.75.75 0 0 1-.92-.921l1.394-5.116a2.25 2.25 0 0 1 .58-.999L15.97 2.97a3.579 3.579 0 0 1 4.908-.144ZM15 6.06l-9.938 9.938a.75.75 0 0 0-.193.333l-1.05 3.85 3.85-1.05A.75.75 0 0 0 8 18.938L17.94 9 15 6.06ZM6.525 11l-1.5 1.5H2.75a.75.75 0 0 1 0-1.5h3.775Zm4-4-1.5 1.5H2.75a.75.75 0 1 1 0-1.5h7.775Zm6.505-2.97-.97.97 2.939 2.94.97-.97a2.078 2.078 0 1 0-2.939-2.94ZM14.525 3l-1.5 1.5H2.75a.75.75 0 1 1 0-1.5h11.775Z" class="svelte-rmur07"></path></svg></div> <div class="item_title svelte-rmur07">Drafts</div></div> <div class="section_item svelte-rmur07"><div class="item_icon svelte-rmur07"></div> <div class="item_title svelte-rmur07" style="color: var(--themePrimary);">Add favorite</div></div></div></div> <div class="navigation_section svelte-rmur07"><div class="section_nav svelte-rmur07"><div class="collapse_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-rmur07"></path></svg></div> <div class="title svelte-rmur07">Folders</div></div> <div class="section_body svelte-rmur07"><div class="section_item svelte-rmur07"><div class="item_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="M6.25 3h11.5a3.25 3.25 0 0 1 3.245 3.066L21 6.25v11.5a3.25 3.25 0 0 1-3.066 3.245L17.75 21H6.25a3.25 3.25 0 0 1-3.245-3.066L3 17.75V6.25a3.25 3.25 0 0 1 3.066-3.245L6.25 3h11.5-11.5ZM4.5 14.5v3.25a1.75 1.75 0 0 0 1.606 1.744l.144.006h11.5a1.75 1.75 0 0 0 1.744-1.607l.006-.143V14.5h-3.825a3.752 3.752 0 0 1-3.475 2.995l-.2.005a3.752 3.752 0 0 1-3.632-2.812l-.043-.188H4.5v3.25-3.25Zm13.25-10H6.25a1.75 1.75 0 0 0-1.744 1.606L4.5 6.25V13H9a.75.75 0 0 1 .743.648l.007.102a2.25 2.25 0 0 0 4.495.154l.005-.154a.75.75 0 0 1 .648-.743L15 13h4.5V6.25a1.75 1.75 0 0 0-1.607-1.744L17.75 4.5Z" class="svelte-rmur07"></path></svg></div> <div class="item_title svelte-rmur07">Inbox</div></div> <div class="section_item svelte-rmur07"><div class="item_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="M17.5 11a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm3.31 3.252-5.558 5.557a4 4 0 0 0 5.557-5.557ZM8.206 4c.46 0 .908.141 1.284.402l.156.12L12.022 6.5h7.728a2.25 2.25 0 0 1 2.229 1.938l.016.158.005.154v3.06a6.517 6.517 0 0 0-1.499-1.077L20.5 8.75a.75.75 0 0 0-.648-.743L19.75 8h-7.729L9.647 9.979a2.25 2.25 0 0 1-1.244.512l-.196.009-4.707-.001v7.251c0 .38.282.694.648.743l.102.007h7.064c.172.534.412 1.038.709 1.501L4.25 20a2.25 2.25 0 0 1-2.245-2.096L2 17.75V6.25a2.25 2.25 0 0 1 2.096-2.245L4.25 4h3.957Zm9.293 8.5a4 4 0 0 0-3.31 6.248l5.558-5.557A3.981 3.981 0 0 0 17.5 12.5Zm-9.293-7H4.25a.75.75 0 0 0-.743.648L3.5 6.25v2.749L8.207 9a.75.75 0 0 0 .395-.113l.085-.06 1.891-1.578-1.89-1.575a.75.75 0 0 0-.377-.167L8.207 5.5Z" class="svelte-rmur07"></path></svg></div> <div class="item_title svelte-rmur07">Junk Email</div></div> <div class="section_item svelte-rmur07"><div class="item_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="m20.877 2.826.153.144.145.153a3.579 3.579 0 0 1-.145 4.908L9.062 19.999a2.25 2.25 0 0 1-1 .58l-5.115 1.395a.75.75 0 0 1-.92-.921l1.394-5.116a2.25 2.25 0 0 1 .58-.999L15.97 2.97a3.579 3.579 0 0 1 4.908-.144ZM15 6.06l-9.938 9.938a.75.75 0 0 0-.193.333l-1.05 3.85 3.85-1.05A.75.75 0 0 0 8 18.938L17.94 9 15 6.06ZM6.525 11l-1.5 1.5H2.75a.75.75 0 0 1 0-1.5h3.775Zm4-4-1.5 1.5H2.75a.75.75 0 1 1 0-1.5h7.775Zm6.505-2.97-.97.97 2.939 2.94.97-.97a2.078 2.078 0 1 0-2.939-2.94ZM14.525 3l-1.5 1.5H2.75a.75.75 0 1 1 0-1.5h11.775Z" class="svelte-rmur07"></path></svg></div> <div class="item_title svelte-rmur07">Drafts</div></div> <div class="section_item svelte-rmur07"><div class="item_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="M5.694 12 2.299 3.272c-.236-.607.356-1.188.942-.982l.093.04 18 9a.75.75 0 0 1 .097 1.283l-.097.058-18 9c-.583.291-1.217-.244-1.065-.847l.03-.096L5.694 12 2.299 3.272 5.694 12ZM4.402 4.54l2.61 6.71h6.627a.75.75 0 0 1 .743.648l.007.102a.75.75 0 0 1-.649.743l-.101.007H7.01l-2.609 6.71L19.322 12 4.401 4.54Z" class="svelte-rmur07"></path></svg></div> <div class="item_title svelte-rmur07">Sent Items</div></div> <div class="section_item svelte-rmur07"><div class="item_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="M12 1.75a3.25 3.25 0 0 1 3.245 3.066L15.25 5h5.25a.75.75 0 0 1 .102 1.493L20.5 6.5h-.796l-1.28 13.02a2.75 2.75 0 0 1-2.561 2.474l-.176.006H8.313a2.75 2.75 0 0 1-2.714-2.307l-.023-.174L4.295 6.5H3.5a.75.75 0 0 1-.743-.648L2.75 5.75a.75.75 0 0 1 .648-.743L3.5 5h5.25A3.25 3.25 0 0 1 12 1.75Zm6.197 4.75H5.802l1.267 12.872a1.25 1.25 0 0 0 1.117 1.122l.127.006h7.374c.6 0 1.109-.425 1.225-1.002l.02-.126L18.196 6.5ZM13.75 9.25a.75.75 0 0 1 .743.648L14.5 10v7a.75.75 0 0 1-1.493.102L13 17v-7a.75.75 0 0 1 .75-.75Zm-3.5 0a.75.75 0 0 1 .743.648L11 10v7a.75.75 0 0 1-1.493.102L9.5 17v-7a.75.75 0 0 1 .75-.75Zm1.75-6a1.75 1.75 0 0 0-1.744 1.606L10.25 5h3.5A1.75 1.75 0 0 0 12 3.25Z" class="svelte-rmur07"></path></svg></div> <div class="item_title svelte-rmur07">Deleted Items</div></div> <div class="section_item svelte-rmur07"><div class="item_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="M19.25 3c.966 0 1.75.784 1.75 1.75v2c0 .698-.408 1.3-1 1.581v9.919A3.75 3.75 0 0 1 16.25 22h-8.5A3.75 3.75 0 0 1 4 18.25V8.332A1.75 1.75 0 0 1 3 6.75v-2C3 3.784 3.784 3 4.75 3h14.5Zm-.75 5.5h-13v9.75a2.25 2.25 0 0 0 2.25 2.25h8.5a2.25 2.25 0 0 0 2.25-2.25V8.5Zm-8.5 3h4a.75.75 0 0 1 .102 1.493L14 13h-4a.75.75 0 0 1-.102-1.493L10 11.5h4-4Zm9.25-7H4.75a.25.25 0 0 0-.25.25v2c0 .138.112.25.25.25h14.5a.25.25 0 0 0 .25-.25v-2a.25.25 0 0 0-.25-.25Z" class="svelte-rmur07"></path></svg></div> <div class="item_title svelte-rmur07">Archive</div></div> <div class="section_item svelte-rmur07"><div class="item_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="M17.75 3A3.25 3.25 0 0 1 21 6.25v6.879a2.25 2.25 0 0 1-.659 1.59l-5.621 5.622a2.25 2.25 0 0 1-1.591.659H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3h11.5Zm0 1.5H6.25A1.75 1.75 0 0 0 4.5 6.25v11.5c0 .966.784 1.75 1.75 1.75H13v-3.25a3.25 3.25 0 0 1 3.066-3.245L16.25 13h3.25V6.25a1.75 1.75 0 0 0-1.75-1.75Zm.689 10H16.25a1.75 1.75 0 0 0-1.744 1.607l-.006.143v2.189l3.939-3.939Z" class="svelte-rmur07"></path></svg></div> <div class="item_title svelte-rmur07">Notes</div></div> <div class="section_item svelte-rmur07"><div class="item_icon svelte-rmur07"></div> <div class="item_title svelte-rmur07" style="color: var(--themePrimary);">Create new folder</div></div></div></div> <div class="navigation_section svelte-rmur07"><div class="section_nav svelte-rmur07"><div class="collapse_icon svelte-rmur07"><svg viewBox="0 0 24 24" class="svelte-rmur07"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-rmur07"></path></svg></div> <div class="title svelte-rmur07">Groups</div></div> <div class="section_body svelte-rmur07"><div class="section_item svelte-rmur07"><div class="item_icon svelte-rmur07"></div> <div class="item_title svelte-rmur07" style="color: var(--themePrimary);">New group</div></div></div></div>`;
				attr(div54, "class", "navigation_pane svelte-rmur07");
			},
			m(target, anchor) {
				insert(target, div54, anchor);
			},
			p: noop,
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div54);
				}
			}
		};
	}

	class NavigationPane extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, null, create_fragment$4, safe_not_equal, {});
		}
	}

	/* src\component\background\Ribbon.svelte generated by Svelte v4.2.0 */

	function create_fragment$3(ctx) {
		let div90;

		return {
			c() {
				div90 = element("div");
				div90.innerHTML = `<div class="top_navbar svelte-1e5nl0v"><div class="show_nav_pane_btn svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M6 12h12M6 15.5h12m-12-7h12" stroke="#000" stroke-linecap="round" stroke-linejoin="round" class="svelte-1e5nl0v"></path></svg></div> <div class="ribbon_option option_active svelte-1e5nl0v">Home</div> <div class="ribbon_option svelte-1e5nl0v">View</div> <div class="ribbon_option svelte-1e5nl0v">Help</div></div> <div class="ribbon_body svelte-1e5nl0v"><div class="mail_option_btn_container svelte-1e5nl0v"><a href="/"><div class="mail_btn svelte-1e5nl0v"><div class="mail_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M5.25 4h13.5a3.25 3.25 0 0 1 3.245 3.066L22 7.25v9.5a3.25 3.25 0 0 1-3.066 3.245L18.75 20H5.25a3.25 3.25 0 0 1-3.245-3.066L2 16.75v-9.5a3.25 3.25 0 0 1 3.066-3.245L5.25 4h13.5-13.5ZM20.5 9.373l-8.15 4.29a.75.75 0 0 1-.603.043l-.096-.042L3.5 9.374v7.376a1.75 1.75 0 0 0 1.606 1.744l.144.006h13.5a1.75 1.75 0 0 0 1.744-1.607l.006-.143V9.373ZM18.75 5.5H5.25a1.75 1.75 0 0 0-1.744 1.606L3.5 7.25v.429l8.5 4.473 8.5-4.474V7.25a1.75 1.75 0 0 0-1.607-1.744L18.75 5.5Z" class="svelte-1e5nl0v"></path></svg></div> <div class="mail_title">New mail</div></div></a> <div class="mail_btn btn_secondary svelte-1e5nl0v" style="margin-left: 1px; padding: 0;"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="svelte-1e5nl0v"><path d="M12 1.75a3.25 3.25 0 0 1 3.245 3.066L15.25 5h5.25a.75.75 0 0 1 .102 1.493L20.5 6.5h-.796l-1.28 13.02a2.75 2.75 0 0 1-2.561 2.474l-.176.006H8.313a2.75 2.75 0 0 1-2.714-2.307l-.023-.174L4.295 6.5H3.5a.75.75 0 0 1-.743-.648L2.75 5.75a.75.75 0 0 1 .648-.743L3.5 5h5.25A3.25 3.25 0 0 1 12 1.75Zm6.197 4.75H5.802l1.267 12.872a1.25 1.25 0 0 0 1.117 1.122l.127.006h7.374c.6 0 1.109-.425 1.225-1.002l.02-.126L18.196 6.5ZM13.75 9.25a.75.75 0 0 1 .743.648L14.5 10v7a.75.75 0 0 1-1.493.102L13 17v-7a.75.75 0 0 1 .75-.75Zm-3.5 0a.75.75 0 0 1 .743.648L11 10v7a.75.75 0 0 1-1.493.102L9.5 17v-7a.75.75 0 0 1 .75-.75Zm1.75-6a1.75 1.75 0 0 0-1.744 1.606L10.25 5h3.5A1.75 1.75 0 0 0 12 3.25Z" class="svelte-1e5nl0v"></path></svg></div> <div class="util_btn_title svelte-1e5nl0v">Delete</div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M19.25 3c.966 0 1.75.784 1.75 1.75v2c0 .698-.408 1.3-1 1.581v9.919A3.75 3.75 0 0 1 16.25 22h-8.5A3.75 3.75 0 0 1 4 18.25V8.332A1.75 1.75 0 0 1 3 6.75v-2C3 3.784 3.784 3 4.75 3h14.5Zm-.75 5.5h-13v9.75a2.25 2.25 0 0 0 2.25 2.25h8.5a2.25 2.25 0 0 0 2.25-2.25V8.5Zm-8.5 3h4a.75.75 0 0 1 .102 1.493L14 13h-4a.75.75 0 0 1-.102-1.493L10 11.5h4-4Zm9.25-7H4.75a.25.25 0 0 0-.25.25v2c0 .138.112.25.25.25h14.5a.25.25 0 0 0 .25-.25v-2a.25.25 0 0 0-.25-.25Z" fill="#498205" class="svelte-1e5nl0v"></path></svg></div> <div class="util_btn_title svelte-1e5nl0v">Archive</div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M12.45 2.15C14.992 4.057 17.587 5 20.25 5a.75.75 0 0 1 .75.75V11c0 5.001-2.958 8.676-8.725 10.948a.75.75 0 0 1-.55 0C5.958 19.676 3 16 3 11V5.75A.75.75 0 0 1 3.75 5c2.663 0 5.258-.943 7.8-2.85a.75.75 0 0 1 .9 0ZM12 3.678c-2.42 1.71-4.923 2.648-7.5 2.8V11c0 4.256 2.453 7.379 7.5 9.442 5.047-2.063 7.5-5.186 7.5-9.442V6.478c-2.577-.152-5.08-1.09-7.5-2.8ZM12 16a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm0-8.996a.75.75 0 0 1 .743.648l.007.102v6.498a.75.75 0 0 1-1.493.102l-.007-.102V7.754a.75.75 0 0 1 .75-.75Z" fill="#A4262C" class="svelte-1e5nl0v"></path></svg></div> <div class="util_btn_title svelte-1e5nl0v">Report</div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M22.452 1.923a.75.75 0 0 1 0 1.06l-6.928 6.929a5.751 5.751 0 0 1-.496 7.567l-.832.832-2.787 4.18a.75.75 0 0 1-1.154.115L1.769 14.12a.75.75 0 0 1 .115-1.154l4.18-2.787.832-.832a5.751 5.751 0 0 1 7.567-.496l6.929-6.928a.75.75 0 0 1 1.06 0ZM7.603 10.762l6.01 6.01.354-.353a4.25 4.25 0 0 0-6.01-6.01l-.354.353Zm-1.156.965-2.97 1.98 7.191 7.191 1.98-2.97-6.201-6.201Z" class="svelte-1e5nl0v"></path></svg></div> <div class="util_btn_title svelte-1e5nl0v">Sweep</div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M17.5 11a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11ZM8.207 4c.46 0 .908.141 1.284.402l.156.12L12.022 6.5h7.728a2.25 2.25 0 0 1 2.229 1.938l.016.158.005.154v3.06a6.517 6.517 0 0 0-1.499-1.077L20.5 8.75a.75.75 0 0 0-.648-.743L19.75 8h-7.729L9.647 9.979a2.25 2.25 0 0 1-1.244.512l-.196.009-4.707-.001v7.251c0 .38.282.694.648.743l.102.007h7.064c.172.534.412 1.038.709 1.501L4.25 20a2.25 2.25 0 0 1-2.245-2.096L2 17.75V6.25a2.25 2.25 0 0 1 2.096-2.245L4.25 4h3.957Zm9.585 9.545-.076.044-.07.057-.057.07a.5.5 0 0 0 0 .568l.057.07L19.292 16H14l-.09.008a.5.5 0 0 0-.402.402l-.008.09.008.09a.5.5 0 0 0 .402.402L14 17h5.292l-1.646 1.646-.057.07a.5.5 0 0 0 .695.695l.07-.057 2.528-2.532.046-.063.034-.068.021-.063.015-.082L21 16.5l-.003-.053-.014-.075-.03-.083-.042-.074-.045-.056-2.512-2.513-.07-.057a.5.5 0 0 0-.492-.044ZM8.207 5.5H4.25a.75.75 0 0 0-.743.648L3.5 6.25v2.749L8.207 9a.75.75 0 0 0 .395-.113l.085-.06 1.891-1.578-1.89-1.575a.75.75 0 0 0-.377-.167L8.207 5.5Z" fill="#0078D4" class="svelte-1e5nl0v"></path></svg></div> <div class="util_btn_title svelte-1e5nl0v">Move to</div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="ribbon_separator svelte-1e5nl0v"></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M13.277 16.221a.75.75 0 0 1-1.061 1.06l-4.997-5.003a.75.75 0 0 1 0-1.06l4.997-4.998a.75.75 0 0 1 1.061 1.06L9.557 11h3.842c1.595 0 2.81.242 3.889.764l.246.126a6.203 6.203 0 0 1 2.576 2.576c.61 1.14.89 2.418.89 4.135a.75.75 0 0 1-1.5 0c0-1.484-.228-2.52-.713-3.428a4.702 4.702 0 0 0-1.96-1.96c-.838-.448-1.786-.676-3.094-.709L13.4 12.5H9.562l3.715 3.721Zm-4-10.001a.75.75 0 0 1 0 1.06L4.81 11.748l4.467 4.473a.75.75 0 0 1-1.061 1.06l-4.997-5.003a.75.75 0 0 1 0-1.06L8.217 6.22a.75.75 0 0 1 1.06 0Z" fill="#881798" class="svelte-1e5nl0v"></path></svg></div> <div class="util_btn_title svelte-1e5nl0v">Reply all</div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="ribbon_separator svelte-1e5nl0v"></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m3.1 8.17 8.517-5.065a.75.75 0 0 1 .662-.051l.104.051L20.9 8.17a2.25 2.25 0 0 1 1.094 1.765l.006.17v7.646a3.25 3.25 0 0 1-3.066 3.245L18.75 21H5.25a3.25 3.25 0 0 1-3.245-3.066L2 17.75v-7.647c0-.737.36-1.423.958-1.842L3.1 8.17l8.517-5.064L3.1 8.17Zm17.4 2.74-8.153 4.255a.75.75 0 0 1-.582.047l-.112-.047L3.5 10.91v6.84a1.75 1.75 0 0 0 1.606 1.744l.144.006h13.5a1.75 1.75 0 0 0 1.744-1.607l.006-.143v-6.84ZM12 4.623l-8.092 4.81L12 13.654l8.09-4.222L12 4.622Z" class="svelte-1e5nl0v"></path></svg></div> <div class="util_btn_title svelte-1e5nl0v">Read / Unread</div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M19.75 2A2.25 2.25 0 0 1 22 4.25v5.462a3.25 3.25 0 0 1-.952 2.298l-8.5 8.503a3.255 3.255 0 0 1-4.597.001L3.489 16.06a3.25 3.25 0 0 1-.003-4.596l8.5-8.51A3.25 3.25 0 0 1 14.284 2h5.465Zm0 1.5h-5.465c-.465 0-.91.185-1.239.513l-8.512 8.523a1.75 1.75 0 0 0 .015 2.462l4.461 4.454a1.755 1.755 0 0 0 2.477 0l8.5-8.503a1.75 1.75 0 0 0 .513-1.237V4.25a.75.75 0 0 0-.75-.75ZM17 5.502a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" class="svelte-1e5nl0v"></path></svg></div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M3 3.747a.75.75 0 0 1 .75-.75h16.504a.75.75 0 0 1 .6 1.2L16.69 9.748l4.164 5.552a.75.75 0 0 1-.6 1.2H4.5v4.749a.75.75 0 0 1-.648.743L3.75 22a.75.75 0 0 1-.743-.648L3 21.249V3.747Zm15.754.75H4.5V15h14.254l-3.602-4.802a.75.75 0 0 1 0-.9l3.602-4.8Z" fill="#A8262C" class="svelte-1e5nl0v"></path></svg></div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m16.242 2.932 4.826 4.826a2.75 2.75 0 0 1-.715 4.404l-4.87 2.435a.75.75 0 0 0-.374.426l-1.44 4.166a1.25 1.25 0 0 1-2.065.476L8.5 16.561 4.06 21H3v-1.06l4.44-4.44-3.105-3.104a1.25 1.25 0 0 1 .476-2.066l4.166-1.44a.75.75 0 0 0 .426-.373l2.435-4.87a2.75 2.75 0 0 1 4.405-.715Zm3.766 5.886-4.826-4.826a1.25 1.25 0 0 0-2.002.325l-2.435 4.871a2.25 2.25 0 0 1-1.278 1.12l-3.789 1.31 6.705 6.704 1.308-3.789a2.25 2.25 0 0 1 1.12-1.277l4.872-2.436a1.25 1.25 0 0 0 .325-2.002Z" fill="#0078D4" class="svelte-1e5nl0v"></path></svg></div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M12 2c5.523 0 10 4.478 10 10s-4.477 10-10 10S2 17.522 2 12 6.477 2 12 2Zm0 1.667c-4.595 0-8.333 3.738-8.333 8.333 0 4.595 3.738 8.333 8.333 8.333 4.595 0 8.333-3.738 8.333-8.333 0-4.595-3.738-8.333-8.333-8.333ZM11.25 6a.75.75 0 0 1 .743.648L12 6.75V12h3.25a.75.75 0 0 1 .102 1.493l-.102.007h-4a.75.75 0 0 1-.743-.648l-.007-.102v-6a.75.75 0 0 1 .75-.75Z" class="svelte-1e5nl0v"></path></svg></div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="ribbon_separator svelte-1e5nl0v"></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M15.752 3a2.25 2.25 0 0 1 2.25 2.25v.753h.75a3.254 3.254 0 0 1 3.252 3.25l.003 5.997a2.249 2.249 0 0 1-2.248 2.25H18v1.25A2.25 2.25 0 0 1 15.75 21h-7.5A2.25 2.25 0 0 1 6 18.75V17.5H4.25A2.25 2.25 0 0 1 2 15.25V9.254a3.25 3.25 0 0 1 3.25-3.25l.749-.001L6 5.25A2.25 2.25 0 0 1 8.25 3h7.502Zm-.002 10.5h-7.5a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h7.5a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 0-.75-.75Zm3.002-5.996H5.25a1.75 1.75 0 0 0-1.75 1.75v5.996c0 .414.336.75.75.75H6v-1.75A2.25 2.25 0 0 1 8.25 12h7.5A2.25 2.25 0 0 1 18 14.25V16h1.783a.749.749 0 0 0 .724-.749l-.003-5.997a1.754 1.754 0 0 0-1.752-1.75Zm-3-3.004H8.25a.75.75 0 0 0-.75.75l-.001.753h9.003V5.25a.75.75 0 0 0-.75-.75Z" class="svelte-1e5nl0v"></path></svg></div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="ribbon_separator svelte-1e5nl0v"></div> <div class="util_btn_container svelte-1e5nl0v"><div class="util_btn svelte-1e5nl0v"><div class="util_btn_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M4.75 2a.75.75 0 0 1 .743.648l.007.102v5.69l4.574-4.56a6.41 6.41 0 0 1 8.879-.179l.186.18a6.41 6.41 0 0 1 0 9.063l-8.846 8.84a.75.75 0 0 1-1.06-1.062l8.845-8.838a4.91 4.91 0 0 0-6.766-7.112l-.178.17L6.562 9.5h5.688a.75.75 0 0 1 .743.648l.007.102a.75.75 0 0 1-.648.743L12.25 11h-7.5a.75.75 0 0 1-.743-.648L4 10.25v-7.5A.75.75 0 0 1 4.75 2Z" class="svelte-1e5nl0v"></path></svg></div></div> <div class="util_btn util_btn_secondary svelte-1e5nl0v"><div class="expand_icon svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="m4.296 12 8.492-8.727a.75.75 0 1 0-1.075-1.046l-9 9.25a.75.75 0 0 0 0 1.046l9 9.25a.75.75 0 1 0 1.075-1.046L4.295 12Z" class="svelte-1e5nl0v"></path></svg></div></div></div> <div class="ribbon_separator svelte-1e5nl0v"></div> <div class="show_more_btn svelte-1e5nl0v"><svg viewBox="0 0 24 24" class="svelte-1e5nl0v"><path d="M7.75 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM13.75 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM18 13.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z" class="svelte-1e5nl0v"></path></svg></div></div>`;
				attr(div90, "class", "ribbon svelte-1e5nl0v");
			},
			m(target, anchor) {
				insert(target, div90, anchor);
			},
			p: noop,
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div90);
				}
			}
		};
	}

	class Ribbon extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, null, create_fragment$3, safe_not_equal, {});
		}
	}

	/* src\component\background\Sidebar.svelte generated by Svelte v4.2.0 */

	function create_fragment$2(ctx) {
		let div20;

		return {
			c() {
				div20 = element("div");

				div20.innerHTML = `<div class="app_button svelte-yoaio8"><div class="icon_container icon_selected svelte-yoaio8"><svg viewBox="0 0 24 24" class="svelte-yoaio8"><path d="M22 8.608v8.142a3.25 3.25 0 0 1-3.066 3.245L18.75 20H5.25a3.25 3.25 0 0 1-3.245-3.066L2 16.75V8.608l9.652 5.056a.75.75 0 0 0 .696 0L22 8.608ZM5.25 4h13.5a3.25 3.25 0 0 1 3.234 2.924L12 12.154l-9.984-5.23a3.25 3.25 0 0 1 3.048-2.919L5.25 4h13.5-13.5Z"></path></svg></div></div> <div class="app_button svelte-yoaio8"><div class="icon_container icon_hoverable svelte-yoaio8"><svg viewBox="0 0 24 24" class="svelte-yoaio8"><path d="M17.75 3A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3h11.5Zm1.75 5.5h-15v9.25c0 .966.784 1.75 1.75 1.75h11.5a1.75 1.75 0 0 0 1.75-1.75V8.5Zm-11.75 6a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm4.25 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm-4.25-4a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm4.25 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm4.25 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm1.5-6H6.25A1.75 1.75 0 0 0 4.5 6.25V7h15v-.75a1.75 1.75 0 0 0-1.75-1.75Z"></path></svg></div></div> <div class="app_button svelte-yoaio8"><div class="icon_container icon_hoverable svelte-yoaio8"><svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="svelte-yoaio8"><path d="M4 13.999 13 14a2 2 0 0 1 1.995 1.85L15 16v1.5C14.999 21 11.284 22 8.5 22c-2.722 0-6.335-.956-6.495-4.27L2 17.5v-1.501c0-1.054.816-1.918 1.85-1.995L4 14ZM15.22 14H20c1.054 0 1.918.816 1.994 1.85L22 16v1c-.001 3.062-2.858 4-5 4a7.16 7.16 0 0 1-2.14-.322c.336-.386.607-.827.802-1.327A6.19 6.19 0 0 0 17 19.5l.267-.006c.985-.043 3.086-.363 3.226-2.289L20.5 17v-1a.501.501 0 0 0-.41-.492L20 15.5h-4.051a2.957 2.957 0 0 0-.595-1.34L15.22 14H20h-4.78ZM4 15.499l-.1.01a.51.51 0 0 0-.254.136.506.506 0 0 0-.136.253l-.01.101V17.5c0 1.009.45 1.722 1.417 2.242.826.445 2.003.714 3.266.753l.317.005.317-.005c1.263-.039 2.439-.308 3.266-.753.906-.488 1.359-1.145 1.412-2.057l.005-.186V16a.501.501 0 0 0-.41-.492L13 15.5l-9-.001ZM8.5 3a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm9 2a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm-9-.5c-1.654 0-3 1.346-3 3s1.346 3 3 3 3-1.346 3-3-1.346-3-3-3Zm9 2c-1.103 0-2 .897-2 2s.897 2 2 2 2-.897 2-2-.897-2-2-2Z"></path></svg></div></div> <div class="app_button svelte-yoaio8"><div class="icon_container icon_hoverable svelte-yoaio8"><svg viewBox="0 0 256 256" style="left:50%; top: 50%; transform: rotate(180deg) translate(50%, 50%);" class="svelte-yoaio8"><path d="m212.474 136.486-82.054 81.947a60 60 0 0 1-84.846-84.86l98.154-97.87a40 40 0 0 1 56.556 56.581q-.082.082-.164.161l-95.805 92.197a12 12 0 1 1-16.642-17.293l95.71-92.106a16 16 0 0 0-22.696-22.557l-98.155 97.87a36 36 0 0 0 50.924 50.9l82.058-81.952a12 12 0 0 1 16.96 16.982Z"></path></svg></div></div> <div class="app_button svelte-yoaio8"><div class="icon_container svelte-yoaio8"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1007.922 821.827" class="svelte-yoaio8"><defs><radialGradient id="c" cx="410.201" cy="853.349" r="85" gradientTransform="rotate(45 546.823 785.354)" gradientUnits="userSpaceOnUse"><stop offset=".5" stop-opacity=".13"></stop><stop offset=".994" stop-opacity="0"></stop></radialGradient><radialGradient id="e" cx="1051.126" cy="1265.852" r="85" gradientTransform="rotate(-135 769.601 767.5)" xlink:href="#c"></radialGradient><radialGradient id="h" cx="27.608" cy="2001.37" r="85" gradientTransform="scale(1 -1) rotate(45 2979.231 860.248)" xlink:href="#c"></radialGradient><linearGradient id="a" x1="700.766" y1="597.024" x2="749.765" y2="597.024" gradientTransform="matrix(.867 0 0 1.307 86.603 -142.296)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-opacity=".13"></stop><stop offset=".994" stop-opacity="0"></stop></linearGradient><linearGradient id="f" x1="1880.8" y1="34.286" x2="1929.799" y2="34.286" gradientTransform="matrix(.867 0 0 -.796 -1446.031 767.147)" xlink:href="#a"></linearGradient><linearGradient id="i" x1="308.378" y1="811.629" x2="919.318" y2="200.689" gradientTransform="rotate(-45 613.848 506.16)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2987e6"></stop><stop offset=".994" stop-color="#58c1f5"></stop></linearGradient><mask id="b" x="317.137" y="651.827" width="170" height="205.208" maskUnits="userSpaceOnUse"><path class="a" d="m402.137 736.828 60.104 60.104-60.104 60.104-60.104-60.104z"></path></mask><mask id="d" x="837.922" y="95.835" width="205.208" height="205.208" maskUnits="userSpaceOnUse"><path class="a" d="M983.024 276.146 862.816 155.938l60.104-60.104 120.208 120.208z"></path></mask><mask id="g" x="-35.208" y="299.482" width="205.208" height="205.208" maskUnits="userSpaceOnUse"><path class="a" d="M-35.209 419.69 85 299.482l60.104 60.104L24.895 479.794z"></path></mask><style>.a {
							fill: #fff;
						}</style></defs><path transform="rotate(45 852.293 570.04)" style="fill:url(#a)" d="M694.422 269.785h42.5v736.5h-42.5z"></path><g style="mask:url(#b)"><circle cx="402.137" cy="736.827" r="85" style="fill:url(#c)"></circle></g><g style="mask:url(#d)"><circle cx="922.922" cy="216.043" r="85" style="fill:url(#e)"></circle></g><path transform="rotate(135 226.655 679.927)" style="fill:url(#f)" d="M185.305 515.608h42.5v448.5h-42.5z"></path><g style="mask:url(#g)"><circle cx="85" cy="419.69" r="85" style="fill:url(#h)"></circle></g><rect x="164.378" y="319.982" width="288" height="576" rx="42.5" transform="rotate(-45 163.692 559.456)" style="fill:#195abd"></rect><rect x="469.848" y="74.159" width="288" height="864" rx="42.5" transform="rotate(45 750.47 438.164)" style="fill:url(#i)"></rect></svg></div></div> <div class="app_button svelte-yoaio8"><div class="icon_container svelte-yoaio8"><svg version="1.1" id="Livello_1" xmlns:x="&amp;ns_extend;" xmlns:i="&amp;ns_ai;" xmlns:graph="&amp;ns_graphs;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1881.25 1750" enable-background="new 0 0 1881.25 1750" xml:space="preserve" class="svelte-yoaio8"><metadata><sfw xmlns="&amp;ns_sfw;"><slices></slices><sliceSourceBounds bottomleftorigin="true" height="1750" width="1881.25" x="-938.5" y="-851"></sliceSourceBounds></sfw></metadata><path fill="#41A5EE" d="M1801.056,0H517.694C473.404,0,437.5,35.904,437.5,80.194c0,0,0,0,0,0V437.5l743.75,218.75l700-218.75
	V80.194C1881.25,35.904,1845.346,0,1801.056,0L1801.056,0z"></path><path fill="#2B7CD3" d="M1881.25,437.5H437.5V875l743.75,131.25l700-131.25V437.5z"></path><path fill="#185ABD" d="M437.5,875v437.5l700,87.5l743.75-87.5V875H437.5z"></path><path fill="#103F91" d="M517.694,1750h1283.363c44.29,0,80.194-35.904,80.194-80.194l0,0V1312.5H437.5v357.306
	C437.5,1714.096,473.404,1750,517.694,1750L517.694,1750z"></path><path opacity="0.1" enable-background="new    " d="M969.806,350H437.5v1093.75h532.306c44.23-0.144,80.05-35.964,80.194-80.194
	V430.194C1049.856,385.964,1014.036,350.144,969.806,350z"></path><path opacity="0.2" enable-background="new    " d="M926.056,393.75H437.5V1487.5h488.556c44.23-0.144,80.05-35.964,80.194-80.194
	V473.944C1006.106,429.714,970.286,393.894,926.056,393.75z"></path><path opacity="0.2" enable-background="new    " d="M926.056,393.75H437.5V1400h488.556c44.23-0.144,80.05-35.964,80.194-80.194
	V473.944C1006.106,429.714,970.286,393.894,926.056,393.75z"></path><path opacity="0.2" enable-background="new    " d="M882.306,393.75H437.5V1400h444.806c44.23-0.144,80.05-35.964,80.194-80.194
	V473.944C962.356,429.714,926.536,393.894,882.306,393.75z"></path><linearGradient id="SVGID_3_" gradientUnits="userSpaceOnUse" x1="167.2057" y1="1420.9117" x2="795.2943" y2="333.0883" gradientTransform="matrix(1 0 0 -1 0 1752)"><stop offset="0" style="stop-color:#2368C4"></stop><stop offset="0.5" style="stop-color:#1A5DBE"></stop><stop offset="1" style="stop-color:#1146AC"></stop></linearGradient><path fill="url(#SVGID_3_)" d="M80.194,393.75h802.112c44.29,0,80.194,35.904,80.194,80.194v802.113
	c0,44.29-35.904,80.194-80.194,80.194H80.194c-44.29,0-80.194-35.904-80.194-80.194V473.944C0,429.654,35.904,393.75,80.194,393.75z
	"></path><path fill="#FFFFFF" d="M329.088,1008.788c1.575,12.381,2.625,23.144,3.106,32.375h1.837c0.7-8.75,2.158-19.294,4.375-31.631
	c2.217-12.338,4.215-22.765,5.994-31.281l84.35-363.913h109.069l87.5,358.444c5.084,22.288,8.723,44.881,10.894,67.637h1.444
	c1.631-22.047,4.671-43.966,9.1-65.625l69.781-360.631h99.269l-122.588,521.5H577.238L494.113,790.3
	c-2.406-9.931-5.162-22.925-8.181-38.894c-3.019-15.969-4.9-27.65-5.644-35h-1.444c-0.962,8.487-2.844,21.088-5.644,37.8
	c-2.8,16.713-5.046,29.079-6.738,37.1l-78.138,344.269h-117.95L147.131,614.337h101.062l75.994,364.656
	C325.894,986.475,327.513,996.45,329.088,1008.788z"></path></svg></div></div> <div class="app_button svelte-yoaio8"><div class="icon_container svelte-yoaio8"><svg version="1.1" id="Livello_1" xmlns:x="&amp;ns_extend;" xmlns:i="&amp;ns_ai;" xmlns:graph="&amp;ns_graphs;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 2289.75 2130" enable-background="new 0 0 2289.75 2130" xml:space="preserve" class="svelte-yoaio8"><metadata><sfw xmlns="&amp;ns_sfw;"><slices></slices><sliceSourceBounds bottomleftorigin="true" height="2130" width="2289.75" x="-1147.5" y="-1041"></sliceSourceBounds></sfw></metadata><path fill="#185C37" d="M1437.75,1011.75L532.5,852v1180.393c0,53.907,43.7,97.607,97.607,97.607l0,0h1562.036
	c53.907,0,97.607-43.7,97.607-97.607l0,0V1597.5L1437.75,1011.75z"></path><path fill="#21A366" d="M1437.75,0H630.107C576.2,0,532.5,43.7,532.5,97.607c0,0,0,0,0,0V532.5l905.25,532.5L1917,1224.75
	L2289.75,1065V532.5L1437.75,0z"></path><path fill="#107C41" d="M532.5,532.5h905.25V1065H532.5V532.5z"></path><path opacity="0.1" enable-background="new    " d="M1180.393,426H532.5v1331.25h647.893c53.834-0.175,97.432-43.773,97.607-97.607
	V523.607C1277.825,469.773,1234.227,426.175,1180.393,426z"></path><path opacity="0.2" enable-background="new    " d="M1127.143,479.25H532.5V1810.5h594.643
	c53.834-0.175,97.432-43.773,97.607-97.607V576.857C1224.575,523.023,1180.977,479.425,1127.143,479.25z"></path><path opacity="0.2" enable-background="new    " d="M1127.143,479.25H532.5V1704h594.643c53.834-0.175,97.432-43.773,97.607-97.607
	V576.857C1224.575,523.023,1180.977,479.425,1127.143,479.25z"></path><path opacity="0.2" enable-background="new    " d="M1073.893,479.25H532.5V1704h541.393c53.834-0.175,97.432-43.773,97.607-97.607
	V576.857C1171.325,523.023,1127.727,479.425,1073.893,479.25z"></path><linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="203.5132" y1="1729.0183" x2="967.9868" y2="404.9817" gradientTransform="matrix(1 0 0 -1 0 2132)"><stop offset="0" style="stop-color:#18884F"></stop><stop offset="0.5" style="stop-color:#117E43"></stop><stop offset="1" style="stop-color:#0B6631"></stop></linearGradient><path fill="url(#SVGID_1_)" d="M97.607,479.25h976.285c53.907,0,97.607,43.7,97.607,97.607v976.285
	c0,53.907-43.7,97.607-97.607,97.607H97.607C43.7,1650.75,0,1607.05,0,1553.143V576.857C0,522.95,43.7,479.25,97.607,479.25z"></path><path fill="#FFFFFF" d="M302.3,1382.264l205.332-318.169L319.5,747.683h151.336l102.666,202.35
	c9.479,19.223,15.975,33.494,19.49,42.919h1.331c6.745-15.336,13.845-30.228,21.3-44.677L725.371,747.79h138.929l-192.925,314.548
	L869.2,1382.263H721.378L602.79,1160.158c-5.586-9.45-10.326-19.376-14.164-29.66h-1.757c-3.474,10.075-8.083,19.722-13.739,28.755
	l-122.102,223.011H302.3z"></path><path fill="#33C481" d="M2192.143,0H1437.75v532.5h852V97.607C2289.75,43.7,2246.05,0,2192.143,0L2192.143,0z"></path><path fill="#107C41" d="M1437.75,1065h852v532.5h-852V1065z"></path></svg></div></div> <div class="app_button svelte-yoaio8"><div class="icon_container svelte-yoaio8"><svg version="1.1" id="Livello_1" xmlns:x="&amp;ns_extend;" xmlns:i="&amp;ns_ai;" xmlns:graph="&amp;ns_graphs;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1919.95 1786" enable-background="new 0 0 1919.95 1786" xml:space="preserve" class="svelte-yoaio8"><metadata><sfw xmlns="&amp;ns_sfw;"><slices></slices><sliceSourceBounds bottomleftorigin="true" height="1786" width="1919.95" x="-936.475" y="-869"></sliceSourceBounds></sfw></metadata><path fill="#ED6C47" d="M1160.9,982.3L1026.95,0h-10.002C529.872,1.422,135.372,395.922,133.95,882.998V893L1160.9,982.3z"></path><path fill="#FF8F6B" d="M1036.952,0h-10.002v893l446.5,178.6l446.5-178.6v-10.002C1918.528,395.922,1524.028,1.422,1036.952,0z"></path><path fill="#D35230" d="M1919.95,893v9.823c-1.398,487.185-395.992,881.779-883.177,883.177h-19.646
	c-487.185-1.398-881.779-395.992-883.177-883.177V893H1919.95z"></path><path opacity="0.1" enable-background="new    " d="M1071.6,438.909v952.831c-0.222,33.109-20.286,62.852-50.901,75.458
	c-9.748,4.123-20.224,6.249-30.809,6.251H344.698c-12.502-14.288-24.557-29.469-35.72-44.65
	c-113.755-151.749-175.176-336.324-175.028-525.977v-19.646c-0.261-171.062,49.733-338.433,143.773-481.327
	c9.823-15.181,20.092-30.362,31.255-44.65h680.912C1034.876,357.54,1071.26,393.924,1071.6,438.909z"></path><path opacity="0.2" enable-background="new    " d="M1026.95,483.56v952.831c-0.002,10.584-2.128,21.061-6.251,30.808
	c-12.606,30.615-42.35,50.679-75.459,50.901H385.329c-14.127-14.342-27.682-29.237-40.632-44.65
	c-12.502-14.288-24.557-29.469-35.72-44.65c-113.755-151.749-175.176-336.325-175.028-525.977v-19.646
	c-0.261-171.062,49.733-338.433,143.773-481.327H945.24C990.226,402.19,1026.61,438.574,1026.95,483.56z"></path><path opacity="0.2" enable-background="new    " d="M1026.95,483.56v863.531c-0.34,44.985-36.724,81.369-81.709,81.71H308.978
	c-113.755-151.749-175.176-336.325-175.028-525.977v-19.646c-0.261-171.062,49.733-338.433,143.773-481.327H945.24
	C990.226,402.19,1026.61,438.574,1026.95,483.56z"></path><path opacity="0.2" enable-background="new    " d="M982.3,483.56v863.531c-0.34,44.985-36.724,81.369-81.709,81.71H308.978
	c-113.755-151.749-175.176-336.325-175.028-525.977v-19.646c-0.261-171.062,49.733-338.433,143.773-481.327h622.867
	C945.576,402.19,981.96,438.574,982.3,483.56z"></path><linearGradient id="SVGID_2_" gradientUnits="userSpaceOnUse" x1="170.6454" y1="1450.1008" x2="811.6547" y2="339.8992" gradientTransform="matrix(1 0 0 -1 0 1788)"><stop offset="0" style="stop-color:#CA4C28"></stop><stop offset="0.5" style="stop-color:#C5401E"></stop><stop offset="1" style="stop-color:#B62F14"></stop></linearGradient><path fill="url(#SVGID_2_)" d="M81.843,401.85h818.613c45.201,0,81.843,36.643,81.843,81.843v818.613
	c0,45.201-36.643,81.844-81.843,81.844H81.843C36.643,1384.15,0,1347.507,0,1302.307V483.693C0,438.493,36.643,401.85,81.843,401.85
	z"></path><path fill="#FFFFFF" d="M500.08,620.144c53.289-3.596,106.119,11.883,149.042,43.668c35.8,31.961,54.929,78.599,51.883,126.493
	c0.585,33.294-8.287,66.071-25.584,94.524c-17.512,27.964-42.742,50.263-72.646,64.207c-34.187,15.9-71.564,23.751-109.259,22.95
	H389.973v192.441H283.929V620.144H500.08z M389.884,888.848h91.265c28.933,2.125,57.641-6.438,80.683-24.066
	c19.058-18.282,29.047-44.063,27.281-70.413c0-59.98-34.857-89.97-104.57-89.97h-94.658V888.848z"></path></svg></div></div> <div class="app_button svelte-yoaio8"><div class="icon_container svelte-yoaio8"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 5.5 32 20.5" class="svelte-yoaio8"><title>OfficeCore10_32x_24x_20x_16x_01-22-2019</title><g id="STYLE_COLOR"><path d="M12.20245,11.19292l.00031-.0011,6.71765,4.02379,4.00293-1.68451.00018.00068A6.4768,6.4768,0,0,1,25.5,13c.14764,0,.29358.0067.43878.01639a10.00075,10.00075,0,0,0-18.041-3.01381C7.932,10.00215,7.9657,10,8,10A7.96073,7.96073,0,0,1,12.20245,11.19292Z" fill="#0364b8"></path><path d="M12.20276,11.19182l-.00031.0011A7.96073,7.96073,0,0,0,8,10c-.0343,0-.06805.00215-.10223.00258A7.99676,7.99676,0,0,0,1.43732,22.57277l5.924-2.49292,2.63342-1.10819,5.86353-2.46746,3.06213-1.28859Z" fill="#0078d4"></path><path d="M25.93878,13.01639C25.79358,13.0067,25.64764,13,25.5,13a6.4768,6.4768,0,0,0-2.57648.53178l-.00018-.00068-4.00293,1.68451,1.16077.69528L23.88611,18.19l1.66009.99438,5.67633,3.40007a6.5002,6.5002,0,0,0-5.28375-9.56805Z" fill="#1490df"></path><path d="M25.5462,19.18437,23.88611,18.19l-3.80493-2.2791-1.16077-.69528L15.85828,16.5042,9.99475,18.97166,7.36133,20.07985l-5.924,2.49292A7.98889,7.98889,0,0,0,8,26H25.5a6.49837,6.49837,0,0,0,5.72253-3.41556Z" fill="#28a8ea"></path></g></svg></div></div> <div class="app_button svelte-yoaio8"><div class="icon_container icon_hoverable svelte-yoaio8"><svg viewBox="0 0 24 24" style="width: 24px; height: 24px;" class="svelte-yoaio8"><path d="M18.25 3A2.75 2.75 0 0 1 21 5.75v12.5A2.75 2.75 0 0 1 18.25 21H5.75A2.75 2.75 0 0 1 3 18.25V5.75A2.75 2.75 0 0 1 5.75 3h12.5Zm0 1.5H5.75c-.69 0-1.25.56-1.25 1.25v12.5c0 .69.56 1.25 1.25 1.25h12.5c.69 0 1.25-.56 1.25-1.25V5.75c0-.69-.56-1.25-1.25-1.25Zm-8.498 8c.966 0 1.75.784 1.75 1.75v2A1.75 1.75 0 0 1 9.752 18h-2a1.75 1.75 0 0 1-1.75-1.75v-2c0-.966.783-1.75 1.75-1.75h2Zm6.497 0c.967 0 1.75.784 1.75 1.75v2A1.75 1.75 0 0 1 16.25 18h-2a1.75 1.75 0 0 1-1.75-1.75v-2c0-.966.784-1.75 1.75-1.75h2ZM9.752 14h-2a.25.25 0 0 0-.25.25v2c0 .138.112.25.25.25h2a.25.25 0 0 0 .25-.25v-2a.25.25 0 0 0-.25-.25Zm6.497 0h-2a.25.25 0 0 0-.25.25v2c0 .138.112.25.25.25h2a.25.25 0 0 0 .25-.25v-2a.25.25 0 0 0-.25-.25ZM9.751 6c.966 0 1.75.784 1.75 1.75v2a1.75 1.75 0 0 1-1.75 1.75h-2A1.75 1.75 0 0 1 6 9.75v-2C6 6.784 6.784 6 7.75 6h2Zm6.497 0c.967 0 1.75.784 1.75 1.75v2a1.75 1.75 0 0 1-1.75 1.75h-2a1.75 1.75 0 0 1-1.75-1.75v-2c0-.966.784-1.75 1.75-1.75h2ZM9.751 7.5h-2a.25.25 0 0 0-.25.25v2c0 .138.112.25.25.25h2a.25.25 0 0 0 .25-.25v-2a.25.25 0 0 0-.25-.25Zm6.497 0h-2a.25.25 0 0 0-.25.25v2c0 .138.112.25.25.25h2a.25.25 0 0 0 .25-.25v-2a.25.25 0 0 0-.25-.25Z"></path></svg></div></div>`;

				attr(div20, "class", "sidebar svelte-yoaio8");
			},
			m(target, anchor) {
				insert(target, div20, anchor);
			},
			p: noop,
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) {
					detach(div20);
				}
			}
		};
	}

	class Sidebar extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, null, create_fragment$2, safe_not_equal, {});
		}
	}

	/* src\component\background\Background.svelte generated by Svelte v4.2.0 */

	function create_default_slot$1(ctx) {
		let ribbon;
		let t0;
		let div;
		let navigationpane;
		let t1;
		let current;
		ribbon = new Ribbon({});
		navigationpane = new NavigationPane({});
		const default_slot_template = /*#slots*/ ctx[1].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

		return {
			c() {
				create_component(ribbon.$$.fragment);
				t0 = space();
				div = element("div");
				create_component(navigationpane.$$.fragment);
				t1 = space();
				if (default_slot) default_slot.c();
				attr(div, "class", "main_module svelte-170voui");
			},
			m(target, anchor) {
				mount_component(ribbon, target, anchor);
				insert(target, t0, anchor);
				insert(target, div, anchor);
				mount_component(navigationpane, div, null);
				append(div, t1);

				if (default_slot) {
					default_slot.m(div, null);
				}

				current = true;
			},
			p(ctx, dirty) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[3],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
							null
						);
					}
				}
			},
			i(local) {
				if (current) return;
				transition_in(ribbon.$$.fragment, local);
				transition_in(navigationpane.$$.fragment, local);
				transition_in(default_slot, local);
				current = true;
			},
			o(local) {
				transition_out(ribbon.$$.fragment, local);
				transition_out(navigationpane.$$.fragment, local);
				transition_out(default_slot, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(t0);
					detach(div);
				}

				destroy_component(ribbon, detaching);
				destroy_component(navigationpane);
				if (default_slot) default_slot.d(detaching);
			}
		};
	}

	function create_fragment$1(ctx) {
		let div;
		let header;
		let updating_userInitials;
		let t0;
		let sidebar;
		let t1;
		let mainappbackground;
		let current;

		function header_userInitials_binding(value) {
			/*header_userInitials_binding*/ ctx[2](value);
		}

		let header_props = {};

		if (/*userInitials*/ ctx[0] !== void 0) {
			header_props.userInitials = /*userInitials*/ ctx[0];
		}

		header = new Header({ props: header_props });
		binding_callbacks.push(() => bind(header, 'userInitials', header_userInitials_binding));
		sidebar = new Sidebar({});

		mainappbackground = new MainAppBackground({
				props: {
					$$slots: { default: [create_default_slot$1] },
					$$scope: { ctx }
				}
			});

		return {
			c() {
				div = element("div");
				create_component(header.$$.fragment);
				t0 = space();
				create_component(sidebar.$$.fragment);
				t1 = space();
				create_component(mainappbackground.$$.fragment);
				attr(div, "class", "background svelte-170voui");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(header, div, null);
				append(div, t0);
				mount_component(sidebar, div, null);
				append(div, t1);
				mount_component(mainappbackground, div, null);
				current = true;
			},
			p(ctx, [dirty]) {
				const header_changes = {};

				if (!updating_userInitials && dirty & /*userInitials*/ 1) {
					updating_userInitials = true;
					header_changes.userInitials = /*userInitials*/ ctx[0];
					add_flush_callback(() => updating_userInitials = false);
				}

				header.$set(header_changes);
				const mainappbackground_changes = {};

				if (dirty & /*$$scope*/ 8) {
					mainappbackground_changes.$$scope = { dirty, ctx };
				}

				mainappbackground.$set(mainappbackground_changes);
			},
			i(local) {
				if (current) return;
				transition_in(header.$$.fragment, local);
				transition_in(sidebar.$$.fragment, local);
				transition_in(mainappbackground.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(header.$$.fragment, local);
				transition_out(sidebar.$$.fragment, local);
				transition_out(mainappbackground.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(header);
				destroy_component(sidebar);
				destroy_component(mainappbackground);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		let userInitials = 'JD';

		function header_userInitials_binding(value) {
			userInitials = value;
			$$invalidate(0, userInitials);
		}

		$$self.$$set = $$props => {
			if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
		};

		return [userInitials, slots, header_userInitials_binding, $$scope];
	}

	class Background extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
		}
	}

	/* src\component\Main.svelte generated by Svelte v4.2.0 */

	const { window: window_1 } = globals;

	function create_if_block(ctx) {
		let background;
		let current;

		background = new Background({
				props: {
					$$slots: { default: [create_default_slot] },
					$$scope: { ctx }
				}
			});

		return {
			c() {
				create_component(background.$$.fragment);
			},
			m(target, anchor) {
				mount_component(background, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const background_changes = {};

				if (dirty & /*$$scope, currentPath, windowScrollY*/ 262) {
					background_changes.$$scope = { dirty, ctx };
				}

				background.$set(background_changes);
			},
			i(local) {
				if (current) return;
				transition_in(background.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(background.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(background, detaching);
			}
		};
	}

	// (44:1) <Background>
	function create_default_slot(ctx) {
		let mainapp;
		let updating_windowScrollY;
		let current;

		function mainapp_windowScrollY_binding(value) {
			/*mainapp_windowScrollY_binding*/ ctx[5](value);
		}

		let mainapp_props = { currentPath: /*currentPath*/ ctx[1] };

		if (/*windowScrollY*/ ctx[2] !== void 0) {
			mainapp_props.windowScrollY = /*windowScrollY*/ ctx[2];
		}

		mainapp = new MainApp({ props: mainapp_props });
		binding_callbacks.push(() => bind(mainapp, 'windowScrollY', mainapp_windowScrollY_binding));

		return {
			c() {
				create_component(mainapp.$$.fragment);
			},
			m(target, anchor) {
				mount_component(mainapp, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const mainapp_changes = {};
				if (dirty & /*currentPath*/ 2) mainapp_changes.currentPath = /*currentPath*/ ctx[1];

				if (!updating_windowScrollY && dirty & /*windowScrollY*/ 4) {
					updating_windowScrollY = true;
					mainapp_changes.windowScrollY = /*windowScrollY*/ ctx[2];
					add_flush_callback(() => updating_windowScrollY = false);
				}

				mainapp.$set(mainapp_changes);
			},
			i(local) {
				if (current) return;
				transition_in(mainapp.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(mainapp.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(mainapp, detaching);
			}
		};
	}

	function create_fragment(ctx) {
		let scrolling = false;

		let clear_scrolling = () => {
			scrolling = false;
		};

		let scrolling_timeout;
		let if_block_anchor;
		let current;
		let mounted;
		let dispose;
		add_render_callback(/*onwindowscroll*/ ctx[4]);
		let if_block = /*$extensionEnabled*/ ctx[0] && create_if_block(ctx);

		return {
			c() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;

				if (!mounted) {
					dispose = listen(window_1, "scroll", () => {
						scrolling = true;
						clearTimeout(scrolling_timeout);
						scrolling_timeout = setTimeout(clear_scrolling, 100);
						/*onwindowscroll*/ ctx[4]();
					});

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (dirty & /*windowScrollY*/ 4 && !scrolling) {
					scrolling = true;
					clearTimeout(scrolling_timeout);
					scrollTo(window_1.pageXOffset, /*windowScrollY*/ ctx[2]);
					scrolling_timeout = setTimeout(clear_scrolling, 100);
				}

				if (/*$extensionEnabled*/ ctx[0]) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*$extensionEnabled*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
				mounted = false;
				dispose();
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let $extensionEnabled;
		component_subscribe($$self, extensionEnabled, $$value => $$invalidate(0, $extensionEnabled = $$value));
		let { rootId } = $$props;
		let currentPath = '';
		let windowScrollY;

		const initAppState = async () => {
			await initStorageEventListener();
			await initExtensionState();
		};

		const toggleSiteVisibilityState = visible => {
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
				$$invalidate(1, currentPath = window.location.pathname);
			}
		};

		function onwindowscroll() {
			$$invalidate(2, windowScrollY = window_1.pageYOffset);
		}

		function mainapp_windowScrollY_binding(value) {
			windowScrollY = value;
			$$invalidate(2, windowScrollY);
		}

		$$self.$$set = $$props => {
			if ('rootId' in $$props) $$invalidate(3, rootId = $$props.rootId);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*$extensionEnabled*/ 1) {
				toggleSiteVisibilityState(!$extensionEnabled);
			}
		};

		initAppState();

		return [
			$extensionEnabled,
			currentPath,
			windowScrollY,
			rootId,
			onwindowscroll,
			mainapp_windowScrollY_binding
		];
	}

	class Main extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance, create_fragment, safe_not_equal, { rootId: 3 });
		}
	}

	const ROOT_ID = 'rto';

	const insertAppIntoDom = () => {
	  let content = document.createElement('div');
	  content.id = ROOT_ID;

	  const app = new Main({
	    target: content,
	    props: { rootId: ROOT_ID }
	  });

	  document.body.insertBefore(content, document.body.firstChild);
	  return app;
	};

	const app = insertAppIntoDom();

	return app;

})();
