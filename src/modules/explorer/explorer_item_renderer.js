/**
 * @file src/modules/explorer/explorer_item_drawer.js
 * @version 3.0.2-RELEASE-SMO-EXPLORER-ITEM-DRAWER-DOD
 * @description Пассивный процедурный отрисовщик строк файлов и директорий для проводников 102/103.
 * Осуществляет посимвольный blit-перенос метаданных VFS в мономорфные ячейки ОЗУ.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Отрисовывает одну строку элемента файловой системы внутри буфера строки матрицы
 * @param {Object[]} row Ссылка на плоский массив ячеек целевой строки матрицы
 * @param {Object} fileItem Дескриптор элемента VFS (имя, флаг директории)
 * @param {number} currentW Текущая физическая ширина слота прибора
 * @param {boolean} isRowSelected Флаг фокуса/выделения данной строки курсором
 */
export function drawExplorerItem(row, fileItem, currentW, isRowSelected) {
    // СТРОГИЙ ИНЛАЙН-ГВАРД: Если данные элемента отсутствуют - мгновенно выходим, не обрывая кадр
    if (!row || !fileItem) return;
    
    const fgColorStr = isRowSelected ? "\x1b[38;5;16m" : (fileItem.isDir ? "\x1b[38;5;45m" : "\x1b[38;5;231m");
    const bgColorStr = isRowSelected ? "\x1b[48;5;220m" : "\x1b[40m";
    const prefixStr = fileItem.isDir ? "DIR " : "FIL ";
    const cleanNameStr = String(fileItem.name || "");
    const finalLineTextStr = prefixStr + cleanNameStr;
    const printLen = Math.min(finalLineTextStr.length, currentW - 4);
    
    for (let x = 0; x < printLen; x++) {
        const cell = row[2 + x];
        if (cell && (2 + x < currentW - 1)) {
            cell.char = finalLineTextStr.charAt(x);
            cell.fg = fgColorStr;
            cell.bg = bgColorStr;
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/explorer_item_drawer.js
 * Время модификации: 18.08.2026 17:21:10 MSK
 */
