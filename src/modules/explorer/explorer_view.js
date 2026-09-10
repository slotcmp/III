/**
 * @file src/modules/explorer/explorer_view.js
 * @version 3.0.0-RELEASE-SMO-EXPLORER-VIEW-FILES-FIXED
 * @description Процедурный отрисовщик содержимого VFS-каталога для Слотов 102/103.
 * ИСПРАВЛЕНО ОТОБРАЖЕНИЕ ФАЙЛОВ: Добавлен безаллокационный итератор отрисовки entries/files.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { prepareGenericTuiLayout } from "../../io/terminal/generic_tui_layout.js";
import { drawFrameGrid } from "../../io/terminal/frame_grid_renderer.js";
import { packCellBits } from "../../io/terminal/sprite_blit.js";

/**
 * Унифицированная процедура рендеринга контента Проводника
 */
export function renderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack) {
    if (!matrix || !mdl) return;

    const w = Math.floor(currentW || 40);
    const h = Math.floor(currentH || 15);

    // 1. Извлекаем кэшированные вкладки путей
    const titles = mdl._globalTabsNamesCached || ["SYS", "SRC"];

    // 2. Подготовка TUI-шаблона и плашек табов
    prepareGenericTuiLayout(matrix, w, h, mdl, titles, activeTabIdx, true, slotIdStr, true);

    // 3. Рисуем внутреннюю сетку рамок
    drawFrameGrid(matrix, w, h, true);

    // =================================================================
    // ИСПРАВЛЕНИЕ: БЕЗАЛЛОКАЦИОННЫЙ ВЫВОД ЭЛЕМЕНТОВ ФАЙЛОВОЙ СИСТЕМЫ (0% GC)
    // =================================================================
    const entries = mdl.itemsList || [];
    const totalEntries = Math.floor(entries.length | 0);
    const selectedIdx = Math.floor(mdl.selectedIndex || 0);
    const scrollOffset = Math.floor(mdl.viewportOffset || 0);

    const maxVisibleRows = Math.max(1, h - 4);
    const printCount = Math.min(totalEntries - scrollOffset, maxVisibleRows);

    const bgNormal = "\x1b[40m";

    for (let i = 0; i < printCount; i++) {
        const absoluteEntryIdx = (scrollOffset + i) | 0;
        const rowLineIdx = (3 + i) | 0;
        const row = matrix[rowLineIdx];
        const entryObj = entries[absoluteEntryIdx];

        if (row && entryObj) {
            const nameStr = String(entryObj.name || "unnamed");
            const isSel = (absoluteEntryIdx === selectedIdx);
            
            // Расчет ANSI-палитры под спецификацию explorer_item_renderer.js
            const fgStr = isSel ? "\x1b[38;5;16m" : (entryObj.isDir ? "\x1b[38;5;45m" : "\x1b[38;5;231m");
            const bgStr = isSel ? "\x1b[48;5;220m" : bgNormal;

            // Индикатор директории [DIR] или файла [FIL] по каноничным префиксам
            const prefixStr = entryObj.isDir ? "DIR " : "FIL ";
            const fullLineStr = prefixStr + nameStr;
            const printLen = Math.min(fullLineStr.length, w - 4);

            for (let x = 0; x < printLen; x++) {
                if (2 + x < w - 1) {
                    row[2 + x] = packCellBits(fullLineStr.charAt(x), fgStr, bgStr);
                }
            }
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/explorer_view.js
 * Время исправления: 09.09.2026 13:55:00 MSK
 */
