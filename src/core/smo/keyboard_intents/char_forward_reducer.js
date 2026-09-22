/**
 * @file src/core/smo/keyboard_intents/char_forward_reducer.js
 * @version 1.1.2-RELEASE-SMO-DOD-CHAR-FORWARD-SAFE-BLIT
 * @description Редьюсер трансляции ввода текста с безопасной упаковкой битов UHD-матрицы.
 */
import { generateGpssTransaction, _gpssEngineState } from "../bus.js";
import { packCellBits } from "../../../io/terminal/sprite_blit.js"; // ◄── ИНЖЕКТИРУЕМ УПАКОВЩИК БИТОВ

export function reduceCharForwardIntent(kernel, intentStr, contextPayload, activeFocusedId) {
    if (!kernel) return false;

    if (intentStr === "ENTER_PRESSED") {
        if (activeFocusedId === "105") {
            generateGpssTransaction("105", "EXECUTE_COMMAND", null, "4");
        } else {
            generateGpssTransaction(activeFocusedId, "ENTER_PRESSED", null, "4");
        }
        return true;
    }

    if (intentStr === "BACKSPACE_PRESSED") {
        generateGpssTransaction(activeFocusedId, "BACKSPACE", null, "4");
        return true;
    }

    if (intentStr === "KEY_PRESSED") {
        let chr = "";
        if (contextPayload) {
            chr = String(contextPayload.char || contextPayload.name || "");

            if (chr === "left") {
                generateGpssTransaction(activeFocusedId, "MOVE_CURSOR_LEFT", null, "4");
                return true;
            }
            if (chr === "right") {
                generateGpssTransaction(activeFocusedId, "MOVE_CURSOR_RIGHT", null, "4");
                return true;
            }
        }

        if (chr.length > 0) {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, "0");
            const m = String(now.getMinutes()).padStart(2, "0");
            const s = String(now.getSeconds()).padStart(2, "0");

            let asciiLoadStr = "";
            const charLen = chr.length;
            for (let i = 0; i < charLen; i++) {
                asciiLoadStr += String(chr.charCodeAt(i));
                if (i < charLen - 1) asciiLoadStr += ",";
            }

            const smoLogLineStr =
                "[" + h + ":" + m + ":" + s + " Msk] [INPUT_SMO_KBD] Клавиша: '" + chr + 
                "' | Нагрузка (ASCII): " + asciiLoadStr + " | Направлено в Слот: " + activeFocusedId + "\n";

            const logFacility = _gpssEngineState.facilitiesRegistry.get("108");
            let loggerMdl = null;
            let matrix108 = null;

            if (logFacility) {
                const viewStack = logFacility.viewStack;
                if (viewStack) {
                    if (Array.isArray(viewStack)) {
                        const activeStackIdx = Math.max(0, Math.floor(logFacility.activeStackIdx || 0));
                        loggerMdl = viewStack[activeStackIdx]?.mdl;
                        matrix108 = viewStack[activeStackIdx]?.view?.localBuffer?.matrix;
                    } else {
                        loggerMdl = viewStack.mdl;
                        matrix108 = viewStack.view?.localBuffer?.matrix;
                    }
                }
            }

            if (loggerMdl && Array.isArray(loggerMdl.logsArray)) {
                const count = Math.floor(loggerMdl.totalLogsCount || 0) % 128;
                loggerMdl.logsArray[count] = smoLogLineStr;
                loggerMdl.totalLogsCount++;
                loggerMdl._isDirty = true;
            }

            // ИСПРАВЛЕНО: Безопасный ин-плейс блайтинг с упаковкой битов Int32
            if (matrix108 && Array.isArray(matrix108)) {
                const mLen = matrix108.length;
                const targetRow = matrix108[mLen - 1]; 
                if (Array.isArray(targetRow)) {
                    const strLen = smoLogLineStr.length;
                    const maxCols = Math.min(targetRow.length, strLen);
                    
                    const fg = "\x1b[38;5;250m"; // Серый лог-цвет
                    const bg = "\x1b[40m";        // Черный фон
                    
                    for (let c = 0; c < maxCols; c++) {
                        targetRow[c] = packCellBits(smoLogLineStr.charAt(c), fg, bg); // ◄── СИНХРОНИЗИРОВАНО С Z-БЛЕНДЕРОМ
                    }
                }
            }
        }

        generateGpssTransaction(activeFocusedId, "KEY_PRESSED", contextPayload, "4");
        return true;
    }

    return false;
}