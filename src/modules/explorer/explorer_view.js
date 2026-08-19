/**
 * @file src/modules/explorer/explorer_view.js
 * @version 3.0.1-RELEASE-SMO-EXPLORER-VIEW-RESOLVED
 * @description Модуль отрисовки интерфейса проводников 102/103 (Presentation-контур).
 * Путь импорта перенаправлен на реальный физический файл explorer_item_renderer.js для устранения ERR_MODULE_NOT_FOUND.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

// ПРЕЦИЗИОННОЕ ИСПРАВЛЕНИЕ: Связываем импорт с реальным физическим файлом на диске
import { drawExplorerItem } from "./explorer_item_renderer.js";

/**
 * Фабрика выделения локального запечатанного TUI-буфера отображения панели
 * @param {string} slotIdStr Идентификатор целевой панели
 * @returns {Object} Запечатанная мономорфная структура представления
 */
export function createExplorerViewInstance(slotIdStr) {
    const viewState = {
        slotId: String(slotIdStr || "102"),
        width: 42,
        height: 16,
        _isFocused: false,
        _activeTabIdx: 0,
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
 * Синхронный впек вкладок и скользящего окна файлов в локальную матрицу ОЗУ
 * @param {Object} view Ссылка на буфер отображения прибора
 * @param {Object} mdl Ссылка на плосную модель данных вкладок
 * @param {number} tabIndexNum Числовой индекс активной вкладки
 */
export function renderExplorerContent(view, mdl, tabIndexNum) {
    if (!view || !mdl || !view.localBuffer.matrix) return;

    const m = view.localBuffer.matrix;
    const currentW = Math.max(1, Math.floor(view.width || 42));
    const currentH = Math.max(1, Math.floor(view.height || 16));
    const activeTabIdx = Math.max(0, Math.floor(tabIndexNum || 0));

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

    // Рендеринг бирюзовых вкладок T1..T4
    const tabRow = m[1];
    if (tabRow) {
        let currentTabX = 2;
        for (let t = 0; t < 4; t++) {
            const isCurrentTab = (t === activeTabIdx);
            const tabLabelStr = " T" + (t + 1) + " ";
            const len = tabLabelStr.length;
            const fg = isCurrentTab ? "\x1b[38;5;16m" : "\x1b[38;5;246m";
            const bg = isCurrentTab ? "\x1b[48;5;51m" : "\x1b[48;5;236m"; 

            for (let i = 0; i < len; i++) {
                const cell = tabRow[currentTabX + i];
                if (cell && (currentTabX + i < currentW - 1)) {
                    cell.char = tabLabelStr.charAt(i); 
                    cell.fg = fg; 
                    cell.bg = bg;
                }
            }
            currentTabX += len + 1;
        }
    }

    // Рендеринг скользящего окна файлов на базе координат selectedIndex модели
    const items = mdl.itemsList || [];
    const totalItems = items.length;
    const maxVisibleRows = currentH - 4;
    const viewportOffset = Math.max(0, Math.floor(mdl.viewportOffset || 0));

    for (let r = 0; r < maxVisibleRows; r++) {
        const itemIdx = viewportOffset + r;
        if (itemIdx >= totalItems) break;

        const fileItem = items[itemIdx];
        const targetRowY = 3 + r;
        const fileRow = m[targetRowY];

        if (fileRow && fileItem) {
            const isRowSelected = (itemIdx === Math.floor(mdl.selectedIndex || 0));
            
            // Передаем плоскую строку ОЗУ во внешний байтовый itemRenderer
            drawExplorerItem(fileRow, fileItem, currentW, isRowSelected);
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/explorer_view.js
 * Время модификации: 18.08.2026 18:09:12 MSK
 */
