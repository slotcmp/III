/**
 * @file src/io/terminal/vectors/dispatcher_intents/panic_vectors/matrix_fallback_blit.js
 * @version 1.0.1-RELEASE-SMO-DOD-MATRIX-FALLBACK-BLIT-SAFE
 * @description Безопасный ин-плейс выжиг защитной текстуры в ОЗУ экранов с упаковкой битов.
 */
import { _gpssEngineState } from "../../../../../core/smo/bus.js";
import { packCellBits } from "../../../sprite_blit.js"; // ◄── ИНЖЕКТИРУЕМ КАНОНИЧЕСКИЙ УПАКОВЩИК

export function blitFallbackMatricesInRam(kernel, panicLogStr) {
    const targetFacility = _gpssEngineState.facilitiesRegistry.get("105");
    
    const fgPanic = "\x1b[38;5;196m"; // Ярко-красный аварийный цвет символов
    const bgNormal = "\x1b[40m";        // Черный фон
    const packedPanicCell = packCellBits("░", fgPanic, bgNormal); // ◄── ПРЕКОМПИЛИРУЕМ БИТОВУЮ МАСКУ

    // 1. НАКАТ КРАСНОЙ СЕТКИ НА СЛОТ 105 (CLI)
    if (targetFacility) {
        const viewStack = targetFacility.viewStack;
        let localMatrix = null;
        
        if (viewStack) {
            if (Array.isArray(viewStack)) {
                const activeStackIdx = Math.max(0, Math.floor(targetFacility.activeStackIdx || 0));
                localMatrix = viewStack[activeStackIdx]?.view?.localBuffer?.matrix;
            } else if (viewStack.view?.localBuffer) {
                localMatrix = viewStack.view.localBuffer.matrix;
            }
        }

        if (localMatrix && Array.isArray(localMatrix)) {
            const rowsLen = localMatrix.length;
            for (let y = 0; y < rowsLen; y++) {
                const row = localMatrix[y];
                if (Array.isArray(row)) {
                    const colsLen = row.length;
                    for (let x = 0; x < colsLen; x++) {
                        row[x] = packedPanicCell; // ◄── ИСПРАВЛЕНО: Пишем упакованное число вместо сырой строки!
                    }
                }
            }
            
            const topRow = localMatrix[0]; // Исправлен доступ к первой строке двумерного массива
            if (Array.isArray(topRow) && topRow.length > 25) {
                const alertMsgStr = " [ CONTRACT PANIC: SLOT 105 FALLBACK ] ";
                const msgLen = alertMsgStr.length;
                const startX = Math.floor((topRow.length - msgLen) / 2);
                
                const fgText = "\x1b[38;5;231m"; // Белый текст
                for (let c = 0; c < msgLen; c++) {
                    topRow[startX + c] = packCellBits(alertMsgStr.charAt(c), fgText, fgPanic);
                }
            }
        }
    }

    // 2. ИНЖЕКЦИЯ СТРОКИ ТРЕЙСА НАПРЯМУЮ В ВЫВОДИМУЮ МАТРИЦУ СЛОТА 108 (ЛОГГЕР)
    const facility108 = kernel.model?.logicalState?.panelRegistry["108"];
    let loggerMdl = null;
    let matrix108 = null;
    
    if (facility108 && facility108.viewStack) {
        if (Array.isArray(facility108.viewStack)) {
            const activeIdx = Math.max(0, Math.floor(facility108.activeStackIdx || 0));
            loggerMdl = facility108.viewStack[activeIdx]?.mdl;
            matrix108 = facility108.viewStack[activeIdx]?.view?.localBuffer?.matrix;
        } else {
            loggerMdl = facility108.viewStack.mdl;
            matrix108 = facility108.viewStack.view?.localBuffer?.matrix;
        }
    }

    if (loggerMdl && Array.isArray(loggerMdl.logsArray)) {
        const count = Math.floor(loggerMdl.totalLogsCount || 0) % 128;
        loggerMdl.logsArray[count] = panicLogStr;
        loggerMdl.totalLogsCount++;
        loggerMdl._isDirty = true;
    }

    if (matrix108 && Array.isArray(matrix108)) {
        const mLen = matrix108.length;
        const targetRow = matrix108[mLen - 1]; 
        if (Array.isArray(targetRow)) {
            const strLen = panicLogStr.length;
            const maxCols = Math.min(targetRow.length, strLen);
            const fgLog = "\x1b[38;5;214m"; // Оранжевый отладочный цвет лога паники
            
            for (let c = 0; c < maxCols; c++) {
                targetRow[c] = packCellBits(panicLogStr.charAt(c), fgLog, bgNormal); // ◄── ИСПРАВЛЕНО: Безопасная упаковка
            }
        }
    }
}