/**
 * @file src/modules/theme/theme_item_renderer.js
 * @version 3.1.2-RELEASE-DOD-THEME-ITEM-SAFE-DATA-BOUNDS
 * @description Чистый пассивный DOD-отрисовщик строки выбора темы оформления (Presentation-контур).
 * ИСПРАВЛЕН КРАШ 106: Внедрен безаллокационный гвард для защиты от undefined полей в JSON тем.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { packCellBits } from "../../io/terminal/sprite_blit.js";

/**
 * Посимвольно выжигает одну строку темы в мономорфный числовой массив row
 */
export function drawThemeItem(row, themeItem, currentW, isSelected) {
    if (!row || !themeItem) return;

    const fg = isSelected ? "\x1b[38;5;16m" : "\x1b[38;5;231m";
    const bg = isSelected ? "\x1b[48;5;220m" : "\x1b[40m"; 

    const prefixStr = isSelected ? " ► " : "   ";
    
    // ИСПРАВЛЕНИЕ: Безопасное извлечение имени палитры из JSON-ноды без генерации undefined артефактов
    const rawNameStr = themeItem.name || themeItem.themeName || themeItem.borderColorMsk || themeItem.colorMask || "Unknown Theme";
    const cleanThemeNameStr = String(rawNameStr);
    
    const finalLineStr = prefixStr + cleanThemeNameStr;
    const printLen = Math.min(finalLineStr.length, currentW - 2);

    for (let x = 0; x < printLen; x++) {
        if (1 + x < currentW - 1) {
            // Пишем готовое упакованное число в ячейку Int32Array строки
            row[1 + x] = packCellBits(finalLineStr.charAt(x), fg, bg);
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/theme_item_renderer.js
 * Время исправления: 03.09.2026 15:58:45 MSK
 */
