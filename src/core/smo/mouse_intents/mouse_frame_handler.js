/**
 * @file src/core/smo/mouse_intents/mouse_frame_handler.js
 * @version 3.0.1-RELEASE-SMO-DOD-FRAME-HANDLER-PURE-SHUTTLE
 * @description Автономный DOD-редьюсер кликов по кнопкам рамы и однострочникам разметки.
 * ИСПРАВЛЕНО: Полностью удален хардкод генерации интентов. Модуль переведен на сквозной форвардинг в WM.
 * Выполнен в строгой парадигме PAC / DOD / IDD / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../bus.js";

/**
 * Обрабатывает системный обвес окон и инфраструктурные однострочники (Слот 12/200)
 */
export function processFrameOrSingleRowIntent(hitSlotIdStr, mouseAction, localX, localY, w, h, kernel) {
    const isWheel = (mouseAction === "WHEEL_UP" || mouseAction === "WHEEL_DOWN");
    const targetSlotIdStr = String(hitSlotIdStr || "200");

    // =================================================================
    // СУВЕРЕННЫЙ КОНТУР ИНФРАСТРУКТУРЫ СЛОТА 200 И ОДНОСТРОЧНИКОВ (h === 1)
    // =================================================================
    if (targetSlotIdStr === "200" || h === 1) {
        // КЕЙС А: Физический клик левой кнопкой мыши по линии ушек (DOWN / UP)
        if (mouseAction === "MOUSE_DOWN" || mouseAction === "MOUSE_UP") {
            const clickPayload = { 
                targetSlotId: targetSlotIdStr, 
                localX: Math.floor(localX),
                localY: Math.floor(localY), 
                mousePhase: mouseAction
            };
            Object.preventExtensions(clickPayload);

            // Направляем транзакт на Канал 12 (Таб-менеджер) для удержания сессии и фокуса
            generateGpssTransaction("12", "TAB_CLICKED", clickPayload, "10");
            return true;
        } 
        // КЕЙС Б: Вращение колесика мыши над областью ушек (WHEEL_UP / DOWN)
        else if (isWheel === true) {
            const rawScrollIntentStr = (mouseAction === "WHEEL_UP") ? "ROTATE_STACK_UP" : "ROTATE_STACK_DOWN";
            
            const shuttlePayload = {
                targetSlotId: targetSlotIdStr,
                localX: Math.floor(localX),
                localY: Math.floor(localY)
            };
            Object.preventExtensions(shuttlePayload);

            // Кодирование по памяти запрещено: пуляем сырой интент прокрутки рамы в Канал 14 (Скроллбар)
            // Шаттл vscrollbar_ctl.js примет его и безусловно форвардит в window_manager.js
            generateGpssTransaction("14", rawScrollIntentStr, shuttlePayload, "10");
            return true;
        }
        return false;
    }

    // =================================================================
    // СТАНДАРТНЫЙ КОНТУР УПРАВЛЕНИЯ КНОПКАМИ ОБЪЕМНЫХ ОКOН НА ЛИНИИ Y === 0
    // =================================================================
    if (localY === 0 && w > 0) {
        if (localX >= 3 && localX <= 16) {
            generateGpssTransaction(targetSlotIdStr, "ROTATE_SLOT_STACK", null, "10");
            return true; 
        }

        const xCollapse = (w - 10) | 0;
        const xMaximize = (w - 7) | 0;
        const xClose    = (w - 4) | 0;

        if (localX >= xCollapse && localX <= xCollapse + 2) {
            generateGpssTransaction("9", "COLLAPSE_SLOT_TOGGLE", { targetSlotId: targetSlotIdStr }, "10");
            return true;
        }
        if (localX >= xMaximize && localX <= xMaximize + 2) {
            generateGpssTransaction("9", "MAXIMIZE_SLOT_TOGGLE", { targetSlotId: targetSlotIdStr }, "10");
            return true;
        }
        if (localX >= xClose && localX <= xClose + 2) {
            generateGpssTransaction("0", "DESTROY_SLOT", { targetSlotId: targetSlotIdStr }, "10");
            return true;
        }
    }

    return false;
}