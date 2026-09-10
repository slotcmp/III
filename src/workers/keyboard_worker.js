/**
 * @file src/app/workers/keyboard_worker.js
 * @version 3.7.0-RELEASE-SMO-KEYBOARD-WORKER-CLEAN-FINAL
 * @description Фоновый воркер разбора клавиатурных событий (Hardware Driver).
 * ИСПРАВЛЕНА СТРУКТУРА: Удалены временные хаки инжекции байт забоя, воркер возвращен к роли чистого транслятора.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { parentPort } from "node:worker_threads";

if (parentPort) {
    parentPort.on("message", (incomingTask) => {
        if (!incomingTask || incomingTask.P2 !== "PROCESS_KEYPRESS") return;
        const keyPayload = incomingTask.P3;
        if (!keyPayload) return;
        
        const focusedSlotIdStr = String(incomingTask.P1 || "102");
        const name = String(keyPayload.name || "");
        const sequence = String(keyPayload.sequence || "");
        let action = null;
        let payload = null;
        
        // 1. ДЕТЕКЦИЯ КОМБИНАЦИЙ ALT + ЦИФРА (Alt+1 ... Alt+6)
        if (name.length === 5 && name.startsWith("alt+")) {
            const digitChar = name.charAt(4);
            if (digitChar >= "1" && digitChar <= "6") {
                action = "FOCUS_CHANGED_BY_NUMBER";
                payload = Math.floor(parseInt(digitChar, 10) || 1);
            }
        } 
        // 2. СТАНДАРТНЫЙ НАВИГАЦИОННЫЙ И СЛУЖЕБНЫЙ МАРШАЛИНГ СТДИН
        else if (name === "tab") {
            if (focusedSlotIdStr === "105") {
                action = "TAB_COMPLETION_REQUEST";
                payload = null;
            } else {
                action = "FOCUS_CHANGED";
                payload = focusedSlotIdStr === "102" ? "103" : "102";
            }
        } else if (name === "down" || name === "j") {
            action = "MOVE_CURSOR_DOWN";
        } else if (name === "up" || name === "k") {
            action = "MOVE_CURSOR_UP";
        } else if (name === "return" || name === "enter") {
            action = "ENTER_PRESSED";
        } else if (name === "backspace") {
            action = "BACKSPACE_PRESSED";
        } else if (name === "f3") {
            action = "SYSTEM_ACTION_BYPASS";
            payload = "F3_MACRO";
        } else if (name === "f4") {
            action = "SYSTEM_ACTION_BYPASS";
            payload = "F4_MACRO";
        } 
        // 3. ТРАНСЛЯЦИЯ СЫРЫХ ПАКЕТОВ ВВОДА ДЛЯ ОБРАБОТКИ ПРИБОРОМ КАНАЛА 4
        else if (focusedSlotIdStr === "105") {
            let targetChar = "";
            if (sequence.length > 0) { targetChar = sequence; }
            else if (name.length === 1) { targetChar = name; }
            
            if (targetChar.length > 0) {
                action = "KEY_PRESSED";
                payload = { char: targetChar };
            }
        }
        
        if (action) {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, "0");
            const m = String(now.getMinutes()).padStart(2, "0");
            const s = String(now.getSeconds()).padStart(2, "0");

            const printableKeyStr = (payload && typeof payload === "object" && payload.char) ? payload.char : name;
            const logMsgStr = "[" + h + ":" + m + ":" + s + " Msk] [INPUT_KEYBOARD] Клавиша: '" + printableKeyStr + "' | Направлено в Слот: " + focusedSlotIdStr + "\n";
            
            const logPack = {
                action: "LOG_ENTRY_PENDING",
                payload: logMsgStr
            };
            parentPort.postMessage(logPack);

            const resPack = {
                action: "KEYBOARD_ACTION_READY",
                payload: {
                    slotId: focusedSlotIdStr,
                    intent: "EXECUTE_RESOLVED_KEY",
                    action: action,
                    payload: payload
                }
            };
            parentPort.postMessage(resPack);
        }

        const releasePack = {
            action: "KEYBOARD_FACILITY_RELEASE_READY",
            payload: { slotId: focusedSlotIdStr, intent: "RELEASE_KEYBOARD_FACILITY" }
        };
        parentPort.postMessage(releasePack);
    });
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/app/workers/keyboard_worker.js
 * Время изменения: 05.09.2026 12:45:10 MSK
 */
