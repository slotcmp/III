/**
 * @file src/modules/theme/theme_view.js
 * @version 3.0.0-RELEASE-DOD-FORK
 * @description Пассивное TUI-представление Панели Тем (Presentation-контур).
 * Синхронно заполняет локальную матрицу строками доступных цветовых палитр ядра СМО.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { drawThemeItem } from "./theme_item_renderer.js";

/**
 * Фабрика выделения локального запечатанного TUI-буфера отображения панели тем
 * @param {string} slotIdStr Идентификатор целевой панели
 * @returns {Object} Запечатанная мономорфная структура представления
 */
export function createThemeViewInstance(slotIdStr) {
    const viewState = {
        slotId: String(slotIdStr || "106"),
        width: 36,
        height: 16,
        _isFocused: false,
        localBuffer: { matrix: null }
    };

    const m = new Array(64);
    for (let y = 0; y < 64; y++) {
        m[y] = new Array(512);
        for (let x = 0; x < 512; x++) {
            m[y][x] = { char: " ", fg: "\x1b[37m", bg: "\x1b[40m" };
            Object.preventExtensions(m[y][x]);
        }
        Object.preventExtensions(m[y]);
    }
    
    viewState.localBuffer.matrix = m;
    Object.preventExtensions(viewState.localBuffer);
    Object.preventExtensions(viewState);
    return viewState;
}

/**
 * Синхронный накат списка тем на плоские строки ОЗУ-матрицы прибора
 * @param {Object} view Ссылка на буфер отображения прибора
 * @param {Object} mdl Ссылка на мономорфную модель данных палитр
 */
export function renderThemeContent(view, mdl) {
    if (!view || !mdl || !view.localBuffer.matrix) return;

    const m = view.localBuffer.matrix;
    const currentW = Math.max(1, Math.floor(view.width || 36));
    const currentH = Math.max(1, Math.floor(view.height || 16));

    // Очищаем рабочую область контента внутри двойных рам
    for (let y = 1; y < currentH - 1; y++) {
        const row = m[y];
        if (!row) continue;
        for (let x = 1; x < currentW - 1; x++) {
            row[x].char = " "; 
            row[x].fg = "\x1b[37m"; 
            row[x].bg = "\x1b[40m";
        }
    }

    const list = mdl.themesList || [];
    const len = list.length;
    const maxVisibleRows = Math.min(len, currentH - 2);

    for (let i = 0; i < maxVisibleRows; i++) {
        const themeItem = list[i];
        const targetRowY = 2 + i; 
        const row = m[targetRowY];

        if (row && themeItem) {
            const isSelected = (i === Math.floor(mdl.selectedIndex || 0));

            // ВЫЗОВ ВНЕШНЕГО СТАТИЧЕСКОГО СТРОКОВОГО РЕНДЕРЕРА
            drawThemeItem(row, themeItem, currentW, isSelected);
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/theme_view.js
 * Время модификации: 18.08.2026 18:12:45 MSK
 */
