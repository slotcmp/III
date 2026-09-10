/**
 * @file src/core/smo/keyboard_worker_unit.js
 * @version 4.4.5-RELEASE-SMO-KEYBOARD-UNIT-HISTORY-ROUTED
 * @description Чистый изолированный фазовый фильтр клавиатуры (Control-контур).
 * ИСПРАВЛЕНА ИСТОРИЯ: Интенты MOVE_CURSOR_UP/DOWN при фокусе на 105 направляются строго в CLI, а не в 102.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { generateGpssTransaction, _gpssEngineState } from "./bus.js";

/**
 * Единое изолированное ядро редукции клавиатурных интентов Канала 4.
 */
export function processSpecificKeyboardLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;
    const kernel = facilityState.host;
    if (!kernel) return false;

    const activeFocusedId = String(kernel.model?.logicalState?.focusedSlotId || "105");
    const intent = String(intentStr || "");

    // КЕЙС 1: Переключение фокуса по Alt+[1-6]
    if (intent === "FOCUS_CHANGED_BY_NUMBER" && contextPayload !== undefined) {
        const targetDisplayIdx = Math.floor(Number(contextPayload) || 1);
        const activeFacilitiesKeys = _gpssEngineState.facilitiesKeysCached;
        const len = activeFacilitiesKeys.length;
        let foundSlotIdStr = "";
        
        for (let i = 0; i < len; i++) {
            const slotId = activeFacilitiesKeys[i];
            if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9" || slotId === "10" || slotId === "11") continue;
            
            const facility = _gpssEngineState.facilitiesRegistry.get(slotId);
            if (facility && Math.floor(facility.displayIndex || 0) === targetDisplayIdx) {
                foundSlotIdStr = slotId;
                break;
            }
        }
        
        if (foundSlotIdStr.length > 0) {
            const currentFocused = String(kernel.model?.logicalState?.focusedSlotId || "");
            
            if (foundSlotIdStr !== currentFocused) {
                kernel.model.logicalState.focusedSlotId = foundSlotIdStr;
                
                if (kernel && typeof kernel.forceInvalidateShadowCanvas === "function") {
                    kernel.forceInvalidateShadowCanvas();
                }

                if (kernel.virtualCanvasState) {
                    kernel.virtualCanvasState.isDirty = true;
                }
                
                generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_KEYBOARD] Фокус ввода переведен на Слот: " + foundSlotIdStr + "\n", "4");
                generateGpssTransaction("1", "EXECUTE_RENDER", null, "4");
                return true;
            }
        }
        return false;
    }
    
    // КЕЙС 2: Переключение вкладок (Ротация вью-стека по Tab)
    if (intent === "ROTATE_SLOT_STACK" || intent === "SWITCH_TAB") {
        if (activeFocusedId === "102" || activeFocusedId === "103") {
            generateGpssTransaction(activeFocusedId, "ROTATE_SLOT_STACK", null, "4");
            return true;
        }
        return false;
    }
    
    // КЕЙС 3: Навигация по вертикали (стрелочки вверх/вниз)
    if (intent === "MOVE_CURSOR_UP" || intent === "MOVE_CURSOR_DOWN") {
        // ИСПРАВЛЕНИЕ: Если фокус на CLI (105), шлем интент истории в 105. Не перенаправляем в Проводник 102!
        const targetReceiverIdStr = (activeFocusedId === "105") ? "105" : activeFocusedId;
        generateGpssTransaction(targetReceiverIdStr, intent, contextPayload, "4");
        return true;
    }

    // Поддержка горизонтальных интентов навигации на шине СМО
    if (intent === "MOVE_CURSOR_LEFT" || intent === "MOVE_CURSOR_RIGHT") {
        generateGpssTransaction(activeFocusedId, intent, null, "4");
        return true;
    }

    // КЕЙС 4: Исполнение строки ввода команд
    if (intent === "ENTER_PRESSED") {
        if (activeFocusedId === "105") {
            generateGpssTransaction("105", "EXECUTE_COMMAND", null, "4");
        } else {
            generateGpssTransaction(activeFocusedId, "ENTER_PRESSED", null, "4");
        }
        return true;
    }

    // КЕЙС 5: Ловим каноничный BACKSPACE_PRESSED от чистого воркера
    if (intent === "BACKSPACE_PRESSED") {
        generateGpssTransaction(activeFocusedId, "BACKSPACE", null, "4");
        return true;
    }

    // КЕЙС 6: Печать символов и дифференциация горизонтальных стрелок навигации
    if (intent === "KEY_PRESSED") {
        if (contextPayload) {
            const chr = String(contextPayload.char || "");

            if (chr === "left") {
                generateGpssTransaction(activeFocusedId, "MOVE_CURSOR_LEFT", null, "4");
                return true;
            }
            if (chr === "right") {
                generateGpssTransaction(activeFocusedId, "MOVE_CURSOR_RIGHT", null, "4");
                return true;
            }
        }

        generateGpssTransaction(activeFocusedId, "KEY_PRESSED", contextPayload, "4");
        return true;
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/keyboard_worker_unit.js
 * Время изменения: 05.09.2026 13:06:12 MSK
 */
