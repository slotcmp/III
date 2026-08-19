/**
 * @file src/core/smo/keyboard_worker_unit.js
 * @version 3.2.5-RELEASE-SMO-KEYBOARD-ALT-FOCUS-FIXED
 * @description Инфраструктурный клавиатурный СМО-прибор Канала 4 (Control-контур).
 * Исправлена ошибка разбора аккордов Alt+1..6 путем прецизионного сравнения с байтом \x1b.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { generateGpssTransaction } from "./bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";

/**
 * Фабрика сборки мономорфной структуры клавиатурного прибора Канала 4
 * @param {Object} kernelRef Ссылка на ОЗУ-рантайм хоста ядра
 * @returns {Object} Запечатанная структура прибора
 */
export function assembleKeyboardUnit(kernelRef) {
    if (!kernelRef) return null;

    const keyboardFacility = {
        host: kernelRef,
        slotId: "4",
        localQueue: [],
        _head: 0,
        isProcessing: false,
        dispatch: null,
        advanceFacility: null
    };

    keyboardFacility.dispatch = (actionTypeStr, gpssTx) => {
        if (!gpssTx) return false;
        keyboardFacility.localQueue.push(gpssTx);
        return true;
    };

    keyboardFacility.advanceFacility = () => {
        return advanceQueueFacility(keyboardFacility);
    };

    Object.preventExtensions(keyboardFacility);
    return keyboardFacility;
}

/**
 * Конвейер продвижения и редукции тактовой очереди клавиатурных прерываний
 * @param {Object} unitState Состояние активного клавиатурного прибора
 * @returns {boolean} Флаг наличия мутаций рантайма
 */
export function advanceQueueFacility(unitState) {
    if (!unitState || unitState.isProcessing) return false;
    
    const q = unitState.localQueue;
    if (q.length === unitState._head) return false;

    unitState.isProcessing = true;
    let isMutated = false;

    const kernel = unitState.host;
    let focusedSlotIdStr = String(kernel?.model?.logicalState?.focusedSlotId || "105");

    while (unitState._head < q.length) {
        const tx = q[unitState._head++];
        if (!tx || !tx.P3) continue;

        const keyPayload = tx.P3;
        const keyName = String(keyPayload.name || "");

        // 1. ПРЕЦИЗИОННЫЙ РАЗБОР АККОРДОВ ALT + N (1..6)
        // Исправлено: сравниваем с реальным непечатным символом escape (\x1b), длина которого 1 байт
        if (keyName.length === 2 && keyName.charCodeAt(0) === 27) {
            const digitChar = keyName.charAt(1);
            const byteCode = digitChar.charCodeAt(0);
            
            // Проверяем диапазон символов от '1' (0x31) до '6' (0x36)
            if (byteCode >= 0x31 && byteCode <= 0x36 && kernel?.model?.logicalState?.panelRegistry) {
                const requestedDisplayIndex = byteCode - 0x30;
                const registry = kernel.model.logicalState.panelRegistry;
                const keys = Object.keys(registry);
                let targetSlotIdStr = "";
                
                for (let i = 0; i < keys.length; i++) {
                    const id = keys[i];
                    if (registry[id] && registry[id].displayIndex === requestedDisplayIndex) {
                        targetSlotIdStr = id;
                        break;
                    }
                }

                if (targetSlotIdStr.length > 0) {
                    kernel.model.logicalState.focusedSlotId = targetSlotIdStr;
                    focusedSlotIdStr = targetSlotIdStr;
                    
                    // Принудительно сбрасываем кэш фазы diff-рендеринга, чтобы старая и новая рамки перерисовались
                    if (typeof forceInvalidateShadowCanvas === "function") {
                        forceInvalidateShadowCanvas();
                    }
                    
                    generateGpssTransaction("1", "EXECUTE_RENDER", null);
                    isMutated = true;
                }
            }
            continue;
        }

        // 2. ПОСИМВОЛЬНЫЙ РАЗБОР ANSI ESC-ПОСЛЕДОВАТЕЛЬНОСТЕЙ СТРЕЛОК НАВИГАЦИИ ТЕРМИНАЛА
        if (keyName === "\x1b[A" || keyName === "up") {
            generateGpssTransaction(focusedSlotIdStr, "MOVE_CURSOR_UP", null);
            isMutated = true;
            continue;
        }
        if (keyName === "\x1b[B" || keyName === "down") {
            generateGpssTransaction(focusedSlotIdStr, "MOVE_CURSOR_DOWN", null);
            isMutated = true;
            continue;
        }

        // 3. ОБРАБОТКА ИНТЕРAКТИВНOГO TAB (Переброс фокуса между проводниками 102 <-> 103)
        if (keyName === "tab" || keyName === "\t") {
            if (focusedSlotIdStr === "102") {
                kernel.model.logicalState.focusedSlotId = "103";
            } else if (focusedSlotIdStr === "103") {
                kernel.model.logicalState.focusedSlotId = "102";
            } else {
                generateGpssTransaction(focusedSlotIdStr, "ROTATE_SLOT_STACK", null);
            }
            if (typeof forceInvalidateShadowCanvas === "function") forceInvalidateShadowCanvas();
            generateGpssTransaction("1", "EXECUTE_RENDER", null);
            isMutated = true;
            continue;
        }

        // 4. СТАНДАРТНЫЙ ТЕКСТОВЫЙ РЕДУКТОР
        if (keyName === "return" || keyName === "enter" || keyName === "\r" || keyName === "\n") {
            generateGpssTransaction(focusedSlotIdStr, "ENTER_PRESSED", null);
            isMutated = true;
        } else if (keyName === "backspace" || keyName === "\x7f" || keyName === "\b") {
            generateGpssTransaction(focusedSlotIdStr, "BACKSPACE_PRESSED", null);
            isMutated = true;
        } else if (keyName.length === 1 && keyName >= " ") {
            const charPayload = { char: keyName };
            Object.preventExtensions(charPayload);
            generateGpssTransaction(focusedSlotIdStr, "KEY_PRESSED", charPayload);
            isMutated = true;
        }
    }

    if (unitState._head === q.length) {
        q.length = 0;
        unitState._head = 0;
    }

    unitState.isProcessing = false;
    return isMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/keyboard_worker_unit.js
 * Время модификации: 19.08.2026 00:15:30 MSK
 */
