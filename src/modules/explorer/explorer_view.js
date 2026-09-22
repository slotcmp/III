/**
 * @file src/modules/explorer/explorer_view.js
 * @version 3.2.0-RELEASE-SMO-EXPLORER-VIEW-STABLE-items-FIXED
 * @description Процедурный отрисовщик содержимого VFS-каталога для Слотов 102/103.
 * ИСПРАВЛЕНО: Поле итерации синхронизировано с IPC-пакетом воркера (mdl.items).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
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

    // 1. Извлекаем названия вкладок (SYS | SRC | MOD | LOG)
    const titles = mdl._globalTabsNamesCached || ["SYS", "SRC", "MOD", "LOG"];

    // 2. Подготовка стандартной TUI-подложки и плашек табов на строке Y = 1
    prepareGenericTuiLayout(matrix, w, h, mdl, titles, activeTabIdx, true, slotIdStr, true);

    // 3. Накатываем фоновую сетку знакомест с защитой желоба скроллбара
    drawFrameGrid(matrix, w, h, true);

    // =================================================================
    // СИНХРОНИЗИРOВАНО: ВЫВОД ИЗ mdl.items ПОД ТАКТЫ VFS_WORKER (0% GC)
    // =================================================================
    const entries = mdl.items || mdl.itemsList || [];
    const totalEntries = entries.length;
    const selectedIdx = Math.floor(mdl.selectedIndex || 0);
    const scrollOffset = Math.floor(mdl.viewportOffset || 0);

    const maxVisibleRows = Math.max(1, h - 4); // Контент строго между Y=3 и Y=h-2
    const printCount = Math.min(totalEntries - scrollOffset, maxVisibleRows);

    const bgNormal = "\x1b[40m";

    for (let i = 0; i < printCount; i++) {
        const absoluteEntryIdx = (scrollOffset + i) | 0;
        const rowLineIdx = (3 + i) | 0;
        const row = matrix[rowLineIdx];
        const fileItem = entries[absoluteEntryIdx];

        if (row && fileItem) {
            const isSel = (absoluteEntryIdx === selectedIdx);
            
            // Золотая плашка \x1b[48;5;220m при фокусе, синий для папок, белый для файлов
            const fgStr = isSel ? "\x1b[38;5;16m" : (fileItem.isDir ? "\x1b[38;5;45m" : "\x1b[38;5;231m");
            const bgStr = isSel ? "\x1b[48;5;220m" : bgNormal;

            const prefixStr = fileItem.isDir ? "DIR " : "FIL ";
            const cleanNameStr = String(fileItem.name || "");
            const finalLineTextStr = prefixStr + cleanNameStr;

            // Защитный барьер от вылета за правую границу рамки окна
            const printLen = Math.min(finalLineTextStr.length, w - 4);

            for (let x = 0; x < printLen; x++) {
                if (2 + x < w - 1) {
                    row[2 + x] = packCellBits(finalLineTextStr.charAt(x), fgStr, bgStr);
                }
            }
        }
    }
}
