/**
 * @file src/system/tab_menu/intents/scroll_down_handler.js
 * @version 1.0.0-RELEASE-SMO-INTENT-SCROLL-DOWN-HANDLER
 * @description Изолированная DOD-процедура прокрутки вкладок вперед (Канал 12).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../../../core/smo/bus.js";
import { forceInvalidateShadowCanvas } from "../../../io/terminal/flusher.js";

/**
 * Осуществляет циклический сдвиг индекса вкладок вперед по сигналу скролла вниз
 */
export function handleScrollTabsDown(m, kernel, hostFacility, slotId, targetSlotIdStr, activeIdx) {
    if (!m || !hostFacility || !Array.isArray(hostFacility.viewStack)) return false;

    const total = hostFacility.viewStack.length;
    if (total <= 1) return false;

    // Циклический инкремент индекса в пределах длины вью-стека
    const nextIdx = (activeIdx + 1) % total;

    if (nextIdx !== activeIdx) {
        hostFacility.activeStackIdx = nextIdx;
        m.activeTabRegistry[slotId] = nextIdx;
        
        // Интеграция с фоновым индексатором файлового воркера VFS
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

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/system/tab_menu/intents/scroll_down_handler.js
 * Время изменения: 10.09.2026 18:03:00 MSK
 */
