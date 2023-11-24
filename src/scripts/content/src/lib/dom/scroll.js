export const getScrollPercent = (container) => {
    return 100 * container.scrollTop / (container.scrollHeight - container.clientHeight);
}

export const convertPercentToWindowY = (percent) => {
    return percent / 100 * document.body.scrollHeight;
}