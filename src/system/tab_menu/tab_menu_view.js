/**
 * @file src/system/tab_menu/tab_menu_view.js
 * @version 1.0.0-RELEASE-SMO-SYS-TAB-MENU-VIEW
 * @description Пассивный безаллокационный выжигатель плашек Window Manager в Int32Array (PAC / Presentation).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { packCellBits } from "../../io/terminal/sprite_blit.js";

/**
 * Осуществляет посимвольный накат вкладок на строку Y = 1 буфера панели
 */
export function renderTabMenuBarInline(rowInt32Array, activeIdx, titlesArray, currentW, isFocused) {
    if (!rowInt32Array || !titlesArray) return;

    const count = titlesArray.length;
    const maxCols = Math.max(1, Math.floor(currentW || 40));
    
    let currentTabX = 2; // Канонический TUI-отступ слева
    const bgPassive = "\x1b[48;5;236m";
    const fgPassive = "\x1b[38;5;246m";

    for (let t = 0; t < count; t++) {
        const titleStr = String(titlesArray[t] || "TAB");
        const tabLabelStr = " " + titleStr + " ";
        const len = tabLabelStr.length;
        const isCurrent = (t === activeIdx);

        const bg = isCurrent ? (isFocused ? "\x1b[48;5;220m" : "\x1b[48;5;51m") : bgPassive;
        const fg = isCurrent ? "\x1b[38;5;16m" : fgPassive;

        for (let i = 0; i < len; i++) {
            if (currentTabX + i < maxCols - 1) {
                rowInt32Array[currentTabX + i] = packCellBits(tabLabelStr.charAt(i), fg, bg);
            }
        }
        currentTabX += len + 1;
    }
}
