/**
 * @file src/modules/theme/theme_view.js
 * @version 3.2.1-RELEASE-SMO-THEME-VIEW-Z3-TAB-FIXED
 * @description Пассивный процедурный отрисовщик TUI-строк палитр Слота 106.
 * ИСПРАВЛЕН СДВИГ ВКЛАДКИ: Отрисовка таба PALETTE полностью делегирована слою Z-3.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { prepareGenericTuiLayout } from "../../io/terminal/generic_tui_layout.js";
import { drawFrameGrid } from "../../io/terminal/frame_grid_renderer.js";
import { drawThemeItem } from "./theme_item_renderer.js";

/**
 * Унифицированная процедура рендеринга контента Панели Тем
 */
export function renderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack) {
    if (!matrix || !mdl) return;

    const w = Math.floor(currentW || 40);
    const h = Math.floor(currentH || 15);

    // 1. Извлекаем кэшированный плоский массив имен вкладок
    const titles = mdl._globalTabsNamesCached || ["PALETTE"];

    // 2. ИСПРАВЛЕНИЕ: Передаем false (7-й аргумент) для флага табов. 
    // Шаблонизатор просто очистит строку, а накат плашки PALETTE выполнит Z-3 редьюсер.
    prepareGenericTuiLayout(matrix, w, h, mdl, titles, activeTabIdx, false, slotIdStr, true);

    // 3. Накатываем координатную сетку знакомест с защитой желоба скроллбара
    drawFrameGrid(matrix, w, h, true);

    // 4. Построчный безаллокационный вывод тем из JSON с Y = 3
    const themes = mdl.themesList || [];
    const total = Math.floor(mdl.totalThemes || 0);
    const selected = Math.floor(mdl.selectedIndex || 0);

    // Вычисляем физический лимит строк контента
    const maxVisibleRows = Math.max(1, h - 4);
    const printCount = Math.min(total, maxVisibleRows);

    for (let i = 0; i < printCount; i++) {
        const rowLineIdx = 3 + i;
        const row = matrix[rowLineIdx];
        const themeItem = themes[i];

        if (row && themeItem) {
            const isSelected = (i === selected);
            // Вызываем пассивный атомарный отрисовщик строки темы
            drawThemeItem(row, themeItem, w, isSelected);
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/theme_view.js
 * Время исправления: 09.09.2026 14:35:10 MSK
 */
