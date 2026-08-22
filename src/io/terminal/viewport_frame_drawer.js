/**
 * @file src/io/terminal/viewport_frame_drawer.js
 * @version 3.5.0-RELEASE-SMO-VIEWPORT-FRAME-DRAWER-STRICT-GOLD
 * @description Процедурный выжигатель стальных рамок вокруг TUI-компонентов (Presentation-контур).
 * ИСПРАВЛЕН ФОКУС: Золотой контур горит безусловно при флаге активности окна без участия масок JSON.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { _gpssEngineState } from "../../core/smo/bus.js";
import { resolveWebColor } from "../../core/layout/layout_color_map.js";
import { drawFrameTitle } from "./frame_title_renderer.js";
import { drawFrameQueueIndicator } from "./frame_queue_renderer.js";
import { drawFrameGeoPassport } from "./frame_geo_renderer.js";

/**
 * Накатывает символы контура рамы поверх ячеек UHD-буфера строго по координатам m[y][x]
 * @param {Object} node Узел отображения, содержащий матрицу и размеры
 * @param {string} compTypeStr Строковый тип компонента
 * @param {string} slotIdStr Идентификатор слота СМО
 * @param {boolean} isFocusedBool Флаг активности/фокуса панели в интерфейсе
 */
export function drawDisplayNodeFrame(node, compTypeStr, slotIdStr, isFocusedBool) {
    if (!node) return;
    const m = node.matrix;
    if (!m) return;

    const w = Math.floor(node.w || 40);
    const h = Math.floor(node.h || 5);
    if (w < 2 || h < 2) return;

    // Извлекаем прибор напрямую из суверенного Map-реестра шины СМО
    const facility = _gpssEngineState.facilitiesRegistry.get(slotIdStr);
    const displayIndex = facility ? Math.floor(facility.displayIndex || 0) : 0;
    const rawViewStack = facility ? facility.viewStack : null;

    // ПРЕЦИЗИОННОЕ ИСПРАВЛЕНИЕ: Золотой фокус имеет абсолютный приоритет над конфигом
    const themeColorAnsi = isFocusedBool ? "\x1b[38;5;220m" : "\x1b[38;5;242m"; // Золото для активного, сталь для пассивного
    const bgColor = "\x1b[40m";

    // 1. Двойные горизонтальные ребра (═) строго по индексам строк Y=0 и Y=h-1
    const topRow = m[0];
    const botRow = m[h - 1];

    if (topRow && botRow) {
        for (let x = 0; x < w; x++) {
            if (topRow[x]) {
                topRow[x].char = "═";
                topRow[x].fg = themeColorAnsi;
                topRow[x].bg = bgColor;
            }
            if (botRow[x]) {
                botRow[x].char = "═";
                botRow[x].fg = themeColorAnsi;
                botRow[x].bg = bgColor;
            }
        }
    }

    // 2. Двойные вертикальные ребра (║) строго по X=0 и X=w-1 для каждой строки Y
    for (let y = 0; y < h; y++) {
        const row = m[y];
        if (row) {
            if (row[0]) {
                row[0].char = "║";
                row[0].fg = themeColorAnsi;
                row[0].bg = bgColor;
            }
            if (row[w - 1]) {
                row[w - 1].char = "║";
                row[w - 1].fg = themeColorAnsi;
                row[w - 1].bg = bgColor;
            }
        }
    }

    // 3. Двойные угловые TUI-засечки строго в точечные координаты ячеек матрицы
    if (topRow && botRow) {
        if (topRow[0])     { topRow[0].char = "╔";     topRow[0].fg = themeColorAnsi;     topRow[0].bg = bgColor; }
        if (topRow[w - 1]) { topRow[w - 1].char = "╗"; topRow[w - 1].fg = themeColorAnsi; topRow[w - 1].bg = bgColor; }
        if (botRow[0])     { botRow[0].char = "╚";     botRow[0].fg = themeColorAnsi;     botRow[0].bg = bgColor; }
        if (botRow[w - 1]) { botRow[w - 1].char = "╝"; botRow[w - 1].fg = themeColorAnsi; botRow[w - 1].bg = bgColor; }
    }

    // ВПЕКАНИЕ ПАСПОРТА РАМЫ
    if (topRow) {
        drawFrameTitle(topRow, compTypeStr, slotIdStr, w, isFocusedBool);
        drawFrameQueueIndicator(topRow, slotIdStr, displayIndex, rawViewStack, w, facility);
    }
    if (botRow) {
        drawFrameGeoPassport(botRow, w, h);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/viewport_frame_drawer.js
 * Время модификации: 21.08.2026 16:55:00 MSK
 */
