/**
 * @file src/modules/explorer/explorer_item_renderer.js
 * @version 3.1.1-RELEASE-SMO-EXPLORER-ITEM-DRAWER-FAST-NUMBERS-STABLE
 * @description Пассивный процедурный отрисовщик строк файлов и директорий для проводников 102/103.
 * ИСПРАВЛЕН КРАШ ПРИМИТИВОВ: Изъяты ООП-проверки Object.isExtensible над числами Int32Array.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { packCellBits } from "../../io/terminal/sprite_blit.js";

/**
 * Отрисовывает одну строку элемента файловой системы внутри буфера строки матрицы
 * @param {Int32Array} row Ссылка на плоскую числовую строку матрицы
 * @param {Object} fileItem Дескриптор элемента VFS (имя, флаг директории)
 * @param {number} currentW Текущая физическая ширина слота прибора
 * @param {boolean} isRowSelected Флаг фокуса/выделения данной строки курсором
 */
export function drawExplorerItem(row, fileItem, currentW, isRowSelected) {
    if (!row || !fileItem) return;
    
    const fgColorStr = isRowSelected ? "\x1b[38;5;16m" : (fileItem.isDir ? "\x1b[38;5;45m" : "\x1b[38;5;231m");
    const bgColorStr = isRowSelected ? "\x1b[48;5;220m" : "\x1b[40m";
    const prefixStr = fileItem.isDir ? "DIR " : "FIL ";
    const cleanNameStr = String(fileItem.name || "");
    const finalLineTextStr = prefixStr + cleanNameStr;
    const printLen = Math.min(finalLineTextStr.length, currentW - 4);
    
    for (let x = 0; x < printLen; x++) {
        if (2 + x < currentW - 1) {
            // Прямая, защищенная от крашей попиксельная инжекция маски числа в Int32Array
            row[2 + x] = packCellBits(finalLineTextStr.charAt(x), fgColorStr, bgColorStr);
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/explorer_item_renderer.js
 * Время исправления: 03.09.2026 13:18:00 MSK
 */
