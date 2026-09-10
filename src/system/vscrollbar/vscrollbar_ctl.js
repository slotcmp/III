/**
 * @file src/system/vscrollbar/vscrollbar_ctl.js
 * @version 1.2.0-RELEASE-SMO-SYS-VSCROLLBAR-CTL-PURE-DOD
 * @description Системный WM-контроллер обслуживания Канала 14 (Infrastructure).
 * ИСПРАВЛЕНО: Кастомный хардкод для Слота 104 полностью удален. Мономорфный DOD-стандарт.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction, _gpssEngineState } from "../../core/smo/bus.js";

export function processSystemVScrollbarLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!contextPayload || !facilityState) return false;

    const m = facilityState.mdl;
    if (!m) return false;

    const intent = String(intentStr || "");
    const targetSlotIdStr = String(contextPayload.targetSlotId || "");
    const slotId = Math.floor(parseInt(targetSlotIdStr, 10) || 0) & 255;
    if (slotId === 0) return false;

    // Считываем живой прибор-адресат прокрутки из реестра СМО
    const targetFacility = _gpssEngineState.facilitiesRegistry.get(targetSlotIdStr);
    if (!targetFacility) return false;

    // Автоматическая ротация вкладок по активному индексу вью-стека
    if (intent === "SCROLL_TABS_UP" || intent === "SCROLL_TABS_DOWN") {
        const rawTabsArray = targetFacility.tabs || [];
        const totalTabs = rawTabsArray.length;
        if (totalTabs <= 1) return false;

        let currentIdx = Math.max(0, Math.floor(targetFacility.activeStackIdx || 0));
        let nextIdx = currentIdx;

        if (intent === "SCROLL_TABS_UP") {
            nextIdx = currentIdx - 1;
            if (nextIdx < 0) nextIdx = totalTabs - 1;
        } else if (intent === "SCROLL_TABS_DOWN") {
            nextIdx = (currentIdx + 1) % totalTabs;
        }

        if (nextIdx !== currentIdx) {
            targetFacility.activeStackIdx = nextIdx;
            
            const kernel = _gpssEngineState.runtime;
            const panelRegistry = kernel?.model?.logicalState?.panelRegistry;
            if (panelRegistry && panelRegistry[targetSlotIdStr]) {
                panelRegistry[targetSlotIdStr].activeStackIdx = nextIdx;
            }

            if (kernel?.virtualCanvasState) {
                kernel.virtualCanvasState.isDirty = true;
            }

            generateGpssTransaction(targetSlotIdStr, "NOTIFY_SCROLL_MUTATED", {
                viewportOffset: nextIdx,
                selectedIndex: nextIdx
            }, "14");

            generateGpssTransaction("1", "EXECUTE_RENDER", null, "14");
            return true;
        }
        return false;
    }

    // СТАНДАРТНОЕ ПОВЕДЕНИЕ ДЛЯ ВНУТРЕННЕГО СКРОЛЛИНГА КОНТЕНТА ОКOН
    if (!Array.isArray(targetFacility.viewStack)) return false;
    const activeIdx = Math.max(0, Math.floor(targetFacility.activeStackIdx || 0));
    const activeMdl = targetFacility.viewStack[activeIdx]?.mdl;
    const activeView = targetFacility.viewStack[activeIdx]?.view;
    if (!activeMdl || !activeView) return false;

    let totalItems = 1;
    if (targetSlotIdStr === "108") {
        totalItems = Math.max(1, Math.floor(activeMdl.totalLogsCount || 0));
    } else if (targetSlotIdStr === "102" || targetSlotIdStr === "103") {
        totalItems = Math.max(1, Array.isArray(activeMdl.itemsList) ? activeMdl.itemsList.length : 0);
    } else if (targetSlotIdStr === "106") {
        totalItems = Math.max(1, Math.floor(activeMdl.totalThemes || 0));
    } else {
        totalItems = Math.max(1, Math.floor(m.totalItemsRegistry[slotId] || 1));
    }

    let offset = Math.floor(m.viewportOffsetRegistry[slotId] || 0);
    const viewHeight = Math.max(1, Math.floor(activeView.height || 5));
    const maxVisibleLines = Math.max(1, viewHeight - 4); 

    let nextOffset = offset;

    if (intent === "SCROLL_CONTENT_UP") {
        nextOffset = offset - 1;
    } 
    else if (intent === "SCROLL_CONTENT_DOWN") {
        nextOffset = offset + 1;
    }

    const maxAllowedOffset = Math.max(0, totalItems - maxVisibleLines);
    if (nextOffset < 0) nextOffset = 0;
    if (nextOffset > maxAllowedOffset) nextOffset = maxAllowedOffset;

    if (nextOffset !== offset) {
        m.viewportOffsetRegistry[slotId] = nextOffset;
        activeMdl.viewportOffset = nextOffset;
        activeMdl._isDirty = true;

        const kernel = _gpssEngineState.runtime;
        if (kernel?.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }

        generateGpssTransaction("1", "EXECUTE_RENDER", null, "14");
        return true;
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/system/vscrollbar/vscrollbar_ctl.js
 * Время модификации: 09.09.2026 21:50:00 MSK
 */
