/**
 * @file src/core/smo/window_manager_intents/theme_sync_reducer.js
 * @version 1.0.0-RELEASE-SMO-DOD-WM-THEME-SYNC
 * @description Инфраструктурный редьюсер синхронизации масок тем оформления.
 */
export function reduceThemeSync(facility) {
    if (!facility || !facility.viewStack) return false;

    const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
    const triad = Array.isArray(facility.viewStack) ? facility.viewStack[activeIdx] : facility.viewStack;
    
    if (triad && triad.mdl) {
        triad.mdl._isDirty = true;
        return true;
    }
    return false;
}
