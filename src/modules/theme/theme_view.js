/**
 * @file src/modules/theme/theme_view.js
 * @version 3.3.0-RELEASE-SMO-THEME-VIEW-SCROLLBAR-BOUND
 * @description Пассивный процедурный отрисовщик TUI-строк палитр Слота 106 с поддержкой смещения вьюпорта.
 * ИСПРАВЛЕНО: Интегрирован учет viewportOffset от Канала 14 и исправлен расчет totalThemes.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { prepareGenericTuiLayout } from "../../io/terminal/generic_tui_layout.js";
import { drawFrameGrid } from "../../io/terminal/frame_grid_renderer.js";
import { drawThemeItem } from "./theme_item_renderer.js";
import { _gpssEngineState } from "../../core/smo/bus.js";

/**
 * Унифицированная процедура рендеринга контента Панели Тем
 */
export function renderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack) {
    if (!matrix || !mdl) return;

    const w = Math.floor(currentW || 40);
    const h = Math.floor(currentH || 15);

    const titles = mdl._globalTabsNamesCached || ["PALETTE"];

    // 1. Очистка и базовая подготовка TUI-шаблона
    prepareGenericTuiLayout(matrix, w, h, mdl, titles, activeTabIdx, false, slotIdStr, true);

    // 2. Накатываем координатную сетку знакомест с защитой желоба скроллбара
    drawFrameGrid(matrix, w, h, true);

    // 3. Считываем живое смещение прокрутки Палитры из модели Канала 14 (0% GC)
    const vScrollMdl = _gpssEngineState.facilitiesRegistry.get("14")?.mdl;
    const offset = vScrollMdl ? Math.max(0, Math.floor(vScrollMdl.viewportOffsetRegistry[106] || 0)) : 0;

    // 4. Построчный вывод тем с учетом вьюпорта с Y = 3
    const themes = mdl.themesList || [];
    const total = themes.length; // Фикс: берем реальную физическую длину массива в ОЗУ
    const selected = Math.floor(mdl.selectedIndex || 0);

    // Вычисляем физический лимит строк контента
    const maxVisibleRows = Math.max(1, h - 4);
    
    // Количество строк, которые физически будут выведены на экран в текущем вьюпорте
    const printCount = Math.min(maxVisibleRows, Math.max(0, total - offset));

    for (let i = 0; i < printCount; i++) {
        const rowLineIdx = 3 + i;
        const row = matrix[rowLineIdx];
        
        // Читаем объект темы с учетом абсолютного смещения прокрутки
        const themeItem = themes[offset + i];

        if (row && themeItem) {
            // Сопоставляем фокус по абсолютному индексу элемента в ОЗУ
            const isSelected = (offset + i === selected);
            
            // Вызываем пассивный атомарный отрисовщик строки темы
            drawThemeItem(row, themeItem, w, isSelected);
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/theme_view.js
 * Время изменения: 10.09.2026 21:05:00 MSK
 */
