import { extensionEnabled } from '../store/stores';

const EXTENSION_STATE_KEY = 'rto_state_enabled';

export const getExtensionState = async () => {
    if(typeof window === 'undefined') return;
    
    var browser = window?.chrome ? window.chrome : window.browser;

    if(!browser) return false;

    let result = await browser.storage?.local?.get(EXTENSION_STATE_KEY);

    return result ? result[EXTENSION_STATE_KEY] : false;
};

const extensionStateChanged = (changes, areaName) => {
    let newValue = changes[EXTENSION_STATE_KEY].newValue;
    extensionEnabled.set(newValue);
}

export const initStorageEventListener = async () => {
    if(typeof window === 'undefined') return;

    var browser = window?.chrome ? window.chrome : window.browser;

    if(!browser) return;

    await browser.storage?.onChanged?.addListener(extensionStateChanged);
}

export const initExtensionState = async () => {
    extensionEnabled.set(await getExtensionState());
}