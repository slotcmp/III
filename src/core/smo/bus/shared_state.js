/**
 * @file src/core/smo/bus/shared_state.js
 * @version 1.0.0-RELEASE-SMO-BUS-SHARED-STATE-STRICT
 * @description Изолированные структуры разделяемой памяти и метрик шины СМО.
 * Выполнен в строгой парадигме PAC / DOD / Zero Allocation / 0% GC.
 */

export const _busClockMetrics = {
    hardwareTicksCount: 0,
    generatedTransactsCount: 0,
    currentPipelineDepth: 0,
    lastExecutedIntent: "NONE"
};
Object.preventExtensions(_busClockMetrics);

export const _gpssEngineState = {
    runtime: null,
    facilitiesRegistry: new Map(),
    facilitiesKeysCached: [], 
    isScanActive: false,
    _transactionGlobalCounter: 0,
    activeAsyncTransactionsCount: 0,
    activeSubZonesRegistry: Object.create(null)
};
Object.preventExtensions(_gpssEngineState);

export const _activeThemeState = {
    focusedSlotIdStr: "105", 
    currentBorderAnsiMask: "gray",
    currentPassiveAnsiMask: "darkgray"
};
Object.preventExtensions(_activeThemeState);

export const _kernelContext = {
    logPath: "./smo.log"
};
Object.preventExtensions(_kernelContext);

export const _INTENTS_PRIORITY_MAP = new Map([
    ["TAB_CLICKED", 3],
    ["SWITCH_SLOT_TAB", 3],
    ["ROTATE_SLOT_STACK", 3],
    ["SWITCH_TAB", 3],
    ["SYNC_SCROLLBAR_METRICS", 2],
    ["INVALIDATE_SLOT_CONTAINER", 2],
    ["REGISTRATION_TAB_SPACE", 2],
    ["INJECT_VFS_DATA", 1],
    ["FN_KEY_CLICKED", 1],
    ["EXECUTE_FAR_COMMAND", 1],
    ["TRIGGER_DIRECTORY_INDEXING", 1],
    ["ADD_LOG_ENTRY", 0],
    ["ANIMATION_TICK", 0]
]);
