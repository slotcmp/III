/**
 * @file src/io/terminal/generic_tui_layout.js
 * @version 2.9.1-RELEASE-SMO-DOD-GENERIC-TUI-LAYOUT-SCROLLBAR-SHIFT
 * @description Внутренний шаблонизатор TUI-окон СМО.
 * ИСПРАВЛЕНО: Желоб скроллбара сдвинут на w-3 для гарантированной защиты правой рамы ║ от выдавливания.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { packCellBits } from "./sprite_blit.js";
import { _gpssEngineState } from "../../core/smo/bus.js";

/**
 * Комплексная стерильная подготовка буфера прибора под налив контента (Слой Z-1)
 */
export function prepareGenericTuiLayout(matrix, currentW, currentH, mdl, titlesArray, activeTabIdx, isFocused, slotIdStr, hasScrollbarBool) {
    if (!matrix) return;

    const w = Math.max(1, Math.floor(currentW || 40));
    const h = Math.max(1, Math.floor(currentH || 5));

    const cleanSpaceBits = packCellBits(" ", "\x1b[37m", "\x1b[40m");
    for (let y = 3; y < h - 1; y++) {
        const row = matrix[y];
        if (row) {
            for (let x = 1; x < w - 1; x++) {
                row[x] = cleanSpaceBits;
            }
        }
    }

    if (hasScrollbarBool === true && slotIdStr) {
        const vScrollMdl = _gpssEngineState.facilitiesRegistry.get("14")?.mdl;
        if (vScrollMdl) {
            const slotIdNum = parseInt(slotIdStr, 10) & 255;
            const totalItems = Math.max(1, vScrollMdl.totalItemsRegistry[slotIdNum]);
            const viewportOffset = vScrollMdl.viewportOffsetRegistry[slotIdNum];
            
            const barHeight = Math.max(1, h - 4);
            
            // ИСПРАВЛЕНИЕ: Желоб скроллбара сдвинут на безопасный индекс w - 3.
            // Это полностью исключает наплыв символов ░ и █ на правую стену окна при округлениях.
            const targetX = w - 3; 
            
            let sliderHeight = Math.max(1, Math.floor((barHeight * barHeight) / totalItems));
            if (sliderHeight > barHeight) sliderHeight = barHeight;
            
            const maxOffset = totalItems - barHeight;
            const sliderTop = maxOffset > 0 ? Math.floor((viewportOffset * (barHeight - sliderHeight)) / maxOffset) : 0;

            const fgColorStr = isFocused ? "\x1b[38;5;51m" : "\x1b[38;5;242m";
            const bgColorStr = "\x1b[40m";

            for (let y = 0; y < barHeight; y++) {
                const sRow = matrix[3 + y];
                if (sRow) {
                    const isSliderZone = (y >= sliderTop && y < sliderTop + sliderHeight);
                    sRow[targetX] = packCellBits(isSliderZone ? "█" : "░", fgColorStr, bgColorStr);
                }
            }
        }
    }
}

/**
 * Суверенный накат вкладок на глобальный UHD-холст (Слой Z-3)
 */
export function drawWindowTabsOverlay(targetMatrix, sX, sY, sW, sH, mdl, titlesArray, activeTabIdx) {
    if (!targetMatrix || !titlesArray || titlesArray.length === 0 || !mdl) return;

    const tabRow = targetMatrix[sY + 1];
    if (!tabRow) return;

    const tabsCount = titlesArray.length;
    let currentTabX = sX + 2; 
    const bgPassive = "\x1b[48;5;236m"; 
    const fgPassive = "\x1b[38;5;246m";

    for (let t = 0; t < tabsCount; t++) {
        const titleStr = String(titlesArray[t] || "TAB");
        const tabLabelStr = " " + titleStr + " ";
        const len = tabLabelStr.length;
        const isCurrent = (t === Math.floor(activeTabIdx || 0));

        const zoneFocusNum = Math.floor(mdl._activeSubZone ?? 1);
        const bgActive = (zoneFocusNum === 1) ? "\x1b[48;5;220m" : "\x1b[48;5;51m";

        const bg = isCurrent ? bgActive : bgPassive;
        const fg = isCurrent ? "\x1b[38;5;16m" : fgPassive;

        if (isCurrent) {
            mdl._tabStartX = currentTabX - sX;
            mdl._tabEndX = currentTabX + len - sX;
        }

        for (let i = 0; i < len; i++) {
            // ИСПРАВЛЕНИЕ: Жесткий гвард защиты правого края от наплыва букв вкладок
            if (currentTabX + i < sX + sW - 2) {
                tabRow[currentTabX + i] = packCellBits(tabLabelStr.charAt(i), fg, bg);
            }
        }
        currentTabX += len + 1;
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/generic_tui_layout.js
 * Время изменения: 10.09.2026 16:22:00 MSK
 */
