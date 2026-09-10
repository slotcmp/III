/**
 * @file src/system/tab_menu/tab_menu_ctl.js
 * @version 1.0.0-RELEASE-SMO-SYS-TAB-MENU-CTL
 * @description Системный WM-контроллер обслуживания Канала 12 (Infrastructure).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction, _gpssEngineState } from "../../core/smo/bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";

export function processSystemTabLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!contextPayload) return false;

    const m = facilityState.mdl;
    if (!m) return false;

    const intent = String(intentStr || "");

    // Конфигурация координатной сетки при пуске ядра
    if (intent === "REGISTRATION_TAB_SPACE") {
        const slotId = Math.floor(contextPayload.slotIdNum || 0) & 255;
        const count = Math.max(0, Math.floor(contextPayload.tabsCount || 0)) & 15;
        
        m.tabsCountRegistry[slotId] = count;
        const offset = slotId * 32;
        const srcCoords = contextPayload.coords;

        if (Array.isArray(srcCoords)) {
            for (let i = 0; i < count; i++) {
                if (srcCoords[i]) {
                    m.coordinatesBuffer[offset + (i * 2)] = Math.floor(srcCoords[i].start || 0);
                    m.coordinatesBuffer[offset + (i * 2) + 1] = Math.floor(srcCoords[i].end || 0);
                }
            }
        }
        return false;
    }

    const targetSlotIdStr = String(contextPayload.targetSlotId || "");
    const slotId = Math.floor(parseInt(targetSlotIdStr, 10) || 0) & 255;
    if (slotId === 0) return false;

    const hostFacility = _gpssEngineState.facilitiesRegistry.get(targetSlotIdStr);
    if (!hostFacility || !Array.isArray(hostFacility.viewStack)) return false;

    const tabsCount = m.tabsCountRegistry[slotId];
    let activeIdx = Math.max(0, Math.floor(hostFacility.activeStackIdx || 0));
    let nextIdx = activeIdx;

    if (intent === "TAB_CLICKED") {
        const localX = Math.floor(contextPayload.localX || 0);
        const offset = slotId * 32;

        for (let t = 0; t < tabsCount; t++) {
            const startX = m.coordinatesBuffer[offset + (t * 2)];
            const endX = m.coordinatesBuffer[offset + (t * 2) + 1];

            if (localX >= startX && localX < endX) {
                nextIdx = t;
                break;
            }
        }
    } 
    else if (intent === "SCROLL_TABS_DOWN") {
        nextIdx = (activeIdx + 1) % hostFacility.viewStack.length;
    } 
    else if (intent === "SCROLL_TABS_UP") {
        const total = hostFacility.viewStack.length;
        nextIdx = (activeIdx - 1 + total) % total;
    }

    if (nextIdx !== activeIdx) {
        hostFacility.activeStackIdx = nextIdx;
        m.activeTabRegistry[slotId] = nextIdx;
        
        const kernel = _gpssEngineState.runtime;
        
        if (String(hostFacility.componentType) === "explorer" && kernel?.workerGateway) {
            const nextMdl = hostFacility.viewStack[nextIdx].mdl;
            if (nextMdl) {
                kernel.workerGateway.triggerDirectoryIndexing(targetSlotIdStr, nextMdl.currentDirectoryPath, nextIdx);
            }
        }

        if (kernel) {
            if (kernel.virtualCanvasState) kernel.virtualCanvasState.isDirty = true;
            const currentMdl = hostFacility.viewStack[nextIdx].mdl;
            if (currentMdl) currentMdl._isDirty = true;
        }

        if (typeof forceInvalidateShadowCanvas === "function") {
            forceInvalidateShadowCanvas();
        }

        generateGpssTransaction(targetSlotIdStr, "SWITCH_SLOT_TAB", { targetStackIdx: nextIdx }, "12");
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "12");
        return true;
    }

    return false;
}
