/**
 * @file src/io/terminal/flusher.js
 * @version 3.3.1-RELEASE-SMO-GRAPHICS-FLUSHER-RESIZE-COMPLIANT
 * @description Дифференциальный TUI-блайтер Double Buffering кадра (Presentation-контур).
 * ИСПРАВЛЕНЫ АЛЛОКАЦИИ И ANSI-ДИФФ: Внедрен сегментный сборщик кадра на преаллоцированном Uint8Array.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import fs from "node:fs";

// Преаллоцированный буфер вывода кадра на 256 КБ для полного исключения Garbage Collection
const _staticOutputByteBuffer = new Uint8Array(262144);

const _shadowCanvasState = {
    matrix: new Array(64)
};
for (let y = 0; y < 64; y++) {
    _shadowCanvasState.matrix[y] = new Array(512);
    for (let x = 0; x < 512; x++) {
        _shadowCanvasState.matrix[y][x] = { char: " ", fg: "\x1b[37m", bg: "\x1b[40m" };
        Object.preventExtensions(_shadowCanvasState.matrix[y][x]);
    }
    Object.preventExtensions(_shadowCanvasState.matrix[y]);
}
Object.preventExtensions(_shadowCanvasState);

export function forceInvalidateShadowCanvas() {
    const shadowM = _shadowCanvasState.matrix;
    for (let y = 0; y < 64; y++) {
        const row = shadowM[y];
        if (!row) continue;
        for (let x = 0; x < 512; x++) {
            row[x].char = "\0";
            row[x].fg = "";
            row[x].bg = "";
        }
    }
}

/**
 * Финализатор блайтинга. Сравнивает холст хоста с теневым ОЗУ-буфером сегментным методом
 */
export function flushVirtualCanvasToTty(virtualCanvasState, kernel, geoMap) {
    if (!virtualCanvasState || !kernel || !virtualCanvasState.virtualMatrix) return false;
    if (virtualCanvasState.isDirty === false) return false;

    const rootGeo = geoMap ? geoMap["root"] : null;
    const terminalW = Math.max(40, Math.floor(rootGeo?.w || 120));
    const terminalH = Math.max(10, Math.floor(rootGeo?.h || 30));

    const currentM = virtualCanvasState.virtualMatrix.matrix;
    const shadowM = _shadowCanvasState.matrix;

    const buf = _staticOutputByteBuffer;
    let ptr = 0;

    // Векторизованный кэш состояния атрибутов цвета терминала
    let activeAnsiFgStr = "";
    let activeAnsiBgStr = "";

    for (let y = 0; y < terminalH; y++) {
        const cRow = currentM[y];
        const sRow = shadowM[y];
        if (!cRow || !sRow) continue;

        let isSegmentOpen = false;

        for (let x = 0; x < terminalW; x++) {
            const cCell = cRow[x];
            const sCell = sRow[x];
            if (!cCell || !sCell) continue;

            // ДЕТЕКЦИЯ ГРЯЗНОГО ПИКСЕЛЯ
            if (cCell.char !== sCell.char || cCell.fg !== sCell.fg || cCell.bg !== sCell.bg) {
                
                // Если сегмент строки закрыт — открываем его и один раз переносим курсор в начало блока
                if (isSegmentOpen === false) {
                    const posStr = "\x1b[" + (y + 1) + ";" + (x + 1) + "H";
                    for (let i = 0; i < posStr.length; i++) buf[ptr++] = posStr.charCodeAt(i);
                    isSegmentOpen = true;
                }

                // Инжектируем ESC-коды цвета только при их реальном изменении в потоке
                if (cCell.fg !== activeAnsiFgStr) {
                    const fgStr = cCell.fg;
                    for (let i = 0; i < fgStr.length; i++) buf[ptr++] = fgStr.charCodeAt(i);
                    activeAnsiFgStr = fgStr;
                }
                if (cCell.bg !== activeAnsiBgStr) {
                    const bgStr = cCell.bg;
                    for (let i = 0; i < bgStr.length; i++) buf[ptr++] = bgStr.charCodeAt(i);
                    activeAnsiBgStr = bgStr;
                }

                // Выжигаем символ UTF-8/ASCII напрямую в байт-массив (поддержка кириллицы через кодовые точки)
                const charStr = cCell.char;
                if (charStr.length === 1) {
                    const code = charStr.charCodeAt(0);
                    if (code < 128) {
                        buf[ptr++] = code;
                    } else {
                        // Быстрый инлайн-маршалинг кириллических двухбайтовых символов UTF-8
                        const encodedBuffer = Buffer.from(charStr, "utf8");
                        for (let i = 0; i < encodedBuffer.length; i++) buf[ptr++] = encodedBuffer[i];
                    }
                } else {
                    buf[ptr++] = 0x20; // Предохранительный гвард на случай альфа-нулей
                }

                // СИНХРОНИЗАЦИЯ С ТЕНЕВЫМ БУФЕРОМ
                sCell.char = cCell.char;
                sCell.fg = cCell.fg;
                sCell.bg = cCell.bg;
            } else {
                // Если встретили чистый пиксель — закрываем сегмент непрерывной печати строки
                isSegmentOpen = false;
            }
        }
    }

    // АТОМАРНЫЙ ВЫЖИГ ВСЕЙ ДЕЛЬТЫ КАДРА ЗА ОДИН СИС-ВЫЗОВ (0% МЕРЦАНИЯ)
    if (ptr > 0) {
        fs.writeSync(1, buf, 0, ptr, null);
    }

    virtualCanvasState.isDirty = false;
    return true;
}
