/**
 * @file src/io/terminal/frame_grid_renderer.js
 * @version 3.7.0-RELEASE-SMO-FRAME-GRID-STRICT-SAFE-ZONE
 * @description Модуль координатной отрисовки фоновых СМО-маркеров знакомест прибора.
 * ИСПРАВЛЕНО ПЕРЕТИРАНИЕ: Внутренний обход ограничен по Y с 2 до h-2, по X до w-3, защищая табы и скролл.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { packCellBits } from "./sprite_blit.js";

/**
 * Заполнитель фоновой координатной сетки знакомест с учетом суверенного желоба скроллбара
 */
export function drawFrameGrid(matrix, currentW, currentH, isFocusedBool) {
    if (!matrix) return;
    
    const maxCols = Math.max(1, Math.floor(currentW || 40));
    const maxRows = Math.max(1, Math.floor(currentH || 5));
    
    // Если окно слишком маленькое — сетка пассивно засыпает, чтобы не ломать структуру
    if (maxCols < 6 || maxRows < 5) return;

    const gridColorAnsi = isFocusedBool ? "\x1b[38;5;236m" : "\x1b[38;5;234m";
    const bgColorAnsi = "\x1b[40m";

    const packedDotBits   = packCellBits("·", gridColorAnsi, bgColorAnsi);
    const packedSpaceBits = packCellBits(" ", "\x1b[37m", bgColorAnsi);

    // ИСПРАВЛЕНИЕ: Начинаем строго с y = 2 (строка под табами) и заканчиваем за одну строку до нижней рамки
    for (let y = 2; y < maxRows - 1; y++) {
        const row = matrix[y];
        if (!row) continue;
        
        // ИСПРАВЛЕНИЕ: Правый край жестко ограничен до maxCols - 3, защищая желоб скроллбара и рамку ║
        for (let x = 1; x < maxCols - 2; x++) {
            const currentPackedVal = row[x];
            const charCode = (currentPackedVal >> 16) & 0xFFFF;

            // Если в ячейке уже записан честный бизнес-контент (буквы файлов, логов, шкалы),
            // пропускаем шаг, не затирая данные точками сетки
            if (charCode !== 0x20 && charCode !== 0x00 && charCode !== 0xB7) {
                continue;
            }
            
            const localX = x - 1;
            const localY = y - 2; // Смещение относительно начала сетки

            if (localY % 2 === 0 && localX % 4 === 0) {
                row[x] = packedDotBits;
            } else {
                row[x] = packedSpaceBits;
            }
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/frame_grid_renderer.js
 * Время изменения: 04.09.2026 23:18:22 MSK
 */
