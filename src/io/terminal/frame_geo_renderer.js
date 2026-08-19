/**
 * @file src/io/terminal/frame_geo_renderer.js
 * @version 3.0.0-RELEASE-DOD-FORK
 * @description Чистый пассивный отрисовщик геометрических паспортов слотов (Presentation-контур).
 * Выводит габариты знакомест и строк на нижнее ребро рамы прибора СМО.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Выводит текстовый штамп геометрии слота на нижнюю линию рамки
 * @param {Object[]} row Ссылка на плоский массив ячеек нижней строки матрицы
 * @param {number} currentW Текущая физическая ширина слота в знакоместах
 * @param {number} currentH Текущая физическая высота слота в строках
 */
export function drawFrameGeoPassport(row, currentW, currentH) {
    if (!row) return;

    const geoTextStr = " [" + currentW + "x" + currentH + "] ";
    const gLen = geoTextStr.length;
    
    if (currentW > gLen + 2) {
        const startG_X = currentW - gLen - 2;
        for (let i = 0; i < gLen; i++) {
            const cell = row[startG_X + i];
            if (cell) {
                cell.char = geoTextStr.charAt(i);
                cell.fg = "\x1b[38;5;242m"; 
            }
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/frame_geo_renderer.js
 * Время модификации: 18.08.2026 18:07:05 MSK
 */
