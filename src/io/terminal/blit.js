/**
 * @file src/io/terminal/blit.js
 * @version 3.0.2-RELEASE-SMO-VIEWPORT-BLIT-CONVERGED
 * @description Чистая пассивная процедура выжигания экранных буферов (Control/Presentation).
 * Извлекает скомпонованный растр Юникод-матрицы из дерева и направляет в TTY-флушер.
 * ИСПРАВЛЕНА АСИНХРОННАЯ ГОНКА: Внедрена строгая линковка фазы флуша через Promise-разрешение дерева.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { synchronizeDisplayTree } from "./tree_builder.js";
import { flushVirtualCanvasToTty } from "./flusher.js";

/**
 * Извлекает и синхронизирует итоговую TUI-матрицу для отправки в физический дескриптор терминала
 * @param {Object} virtualCanvasState Состояние виртуального холста ConPTY
 * @param {Object} host Ссылка на рантайм ядра хоста
 * @param {Object} geoMap Актуальная рассчитанная карта геометрии ОЗУ
 * @returns {Promise<boolean>} Промис успешности отправки кадра
 */
export async function executeViewportBlit(virtualCanvasState, host, geoMap) {
    if (!virtualCanvasState || !host || !geoMap) return false;

    // Удерживаем тактовый барьер через await для детерминированного послойного блайтинга
    const rootDisplayNode = await synchronizeDisplayTree(virtualCanvasState, host, geoMap);
    
    if (!rootDisplayNode || !rootDisplayNode.matrix) {
        return false;
    }

    // Вызываем атомарное попиксельное выжигание в дескриптор только после полной сборки дерева
    flushVirtualCanvasToTty(virtualCanvasState, host, geoMap);
    return true;
}
