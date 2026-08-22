/**
 * @file src/app/workers/keyboard_worker.js
 * @version 3.6.6-RELEASE-SMO-KEYBOARD-WORKER-ALT-NUMBERS-STABLE
 * @description Фоновый воркер разбора клавиатурных событий.
 * ИСПРАВЛЕН Unicode-ВВОД: Расширен захват многобайтовых символов sequence для поддержки кириллицы.
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
        
        // ДЕТЕКЦИЯ КОМБИНАЦИЙ ALT + ЦИФРА (Alt+1 ... Alt+6)
        if (name.length === 5 && name.startsWith("alt+")) {
            const digitChar = name.charAt(4);
            if (digitChar >= "1" && digitChar <= "6") {
                action = "FOCUS_CHANGED_BY_NUMBER";
                payload = Math.floor(parseInt(digitChar, 10) || 1);
            }
        } 
        // СТАНДАРТНЫЙ НАВИГАЦИОННЫЙ И СЛУЖЕБНЫЙ МАРШАЛИНГ
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
        } else if (focusedSlotIdStr === "105") {
            // ИСПРАВЛЕНИЕ: Кириллица и заглавные буквы могут приходить как в sequence, так и в name
            let targetChar = "";
            if (sequence.length > 0) { targetChar = sequence; }
            else if (name.length === 1) { targetChar = name; }
            
            if (targetChar.length > 0) {
                action = "KEY_PRESSED";
                payload = { char: targetChar };
            }
        }
        
        if (action) {
            // Безаллокационный сборщик временной метки (DOD-friendly)
            const now = new Date();
            const h = String(now.getHours()).padStart(2, "0");
            const m = String(now.getMinutes()).padStart(2, "0");
            const s = String(now.getSeconds()).padStart(2, "0");

            // ИСПРАВЛЕНИЕ: Безопасное извлечение символа из объекта payload с fallback на строку
            const printableKeyStr = (payload && typeof payload === "object" && payload.char) ? payload.char : name;
            const logMsgStr = "[" + h + ":" + m + ":" + s + " Msk] [INPUT_KEYBOARD] Клавиша: '" + printableKeyStr + "' | Направлено в Слот: " + focusedSlotIdStr + "\n";
            
            const logPack = {
                action: "LOG_ENTRY_PENDING",
                payload: logMsgStr
            };
            Object.preventExtensions(logPack);
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
            Object.preventExtensions(resPack.payload);
            Object.preventExtensions(resPack);
            parentPort.postMessage(resPack);
        }

        const releasePack = {
            action: "KEYBOARD_FACILITY_RELEASE_READY",
            payload: { slotId: focusedSlotIdStr, intent: "RELEASE_KEYBOARD_FACILITY" }
        };
        Object.preventExtensions(releasePack.payload);
        Object.preventExtensions(releasePack);
        parentPort.postMessage(releasePack);
    });
}
