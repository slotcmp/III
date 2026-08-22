/**
 * @file src/core/smo/keyboard_worker_unit.js
 * @version 3.8.0-RELEASE-SMO-KEYBOARD-UNIT-STRICT-PIPELINE
 * @description Инфраструктурный клавиатурный СМО-прибор Канала 4 (Control-контур).
 * ИСПРАВЛЕНА СИНХРОНИЗАЦИЯ: Роутинг полностью сопряжен со сквозным абстрактным facility_pipeline.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { generateGpssTransaction, _gpssEngineState } from "./bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";

/**
 * Фабрика сборки мономорфной структуры клавиатурного прибора Канала 4
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

    keyboardFacility.specificAdvanceWorker = (facilityState, intentStr, payloadObj, currentTx) => {
        // Извлекаем рантайм хоста напрямую из стейта прибора
        return processKeyboardCoreLogic(facilityState.host, intentStr, payloadObj);
    };

    keyboardFacility.advanceFacility = () => {
        return advanceQueueFacility(keyboardFacility);
    };

    Object.preventExtensions(keyboardFacility);
    return keyboardFacility;
}

/**
 * Выделенное ядро редукции клавиатурных интентов Канала 4
 */
function processKeyboardCoreLogic(kernel, intentStr, payload) {
    if (!kernel) return false;
    const activeFocusedId = String(kernel.model?.logicalState?.focusedSlotId || "105");
    
    // КЕЙС 1: Переключение фокуса по Alt+[1-6]
    if (intentStr === "FOCUS_CHANGED_BY_NUMBER" && payload !== undefined) {
        const targetDisplayIdx = Math.floor(Number(payload) || 1);
        const activeFacilitiesKeys = _gpssEngineState.facilitiesKeysCached;
        const len = activeFacilitiesKeys.length;
        let foundSlotIdStr = "";
        
        for (let i = 0; i < len; i++) {
            const slotId = activeFacilitiesKeys[i];
            if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9" || slotId === "10") continue;
            
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
                
                // Очищаем кэш блайтера для мгновенной перерисовки Unicode-контуров
                if (typeof forceInvalidateShadowCanvas === "function") {
                    forceInvalidateShadowCanvas();
                }

                if (kernel.virtualCanvasState) {
                    kernel.virtualCanvasState.isDirty = true;
                }
                
                generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_KEYBOARD] Горячая клавиша ALT+" + targetDisplayIdx + " перевела фокус на Слот: " + foundSlotIdStr + "\n");
                generateGpssTransaction("1", "EXECUTE_RENDER", null);
                return true;
            }
        }
        return false;
    }
    
    // КЕЙС 2: Навигация (стрелки)
    if (intentStr === "MOVE_CURSOR_UP" || intentStr === "MOVE_CURSOR_DOWN") {
        generateGpssTransaction(activeFocusedId, intentStr, payload);
        return true;
    }

    // КЕЙС 3: Исполнение строки ввода команд
    if (intentStr === "ENTER_PRESSED") {
        if (activeFocusedId === "105") {
            generateGpssTransaction("105", "EXECUTE_COMMAND", null);
        } else {
            generateGpssTransaction(activeFocusedId, "ENTER_PRESSED", null);
        }
        return true;
    }

    // КЕЙС 4: Печать символов
    if (intentStr === "KEY_PRESSED") {
        generateGpssTransaction(activeFocusedId, "KEY_PRESSED", payload);
        return true;
    }

    return false;
}

/**
 * Продвижение тактовой очереди клавиатурного прибора (Канал 4)
 */
function advanceQueueFacility(facilityState) {
    if (!facilityState || facilityState.isProcessing) return false;

    const q = facilityState.localQueue;
    if (q.length === facilityState._head) return false;

    facilityState.isProcessing = true;
    let isStateMutated = false;

    while (facilityState._head < q.length) {
        const tx = q[facilityState._head++];
        if (!tx) continue;

        const currentIntentStr = String(tx.P2 || "");
        const payload = tx.P3;

        let resolvedIntent = currentIntentStr;
        let resolvedPayload = payload;
        
        if (currentIntentStr === "EXECUTE_RESOLVED_KEY" && payload) {
            resolvedIntent = String(payload.action || "");
            resolvedPayload = payload.payload;
        }

        if (facilityState.specificAdvanceWorker) {
            const hasMutations = facilityState.specificAdvanceWorker(facilityState, resolvedIntent, resolvedPayload, tx);
            if (hasMutations === true) isStateMutated = true;
        }
    }

    if (facilityState._head === q.length) {
        q.length = 0;
        facilityState._head = 0;
    }

    facilityState.isProcessing = false;
    return isStateMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/keyboard_worker_unit.js
 * Время модификации: 21.08.2026 16:14:20 MSK
 */
