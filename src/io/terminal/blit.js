/**
 * @file src/io/terminal/blit.js
 * @version 3.0.1-RELEASE-SMO-VIEWPORT-BLIT-PASSTHROUGH
 * @description Чистая пассивная процедура выжигания экранных буферов (Control/Presentation).
 * Извлекает скомпонованный растр Юникод-матрицы из дерева и направляет в TTY-флушер.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { synchronizeDisplayTree } from "./tree_builder.js";
import { flushVirtualCanvasToTty } from "./flusher.js";

/**
 * Извлекает и синхронизирует итоговую TUI-матрицу для отправки в физический дескриптор терминала
 * @param {Object} virtualCanvasState Состояние виртуального холста ConPTY
 * @param {Object} host Ссылка на рантайм ядра хоста
 * @param {Object} geoMap Актуальная рассчитанная карта геометрии ОЗУ
 * @returns {boolean} Флаг успешности отправки кадра
 */
/**
 * Извлекает и синхронизирует итоговую TUI-матрицу для отправки в физический дескриптор терминала
 */
export function executeViewportBlit(virtualCanvasState, host, geoMap) {
    if (!virtualCanvasState || !host || !geoMap) return false;

    const rootDisplayNode = synchronizeDisplayTree(virtualCanvasState, host, geoMap);
    if (!rootDisplayNode || !rootDisplayNode.matrix) return false;

    // ИСПРАВЛЕНО: передаем рантайм ядра хоста и карту геометрии вместо сырых габаритов
    flushVirtualCanvasToTty(virtualCanvasState, host, geoMap);
    return true;
}


/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/blit.js
 * Время модификации: 18.08.2026 16:42:10 MSK
 */
