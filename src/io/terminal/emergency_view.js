/**
 * @file src/io/terminal/emergency_view.js
 * @version 2.7.0-RELEASE-SMO-EMERGENCY-STRICT-ARMORED
 * @description Аварийный процедурный отрисовщик заглушек падения слотов (Presentation-контур).
 * ИСПРАВЛЕНЫ ТИПЫ: Внедрена бронированная проверка через Int32Array/Array для защиты preventExtensions.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { packCellBits } from "./sprite_blit.js";

/**
 * Выжигает ярко-красную защитную сетку FALLBACK поверх упавшего слота прибора
 * @param {any} matrix Структура памяти (двумерная матрица или одномерная плоская лента)
 * @param {number} currentW Физическая ширина слота в знакоместах
 * @param {number} currentH Физическая высота слота в строках
 * @param {string} slotIdStr Идентификатор упавшего прибора СМО
 */
export function renderEmergencyFallbackGrid(matrix, currentW, currentH, slotIdStr) {
    if (!matrix || Object.isExtensible(matrix) === false && !Array.isArray(matrix) && !(matrix instanceof Int32Array)) return;

    const w = Math.max(10, Math.floor(currentW || 40));
    const h = Math.max(3, Math.floor(currentH || 5));
    const idStr = String(slotIdStr || "ERR");

    // Прекомпилируем аварийные числовые маски ANSI в один такт
    const packedBgBits = packCellBits("░", "\x1b[38;5;196m", "\x1b[48;5;52m"); // Красный фолбэк
    const packedTextFg = "\x1b[38;5;231m"; // Белый текст
    const packedTextBg = "\x1b[48;5;196m"; // Ярко-красный фон

    // 1. СТРОГИЙ БЕЗОПАСНЫЙ НАЛИВ АВАРИЙНОЙ ТЕКСТУРЫ В ЧИСЛА
    for (let y = 0; y < h; y++) {
        // Защитный гвард: если индекс выходит за физические границы массива верхнего уровня — прерываем такт
        if (y >= matrix.length) break;
        
        const row = matrix[y];
        
        if (row !== undefined && row !== null) {
            // КЕЙС А: Это канонический двухмерный объект строки Int32Array или стандартный массив
            if (row instanceof Int32Array || Array.isArray(row)) {
                const maxRowX = Math.min(w, row.length);
                for (let x = 0; x < maxRowX; x++) {
                    row[x] = packedBgBits;
                }
            } 
            // КЕЙС Б: Это одномерная плоская flat-лента (числовой ячеистый массив)
            else if (typeof row === "number" && Array.isArray(matrix)) {
                matrix[y] = packedBgBits;
            }
        }
    }

    // 2. ВЫЖИГ ТЕКСТОВОГО ПАСПОРТА ПАДЕНИЯ СМО СТРОГО НА ЛИНИИ Y = 1
    const alertMsgStr = " SLOT " + idStr + " FALLBACK ";
    const msgLen = alertMsgStr.length;
    let startX = Math.floor((w - msgLen) / 2);
    if (startX < 1) startX = 1;

    // Гвард от падения при обращении к индексу строки
    if (matrix.length > 1) {
        const alertRow = matrix[1];
        if (alertRow !== undefined && alertRow !== null) {
            
            // Запись в канонический двухмерный массив строк (Int32Array / Array)
            if (alertRow instanceof Int32Array || Array.isArray(alertRow)) {
                const maxAlertX = alertRow.length;
                for (let i = 0; i < msgLen; i++) {
                    const targetX = startX + i;
                    if (targetX < w - 1 && targetX < maxAlertX) {
                        alertRow[targetX] = packCellBits(alertMsgStr.charAt(i), packedTextFg, packedTextBg);
                    }
                }
            } 
            // Запись в плоский сдвиг для одномерной ленты
            else if (typeof alertRow === "number" && Array.isArray(matrix)) {
                for (let i = 0; i < msgLen; i++) {
                    const targetFlatIdx = w + startX + i;
                    if (startX + i < w - 1 && targetFlatIdx < matrix.length) {
                        matrix[targetFlatIdx] = packCellBits(alertMsgStr.charAt(i), packedTextFg, packedTextBg);
                    }
                }
            }
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/emergency_view.js
 * Время изменения: 05.09.2026 20:53:20 MSK
 */
