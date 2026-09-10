/**
 * @file src/core/slot_maker/tab_render_utils.js
 * @version 1.0.0-RELEASE-SMO-IOC-TAB-RENDER-UTILS
 * @description Безаллокационный выжигатель вкладок многовкладочных панелей в Int32Array (0% OOP).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { packCellBits } from "../../io/terminal/sprite_blit.js";

/**
 * Посимвольно накатывает вкладки на строку Y = 1 мономорфного Int32Array буфера
 */
export function drawCommonMultiTabs(facility, tabRowInt32Array, currentW) {
    if (!facility || !tabRowInt32Array || !facility.viewStack) return;

    const tabsArray = facility.viewStack;
    const tabsCount = tabsArray.length;
    const activeTabIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
    
    let currentTabX = 2;
    const maxCols = Math.max(1, Math.floor(currentW || 40));

    for (let t = 0; t < tabsCount; t++) {
        const tabNode = tabsArray[t];
        if (!tabNode) continue;

        const titleStr = String(tabNode.tabTitle || (tabNode.mdl && tabNode.mdl._localTabTitle) || "TAB");
        const isCurrentTab = (t === activeTabIdx);
        const tabLabelStr = " " + titleStr + " ";
        const len = tabLabelStr.length;
        
        let bg = "\x1b[48;5;236m"; 
        let fg = "\x1b[38;5;246m";

        if (isCurrentTab) {
            fg = "\x1b[38;5;16m"; 
            const zoneFocusNum = Math.floor(tabNode.mdl?._activeSubZone ?? 0);
            // Если фокус на контенте (1) — золото, если фокус на вкладках — бирюза
            bg = (zoneFocusNum === 1) ? "\x1b[48;5;220m" : "\x1b[48;5;51m"; 
        }

        // Задаем точные экранные иксы в ОЗУ модели для Канала 12
        if (tabNode.mdl) {
            tabNode.mdl._tabStartX = currentTabX;
            tabNode.mdl._tabEndX = currentTabX + len;
        }

        // Прекомпилируем битовые маски символов вкладки в один такт
        for (let i = 0; i < len; i++) {
            if (currentTabX + i < maxCols - 1) {
                tabRowInt32Array[currentTabX + i] = packCellBits(tabLabelStr.charAt(i), fg, bg);
            }
        }
        currentTabX += len + 1;
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker/tab_render_utils.js
 * Время создания: 03.09.2026 13:37:05 MSK
 */
