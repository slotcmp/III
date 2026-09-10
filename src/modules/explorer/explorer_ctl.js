/**
 * @file src/modules/explorer/explorer_ctl.js
 * @version 6.2.0-RELEASE-SMO-EXPLORER-CTL-STRICT-REDUCERS
 * @description Системный PAC/WM-контроллер обслуживания Проводника (Канал 102/103).
 * ИСПРАВЛЕНО: Функции полностью переведены на мономорфный абстрактный стандарт reduce****.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { _gpssEngineState } from "../../core/smo/bus.js";

// Импортируем строго унифицированные чистые DOD-редьюсеры
import { reduceCollectionInject } from "./intents/collection_inject.js";
import { reducePointerScroll } from "./intents/pointer_scroll.js";
import { reducePointerStep } from "./intents/pointer_step.js";
import { reducePointerSelect } from "./intents/pointer_select.js";

export function processIntent(triad, intentStr, contextPayload, forcedSlotIdStr) {
    if (!triad || !intentStr) return false;

    const slotIdStr = String(forcedSlotIdStr || "102");
    const facility = _gpssEngineState.facilitiesRegistry.get(slotIdStr);
    const viewStack = facility ? facility.viewStack : null;
    const activeIdx = facility ? Math.max(0, Math.floor(facility.activeStackIdx || 0)) : 0;

    const intent = String(intentStr || "");
    let isMutated = false;

    // Редукция по строго зафиксированной семантической матрице функций
    if (intent === "INJECT_VFS_DATA") {
        isMutated = reduceCollectionInject(triad, contextPayload, slotIdStr, viewStack);
    } 
    else if (intent === "NOTIFY_SCROLL_MUTATED") {
        isMutated = reducePointerScroll(triad, contextPayload);
    } 
    else if (intent === "SWITCH_SLOT_TAB" || intent === "TAB_CLICKED") {
        isMutated = reducePointerStep(contextPayload, slotIdStr, viewStack);
    } 
    else if (intent === "MOUSE_CLICK") {
        isMutated = reducePointerSelect(triad, contextPayload, slotIdStr, activeIdx);
    } 
    else if (intent === "ROTATE_SLOT_STACK" || intent === "UPDATE_THEME_MASK") {
        if (triad.mdl) {
            triad.mdl._isDirty = true;
            isMutated = true;
        }
    }

    if (isMutated === true) {
        const kernel = _gpssEngineState.runtime;
        if (kernel && kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }
    }

    return isMutated;
}

export function processSpecificExplorerLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;

    const activeIdx = Math.max(0, Math.floor(facilityState.activeStackIdx || 0));
    const triad = facilityState.viewStack ? facilityState.viewStack[activeIdx] : null;
    if (!triad) return false;

    const currentSlotIdStr = String(facilityState.slotId || "102");
    return processIntent(triad, intentStr, contextPayload, currentSlotIdStr);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/explorer_ctl.js
 * Время изменения: 10.09.2026 20:39:00 MSK
 */
