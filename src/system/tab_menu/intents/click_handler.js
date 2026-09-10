/**
 * @file src/system/tab_menu/intents/click_handler.js
 * @version 1.0.0-RELEASE-SMO-INTENT-CLICK-HANDLER
 * @description Изолированная DOD-процедура обработки клика по ушкам вкладок (Канал 12).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../../../core/smo/bus.js";
import { forceInvalidateShadowCanvas } from "../../../io/terminal/flusher.js";

/**
 * Проверяет попадание клика мыши в границы вкладок и переключает активный стек прибора
 */
export function handleTabClicked(m, kernel, hostFacility, contextPayload, slotId, targetSlotIdStr, activeIdx) {
    if (!m || !hostFacility || !contextPayload) return false;

    const tabsCount = m.tabsCountRegistry[slotId];
    const localX = Math.floor(contextPayload.localX || 0);
    const offset = slotId * 32;
    let nextIdx = activeIdx;

    // Безаллокационный хит-тест по плоскому массиву координат
    for (let t = 0; t < tabsCount; t++) {
        const startX = m.coordinatesBuffer[offset + (t * 2)];
        const endX = m.coordinatesBuffer[offset + (t * 2) + 1];

        if (localX >= startX && localX < endX) {
            nextIdx = t;
            break;
        }
    }

    // Если индекс изменился — фиксируем мутацию в ОЗУ-реестрах
    if (nextIdx !== activeIdx) {
        hostFacility.activeStackIdx = nextIdx;
        m.activeTabRegistry[slotId] = nextIdx;
        
        // Интеграция с воркером VFS Проводника
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

        // Транслируем транзакты переключения во все смежные контуры
        generateGpssTransaction(targetSlotIdStr, "SWITCH_SLOT_TAB", { targetStackIdx: nextIdx }, "12");
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "12");
        return true;
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/system/tab_menu/intents/click_handler.js
 * Время изменения: 10.09.2026 17:50:00 MSK
 */
