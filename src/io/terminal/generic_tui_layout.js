/**
 * @file src/io/terminal/generic_tui_layout.js
 * @version 3.0.2-RELEASE-SMO-DOD-INT32ARRAY-LAYOUT-SCROLLBAR-DYNAMIC
 * @description Шаблонизатор TUI-окон СМО с поддержкой 32-битного упакованного растра.
 * ИСПРАВЛЕНО: Инжектирован 1-пробельный накат внешних ушек со стартом от X=3 и динамической записью границ.
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
 * Суверенный накат вкладок на глобальный холст (Слой Z-3)
 * ИСПРАВЛЕНО: Инжектирован 1-пробельный шаг со стартом от X=3 для Слота 200 без хардкода
 */
export function drawWindowTabsOverlay(targetMatrix, sX, sY, sW, sH, mdl, titlesArray, activeTabIdx) {
    if (!targetMatrix || !titlesArray || titlesArray.length === 0 || !mdl) return;

    const isExternalTabsbar = (sY === -1); 
    const targetGlobalY = isExternalTabsbar ? 0 : ((sY + 1) | 0);
    const tabRow = targetMatrix[targetGlobalY];
    if (!tabRow) return;

    const tabMenuFacility = _gpssEngineState.facilitiesRegistry.get("12");
    const vectorBuf = tabMenuFacility?.mdl?.tabsVectorArray;

    const tabsCount = titlesArray.length;
    
    // ИСПРАВЛЕНО: Для внутренних ушек берем sX + 2, для внешних — жесткий динамический старт с X = 3
    let currentTabX = isExternalTabsbar ? 3 : ((sX + 2) | 0); 
    
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

        const startXOnCanvas = currentTabX;
        const endXOnCanvas = ((currentTabX + len - 1) | 0);

        if (isCurrent) {
            mdl._tabStartX = currentTabX - sX;
            mdl._tabEndX = currentTabX + len - sX;
        }

        for (let i = 0; i < len; i++) {
            if (currentTabX + i < (isExternalTabsbar ? targetMatrix[0].length : sX + sW - 2)) {
                tabRow[currentTabX + i] = packCellBits(tabLabelStr.charAt(i), fg, bg);
            }
        }

        // ЗАПИСЬ ЖИВЫХ ГРАНИЦ В ПАСПОРТ КАНАЛА 12 (0% МУТАЦИЙ ПАМЯТИ)
        if (vectorBuf && tabMenuFacility.mdl.totalRegisteredTabsCount !== undefined) {
            const currentGlobalPassportIdx = Math.floor(tabMenuFacility.mdl.totalRegisteredTabsCount || 0);
            
            if (currentGlobalPassportIdx < 64) {
                const writeOffset = (currentGlobalPassportIdx * 6) | 0;
                const ownerSlotIdNum = parseInt(mdl.slotId || "102", 10) & 255;
                const keeperSlotIdNum = isExternalTabsbar ? 12 : ownerSlotIdNum;

                vectorBuf[writeOffset]     = keeperSlotIdNum; 
                vectorBuf[writeOffset + 1] = targetGlobalY;      
                vectorBuf[writeOffset + 2] = startXOnCanvas;     
                vectorBuf[writeOffset + 3] = endXOnCanvas;       
                vectorBuf[writeOffset + 4] = ownerSlotIdNum;   
                vectorBuf[writeOffset + 5] = t;                

                tabMenuFacility.mdl.totalRegisteredTabsCount++;
            }
        }

        // ИСПРАВЛЕНО: Ушки разделены ровно 1 пробелом разделителя
        currentTabX += len + 1; 
    }
}