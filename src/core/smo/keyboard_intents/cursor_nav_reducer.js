/**
 * @file src/core/smo/keyboard_intents/cursor_nav_reducer.js
 * @version 1.0.0-RELEASE-SMO-DOD-CURSOR-NAV-REDUCER
 * @description Вынесенный редьюсер маршрутизации стрелок перемещения курсора и табуляции панелей.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { generateGpssTransaction } from "../bus.js";

/**
 * Вычисляет направления перемещения каретки по осям X/Y и транслирует транзакты
 */
export function reduceCursorNavIntent(intentStr, contextPayload, activeFocusedId) {
    // Вектор А: Ротация многовкладочных панелей (Tab)
    if (intentStr === "ROTATE_SLOT_STACK" || intentStr === "SWITCH_TAB") {
    if (activeFocusedId === "102" || activeFocusedId === "103") {
        // Порождаем транзакт ротации тела окна
        generateGpssTransaction(activeFocusedId, "ROTATE_SLOT_STACK", null, "4");
        
        // ИСПРАВЛЕНО: Дублируем команду на Канал 12, чтобы Fiber-планировщик атомарно зажег нужное ушко вкладки
        generateGpssTransaction("12", "ROTATE_SLOT_STACK", { targetSlotId: activeFocusedId, isRotationRequest: true }, "4");
        return true;
    }
    return false;
}
    
    // Вектор Б: Вертикальная навигация (стрелочки вверх/вниз)
    if (intentStr === "MOVE_CURSOR_UP" || intentStr === "MOVE_CURSOR_DOWN") {
        const targetReceiverIdStr = (activeFocusedId === "105") ? "105" : activeFocusedId;
        generateGpssTransaction(targetReceiverIdStr, intentStr, contextPayload, "4");
        return true;
    }

    // Вектор В: Горизонтальная навигация (стрелочки влево/вправо)
    if (intentStr === "MOVE_CURSOR_LEFT" || intentStr === "MOVE_CURSOR_RIGHT") {
        generateGpssTransaction(activeFocusedId, intentStr, null, "4");
        return true;
    }

    return false;
}
