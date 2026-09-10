/**
 * @file src/io/terminal/frame_geo_renderer.js
 * @version 4.0.0-RELEASE-SMO-FRAME-GEO-TYPED
 * @description Чистый пассивный отрисовщик геометрических паспортов слотов (Presentation-контур).
 * ИСПРАВЛЕН КРАШ: Переведен на прямое выжигание Int32 бит через packCellBits.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { packCellBits } from "./sprite_blit.js";

/**
 * Выводит текстовый штамп геометрии слота на нижнюю линию рамки кадра
 * @param {Int32Array} row Ссылка на числовую строку нижней рамы
 * @param {number} sX Начальное смещение окна по оси X
 * @param {number} currentW Текущая физическая ширина слота
 * @param {number} currentH Текущая физическая высота слота
 */
export function drawFrameGeoPassport(row, sX, currentW, currentH) {
    if (!row) return;

    const geoTextStr = " [" + currentW + "x" + currentH + "] ";
    const gLen = geoTextStr.length;
    
    if (currentW > gLen + 6) {
        const startG_X = sX + currentW - gLen - 2;
        const colorAnsi = "\x1b[38;5;242m";
        const bgColor = "\x1b[40m";

        for (let i = 0; i < gLen; i++) {
            row[startG_X + i] = packCellBits(geoTextStr.charAt(i), colorAnsi, bgColor);
        }
    }
}
