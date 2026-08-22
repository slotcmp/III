/**
 * @file src/modules/theme/theme_item_renderer.js
 * @version 3.0.0-RELEASE-DOD-FORK
 * @description Чистый пассивный DOD-отрисовщик строки выбора темы оформления (Presentation-контур).
 * Выполняет посимвольный blit-перенос названий палитр в ячейки строки с инжекцией маркера фокуса.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Посимвольно выжигает одну строку темы в мономорфный массив ячеек row
 * @param {Object[]} row Ссылка на плоский массив ячеек целевой строки матрицы
 * @param {Object} themeItem Дескриптор темы оформления (имя, маска цвета)
 * @param {number} currentW Текущая физическая ширина слота прибора в знакоместах
 * @param {boolean} isSelected Флаг выбора/фокуса данной строки селектором
 */
export function drawThemeItem(row, themeItem, currentW, isSelected) {
    if (!row || !themeItem) return;

    const fg = isSelected ? "\x1b[38;5;16m" : "\x1b[38;5;231m";
    const bg = isSelected ? "\x1b[48;5;220m" : "\x1b[40m"; 

    const prefixStr = isSelected ? " ► " : "   ";
    const finalLineStr = prefixStr + themeItem.name;

    const printLen = Math.min(finalLineStr.length, currentW - 2);
    for (let x = 0; x < printLen; x++) {
        const cell = row[1 + x];
        if (cell && (1 + x < currentW - 1)) {
            cell.char = finalLineStr.charAt(x);
            cell.fg = fg;
            cell.bg = bg;
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * @file src/modules/theme/theme_item_renderer.js
 * Время модификации: 18.08.2026 18:14:10 MSK
 */
