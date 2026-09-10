/**
 * @file src/io/terminal/sprite_blit.js
 * @version 5.0.1-RELEASE-SMO-DOD-FAST-TYPED-ARRAYS-UNCHAINED
 * @description Низкоуровневая преаллокация и атомарное управление UHD-матрицами на базе Int32Array.
 * ИСПРАВЛЕН ПАРСИНГ ЦВЕТOВ: Добавлен однозначный масочный маркер дефолтных и 256-цветных нулевых индексов.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% GC.
 */

/**
 * Инициализирует плоские типизированные слои буфера для вьюхи прибора.
 * Матрица m теперь хранит массивы Int32Array, где каждая ячейка — это 32-битное число.
 * Схема упаковки битов: [ 16 бит: charCode ] [ 8 бит: fgIndex ] [ 8 бит: bgIndex ]
 */
export function initNodeMatrix(nodeState, colsNum, rowsNum) {
    if (!nodeState) return;

    const w = Math.min(512, Math.max(1, Math.floor(colsNum || 120)));
    const h = Math.min(64, Math.max(1, Math.floor(rowsNum || 30)));

    const m = new Array(h);
    for (let y = 0; y < h; y++) {
        m[y] = new Int32Array(w);
    }
    
    Object.preventExtensions(m);

    if (nodeState.localBuffer) {
        nodeState.localBuffer.matrix = m;
    } else {
        nodeState.matrix = m;
    }
}

/**
 * DOD-хелпер инлайновой распаковки 32-битной ячейки буфера кадра (Zero Allocation)
 */
export function unpackCellBits(uint32Value, outCellPayloadObj) {
    if (!outCellPayloadObj) return;
    
    const charCode = (uint32Value >> 16) & 0xFFFF;
    const fgIdx    = (uint32Value >> 8) & 0xFF;
    const bgIdx    = uint32Value & 0xFF;

    outCellPayloadObj.char = charCode === 0 ? " " : String.fromCharCode(charCode);
    
    // Переводим внутренние сжатые индексы обратно в ANSI sequential маски (с учетом маркера 255)
    outCellPayloadObj.fg = fgIdx === 255 ? "\x1b[37m" : "\x1b[38;5;" + fgIdx + "m";
    outCellPayloadObj.bg = bgIdx === 255 ? "\x1b[40m" : "\x1b[48;5;" + bgIdx + "m";
}

/**
 * DOD-хелпер инлайновой быстрой упаковки данных в 32-bit регистр
 */
export function packCellBits(charStr, fgAnsiStr, bgAnsiStr) {
    const charCode = String(charStr || " ").charCodeAt(0) & 0xFFFF;
    
    // Быстрый посимвольный разбор ANSI токенов для извлечения чистых байтовых индексов цвета
    let fgIdx = 255; // По умолчанию маркер дефолтного цвета 37m
    if (fgAnsiStr && fgAnsiStr.length > 7) {
        const idx = fgAnsiStr.indexOf("5;");
        if (idx !== -1) fgIdx = parseInt(fgAnsiStr.substring(idx + 2), 10) & 0xFF;
    } else if (fgAnsiStr && fgAnsiStr === "\x1b[37m") {
        fgIdx = 255;
    }

    let bgIdx = 255; // По умолчанию маркер дефолтного фона 40m
    if (bgAnsiStr && bgAnsiStr.length > 7) {
        const idx = bgAnsiStr.indexOf("5;");
        if (idx !== -1) bgIdx = parseInt(bgAnsiStr.substring(idx + 2), 10) & 0xFF;
    } else if (bgAnsiStr && bgAnsiStr === "\x1b[40m") {
        bgIdx = 255;
    }

    return (charCode << 16) | (fgIdx << 8) | bgIdx;
}
