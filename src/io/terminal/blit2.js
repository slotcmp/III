/**
 * @file src/io/terminal/blit.js
 * @version 3.1.2-RELEASE-SMO-VIEWPORT-BLIT-PASSTHROUGH
 * @description Чистая пассивная процедура выжигания экранных буферов (Control/Presentation).
 * Извлекает скомпонованный растр Юникод-матрицы из дерева, размечает дельту и направляет во флешер.
 * Исправлена уязвимость ESM Live Bindings (геттеры буферов).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% try-catch / 0% RegExp / 100% ESM.
 */

import { synchronizeDisplayTree } from "./tree_builder.js";
import { 
    flush_dirty_raster, 
    init_raster_buffers,
    get_back_char_buffer,
    get_back_attr_buffer,
    get_dirty_matrix
} from "./flusher.js";

/**
 * Извлекает и синхронизирует итоговую TUI-матрицу для отправки в физический дескриптор терминала
 * @param {Object} virtualCanvasState Состояние виртуального холста ConPTY
 * @param {Object} host Ссылка на рантайм ядра хоста
 * @param {Object} geoMap Актуальная рассчитанная карта геометрии ОЗУ
 * @returns {boolean} Флаг успешности отправки кадра
 */
export function executeViewportBlit(virtualCanvasState, host, geoMap) {
    if (!virtualCanvasState || !host || !geoMap) return false;

    const rootDisplayNode = synchronizeDisplayTree(virtualCanvasState, host, geoMap);
    if (!rootDisplayNode || !rootDisplayNode.matrix) return false;

    const maxRows = Math.floor(rootDisplayNode.h || 30) | 0;
    const maxCols = Math.floor(rootDisplayNode.w || 120) | 0;
    const total_cells = (maxCols * maxRows) | 0;

    // Получаем актуальные живые ссылки на массивы растра
    let char_buf = get_back_char_buffer();
    let attr_buf = get_back_attr_buffer();
    let dirty_mtx = get_dirty_matrix();

    // ГВАРД ЗАЩИТЫ ЯДРА: Если буферы еще не созданы — создаем и перезапрашиваем ссылки
    if (char_buf === null || attr_buf === null || dirty_mtx === null) {
        init_raster_buffers(maxCols, maxRows);
        char_buf = get_back_char_buffer();
        attr_buf = get_back_attr_buffer();
        dirty_mtx = get_dirty_matrix();
    }

    // 1. ПЕРЕНОС ДАННЫХ ИЗ ДЕРЕВА МАТРИЦЫ В ПЛОСКИЙ БУФЕР ФЛЕШЕРА С ВЗВОДОМ БИТА ГРЯЗИ
    const sourceMatrix = rootDisplayNode.matrix;

    for (let i = 0; i < total_cells; i++) {
        const cell = sourceMatrix[i];
        if (!cell) continue;

        // Нормализация символов и SGR-кодов
        const new_char = (typeof cell.char === 'number') ? cell.char : String(cell.char).charCodeAt(0) || 32;
        const new_attr = (cell.attr | 0) || 0;

        // Фиксация дельты: если фаза изменилась — грязним пиксель
        if (char_buf[i] !== new_char || attr_buf[i] !== new_attr) {
            char_buf[i] = new_char;
            attr_buf[i] = new_attr;
            dirty_mtx[i] = 1; // Сигнал для flush_dirty_raster
        }
    }

    // 2. ДИФФЕРЕНЦИАЛЬНЫЙ ЗАЛП В stdout
    flush_dirty_raster(maxCols, maxRows);
    
    return true;
}

/**
 * Ручной низкоуровневый блиттинг из сырого буфера (оставляем для обратной совместимости приборов)
 */
export function blitVirtualCanvasToBuffer(ctx_w, ctx_h, source_pixels, source_colors) {
    const total = (ctx_w * ctx_h) | 0;
    const char_buf = get_back_char_buffer();
    const attr_buf = get_back_attr_buffer();
    const dirty_mtx = get_dirty_matrix();
    
    if (char_buf === null) return;
    
    for (let i = 0; i < total; i++) {
        const new_char = source_pixels[i] | 0;
        const new_attr = source_colors[i] | 0;

        if (char_buf[i] !== new_char || attr_buf[i] !== new_attr) {
            char_buf[i] = new_char;
            attr_buf[i] = new_attr;
            dirty_mtx[i] = 1; 
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/blit.js
 * Время модификации: 19.08.2026 15:35:00 MSK
 * Ревизия: #0819-BLIT-GETTERS-EVOLUTION
 */
