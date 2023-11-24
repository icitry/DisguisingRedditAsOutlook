import { writable } from 'svelte/store';

export const extensionEnabled = writable(false);

export const unsubscribeExtensionEnabled = extensionEnabled.subscribe((value) => {

});