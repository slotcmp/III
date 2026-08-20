/**
 * @file src/core/smo/keyboard_worker_unit.js
 * @version 3.2.0-RELEASE-SMO-KEYBOARD-INTERACTIVE
 * @description Инфраструктурный клавиатурный СМО-прибор Канала 4 (Control-контур).
 * Изменена локальная логика прибора: интегрирован разбор ANSI-стрелок навигации и Tab-смены панелей.
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
/**
 * Продвижение тактовой очереди клавиатурного прибора (Канал 4)
 */
function advanceQueueFacility(facilityState) {
    if (!facilityState || facilityState.isProcessing) return false;

    const q = facilityState.localQueue;
    if (q.length === facilityState._head) return false;

    facilityState.isProcessing = true;
    let isStateMutated = false;

    // Извлекаем контекст логгера из ОЗУ ядра хоста
    const hostAppSettings = facilityState.host?.model?.logicalState?.appSettings;
    const bKeyLogBypassBool = !!(hostAppSettings?.ttni?.bKeyLogBypass);

    while (facilityState._head < q.length) {
        const tx = q[facilityState._head++];
        if (!tx) continue;

        const currentIntentStr = String(tx.P2 || "");

        // ГВАРД ЛОГИРОВАНИЯ: Если байпас выключен (false) — пишем нажатие в файл smo.log
        if (!bKeyLogBypassBool && currentIntentStr === "KEY_PRESSED") {
            const payload = tx.P3;
            const targetChar = payload ? String(payload.char || "") : "";
            
            const now = new Date();
            const h = String(now.getHours()).padStart(2, "0");
            const m = String(now.getMinutes()).padStart(2, "0");
            const s = String(now.getSeconds()).padStart(2, "0");

            // Прямая атомарная запись следа в логгер СМО (Слот 108)
            const logLineStr = "[" + h + ":" + m + ":" + s + " Msk] [INPUT_KEYBOARD] Интент: KEY_PRESSED | Символ: '" + targetChar + "' | Фокусный Слот: " + String(facilityState.host?.model?.logicalState?.focusedSlotId || "105") + "\n";
            
            if (typeof generateGpssTransaction === "function") {
                generateGpssTransaction("108", "ADD_LOG_ENTRY", logLineStr);
            }
        }

        // Пропускаем интент дальше в стандартный фильтр прибора
        if (facilityState.specificAdvanceWorker) {
            const hasMutations = facilityState.specificAdvanceWorker(facilityState, currentIntentStr, tx.P3, tx);
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
 * Время модификации: 18.08.2026 21:46:45 MSK
 */
