/**
 * @file src/system/vscrollbar/vscrollbar_view.js
 * @version 1.0.0-RELEASE-SMO-SYS-VSCROLLBAR-VIEW
 * @description Пассивный безаллокационный выжигатель полосы прокрутки Window Manager (PAC / Presentation).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { packCellBits } from "../../io/terminal/sprite_blit.js";

/**
 * Выжигает полосу скроллбара (рельс '░' и бегунок '█') строго на правой границе прибора СМО
 * @param {Int32Array[]} matrix Ссылка на двумерную UHD-матрицу локального буфера окна
 * @param {number} currentW Текущая физическая ширина слота
 * @param {number} currentH Текущая физическая высота слота
 * @param {number} viewportOffset Индекс смещения скролла из ОЗУ Канала 14
 * @param {number} totalItems Общее количество бизнес-элементов в массиве
 * @param {boolean} isFocused Флаг активности панели
 */
export function drawVerticalScrollbarInline(matrix, currentW, currentH, viewportOffset, totalItems, isFocused) {
    if (!matrix || totalItems <= 0) return;

    const maxCols = Math.max(1, Math.floor(currentW || 40));
    const maxRows = Math.max(1, Math.floor(currentH || 5));
    
    const barHeight = maxRows - 2; // Исключаем верхнее и нижнее ребро рамы окна
    if (totalItems <= barHeight) return; // Всё вмещается — скроллбар пассивно спит

    const targetX = maxCols - 2; // Координата знакоместа перед правой рамкой '║'
    
    // Вычисляем пропорциональные TUI-размеры бегунка
    const sliderHeight = Math.max(1, Math.floor((barHeight * barHeight) / totalItems));
    const maxOffset = totalItems - barHeight;
    const sliderTop = maxOffset > 0 ? Math.floor((viewportOffset * (barHeight - sliderHeight)) / maxOffset) : 0;

    // Бирюза при активном фокусе, сталь при пассивном
    const fgColorStr = isFocused ? "\x1b[38;5;51m" : "\x1b[38;5;242m";
    const bgColorStr = "\x1b[40m";

    for (let y = 0; y < barHeight; y++) {
        const row = matrix[1 + y]; // Начинаем со строки под верхней рамкой (Y=1)
        if (!row) continue;

        const isSliderZone = (y >= sliderTop && y < sliderTop + sliderHeight);
        const charStr = isSliderZone ? "█" : "░";

        row[targetX] = packCellBits(charStr, fgColorStr, bgColorStr);
    }
}
