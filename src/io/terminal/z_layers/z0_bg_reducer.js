/**
 * @file src/io/terminal/z_layers/z0_bg_reducer.js
 * @version 1.0.0-RELEASE-SMO-Z0-BG-REDUCER
 * @description Автономная DOD-процедура очистки глобального TUI-холста (Слой Z-0).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { packCellBits } from "../sprite_blit.js";

/**
 * Стерильно заполняет UHD-матрицу пробелами на черном фоне
 * @param {Int32Array[]} targetM Ссылка на двумерный массив кадра
 * @param {number} rootW Физическая ширина терминала
 * @param {number} rootH Физическая высота терминала
 */
export function reduceBackgroundLayer(targetM, rootW, rootH) {
    if (!targetM) return;

    // Глобальный холст кадра заполняется честной маской пробела на черном фоне
    const emptyCleanCellBits = packCellBits(" ", "\x1b[37m", "\x1b[40m");
    const h = Math.floor(rootH || 30);
    const w = Math.floor(rootW || 120);

    for (let y = 0; y < h; y++) {
        const row = targetM[y];
        if (row) {
            for (let x = 0; x < w; x++) {
                row[x] = emptyCleanCellBits;
            }
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/z_layers/z0_bg_reducer.js
 * Время создания: 09.09.2026 14:21:00 MSK
 */
