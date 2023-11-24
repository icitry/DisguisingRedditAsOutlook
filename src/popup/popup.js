const EXTENSION_STATE_KEY = 'rto_state_enabled'

const setState = async (value) => {
    var browser = window?.chrome ? window.chrome : window.browser;

    await browser.storage.local.set({ [EXTENSION_STATE_KEY]: value });
}

const getState = async () => {
    var browser = window?.chrome ? window.chrome : window.browser;

    let result = await browser.storage.local.get(EXTENSION_STATE_KEY);

    return result ? result[EXTENSION_STATE_KEY] : false;
}

const handleToggle = async (cb) => {
    await setState(cb.checked);
}

document.getElementById("extension_state_switch").addEventListener("click", () => {
    handleToggle(document.getElementById("extension_state_switch"));
});

window.onload = async () => {
    document.getElementById("extension_state_switch").checked = await getState();
}