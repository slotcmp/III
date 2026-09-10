/**
 * @file src/modules/explorer/intents/pointer_scroll.js
 * @version 2.0.0-RELEASE-SMO-EXPLORER-REDUCER-POINTER-SCROLL
 * @description Абстрактный DOD-редьюсер синхронизации абсолютных смещений вьюпорта.
 */

export function reducePointerScroll(triad, payload) {
    if (!triad || !triad.mdl || !payload) return false;

    const mdl = triad.mdl;
    mdl.viewportOffset = Math.max(0, Math.floor(payload.viewportOffset || 0));
    mdl.selectedIndex  = Math.max(0, Math.floor(payload.selectedIndex || 0));
    mdl._isDirty = true;

    return true;
}
