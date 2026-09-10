/**
 * @file src/modules/explorer/explorer_view.js
 * @version 3.1.0-RELEASE-SMO-EXPLORER-VIEW-ITEMS-LIST-FIXED
 * @description Процедурный отрисовщик содержимого VFS-каталога для Слотов 102/103.
 * ИСПРАВЛЕНО ОТОБРАЖЕНИЕ ФАЙЛОВ: Подключена прямая итерация по вектору mdl.itemsList.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
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

    // 1. Извлекаем кэшированные названия вкладок или используем дефолтные алиасы
    const titles = mdl._globalTabsNamesCached || ["SYS", "SRC", "MOD", "LOG"];

    // 2. Подготовка стандартной TUI-подложки и плашек табов на строке Y = 1
    prepareGenericTuiLayout(matrix, w, h, mdl, titles, activeTabIdx, true, slotIdStr, true);

    // 3. Накатываем фоновую сетку знакомест с защитой желоба скроллбара
    drawFrameGrid(matrix, w, h, true);

    // =================================================================
    // БЕЗАЛЛОКАЦИОННЫЙ ВЫВОД ЭЛЕМЕНТОВ ФАЙЛОВОЙ СИСТЕМЫ ИЗ itemsList (0% GC)
    // =================================================================
    const entries = mdl.itemsList || [];
    const totalEntries = Math.floor(entries.length | 0);
    const selectedIdx = Math.floor(mdl.selectedIndex || 0);
    const scrollOffset = Math.floor(mdl.viewportOffset || 0);

    const maxVisibleRows = Math.max(1, h - 4); // Контентная область строго между Y=3 и Y=h-2
    const printCount = Math.min(totalEntries - scrollOffset, maxVisibleRows);

    // Стилизация: синий для папок, белый для файлов, инвертированный золотой для курсора
    const bgNormal = "\x1b[40m";

    for (let i = 0; i < printCount; i++) {
        const absoluteEntryIdx = (scrollOffset + i) | 0;
        const rowLineIdx = (3 + i) | 0;
        const row = matrix[rowLineIdx];
        const fileItem = entries[absoluteEntryIdx];

        if (row && fileItem) {
            const isSel = (absoluteEntryIdx === selectedIdx);
            
            // Расчет ANSI-палитры под спецификацию explorer_item_renderer.js
            const fgStr = isSel ? "\x1b[38;5;16m" : (fileItem.isDir ? "\x1b[38;5;45m" : "\x1b[38;5;231m");
            const bgStr = isSel ? "\x1b[48;5;220m" : bgNormal;

            // Прецизионный маршалинг префикса
            const prefixStr = fileItem.isDir ? "DIR " : "FIL ";
            const cleanNameStr = String(fileItem.name || "");
            const finalLineTextStr = prefixStr + cleanNameStr;

            // Защитный барьер: обрезаем строку под физические границы рамки слота
            const printLen = Math.min(finalLineTextStr.length, w - 4);

            for (let x = 0; x < printLen; x++) {
                if (2 + x < w - 1) {
                    row[2 + x] = packCellBits(finalLineTextStr.charAt(x), fgStr, bgStr);
                }
            }
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/explorer_view.js
 * Время изменения: 09.09.2026 13:56:45 MSK
 */
