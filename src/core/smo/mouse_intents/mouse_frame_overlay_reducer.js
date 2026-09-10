/**
 * @file src/core/smo/mouse_intents/mouse_frame_overlay_reducer.js
 * @version 1.0.0-RELEASE-SMO-MOUSE-FRAME-OVERLAY-REDUCER
 * @description Автономный DOD-редьюсер кликов по кнопкам и паспорту верхней рамы окна (Y = 0).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { generateGpssTransaction } from "../bus.js";

/**
 * Обрабатывает клики по кнопкам управления и паспорту рамы на линии Y = 0
 * @param {string} hitSlotIdStr Идентификатор целевого прибора СМО
 * @param {number} localX Относительная абсцисса клика внутри окна
 * @param {number} windowW Физическая ширина текущего окна
 * @returns {boolean} Флаг совершения мутации состояния системы
 */
export function reduceMouseFrameClick(hitSlotIdStr, localX, windowW) {
    if (!hitSlotIdStr || windowW <= 0) return false;

    // Клик по паспорту рамы (ротация стека слота)
    if (localX >= 3 && localX <= 16) {
        generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_WM] Клик по паспорту рамы. Ротация стека Слота: " + hitSlotIdStr + "\n", "10");
        generateGpssTransaction(hitSlotIdStr, "ROTATE_SLOT_STACK", null, "10");
        return true; 
    }

    // Расчет канонических TUI-координат кнопок обвеса от правого края окна
    const xCollapse = (windowW - 10) | 0;
    const xMaximize = (windowW - 7) | 0;
    const xClose    = (windowW - 4) | 0;

    if (localX >= xCollapse && localX <= xCollapse + 2) {
        generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_WM] Инициирован интент COLLAPSE_SLOT на Слот: " + hitSlotIdStr + "\n", "10");
        generateGpssTransaction("9", "COLLAPSE_SLOT_TOGGLE", { targetSlotId: hitSlotIdStr }, "10");
        return true;
    }

    if (localX >= xMaximize && localX <= xMaximize + 2) {
        generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_WM] Инициирован интент MAXIMIZE_SLOT на Слот: " + hitSlotIdStr + "\n", "10");
        generateGpssTransaction("9", "MAXIMIZE_SLOT_TOGGLE", { targetSlotId: hitSlotIdStr }, "10");
        return true;
    }

    if (localX >= xClose && localX <= xClose + 2) {
        generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_WM] Инициирован интент DESTROY_SLOT на Слот: " + hitSlotIdStr + "\n", "10");
        generateGpssTransaction("0", "DESTROY_SLOT", { targetSlotId: hitSlotIdStr }, "10");
        return true;
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/mouse_intents/mouse_frame_overlay_reducer.js
 * Время создания: 09.09.2026 14:51:22 MSK
 */
