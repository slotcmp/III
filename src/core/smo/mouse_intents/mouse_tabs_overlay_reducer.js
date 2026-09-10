/**
 * @file src/core/smo/mouse_intents/mouse_tabs_overlay_reducer.js
 * @version 1.0.0-RELEASE-SMO-MOUSE-TABS-OVERLAY-REDUCER
 * @description Автономный DOD-редьюсер кликов по вкладкам приборов на линии Y = 1.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { generateGpssTransaction, _gpssEngineState } from "../bus.js";

/**
 * Перехватывает и маршрутизирует клики по вкладкам панелей на линии Y = 1
 * @param {string} hitSlotIdStr Идентификатор целевого прибора СМО
 * @param {number} localX Относительная абсцисса клика внутри окна
 * @returns {boolean} Флаг совершения переключения вкладок
 */
export function reduceMouseTabsClick(hitSlotIdStr, localX) {
    if (!hitSlotIdStr) return false;

    const facility = _gpssEngineState.facilitiesRegistry.get(hitSlotIdStr);
    if (!facility || !facility.viewStack) return false;

    const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
    const activeNode = Array.isArray(facility.viewStack) ? facility.viewStack[activeIdx] : facility.viewStack;
    const m = activeNode?.mdl;
    
    if (!m || m._tabStartX === undefined || m._tabEndX === undefined) return false;

    // Если клик попал в общую интерактивную область вкладок этого окна
    if (localX >= m._tabStartX && localX <= m._tabEndX) {
        // Направляем команду на Канал 12 (Системный контроллер вкладок)
        generateGpssTransaction("12", "TAB_CLICKED", { 
            targetSlotId: hitSlotIdStr, 
            localX: localX 
        }, "10");
        
        generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_WM] Клик по вкладке Слота " + hitSlotIdStr + " на позиции X=" + localX + "\n", "10");
        return true;
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/mouse_intents/mouse_tabs_overlay_reducer.js
 * Время создания: 09.09.2026 14:54:00 MSK
 */
