/**
 * @file src/io/terminal/flusher.js
 * @version 3.2.0-RELEASE-SMO-FLUSHER-DOUBLE-BUFFERED
 * @description Высокоскоростной дифференциальный TTY-финализатор вывода (Presentation-контур).
 * Реализован чистый двойной буфер и концепция грязного пикселя без вызовов очистки экрана \x1b[2J.
 * Полностью ликвидировано мерцание при интерактивном ресайзе в ConPTY Windows.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import fs from "node:fs";

const _shadowCanvasMatrix = {
    matrix: null,
    w: 0,
    h: 0
};
Object.preventExtensions(_shadowCanvasMatrix);

/**
 * Принудительно инвалидирует теневое зеркало экрана для обхода diff-оптимизаций
 */
export function forceInvalidateShadowCanvas() {
    const m = _shadowCanvasMatrix.matrix;
    if (!m) return;

    const rows = _shadowCanvasMatrix.h;
    const cols = _shadowCanvasMatrix.w;

    for (let y = 0; y < rows; y++) {
        const row = m[y];
        if (!row) continue;
        for (let x = 0; x < cols; x++) {
            // Сбрасываем ячейки в альфа-ноль, заставляя считать их тотально грязными
            row[x].char = "\0";
            row[x].fg = "";
            row[x].bg = "";
        }
    }
}

/**
 * Сканирует точечные изменения растра и сбрасывает детерминированный ANSI-diff в TTY дескриптор
 * @param {Object} canvasState Ссылка на состояние виртуального холста хоста
 * @param {Array[]} currentCanvasMatrix Актуальная мономорфная UHD-матрица кадра
 * @param {number} rowsLimit Лимит строк терминала
 * @param {number} colsLimit Лимит столбцов знакомест
 */
export function flushVirtualCanvasToTty(canvasState, currentCanvasMatrix, rowsLimit, colsLimit) {
    if (!currentCanvasMatrix) return;

    const maxRows = Math.floor(rowsLimit || 30);
    const maxCols = Math.floor(colsLimit || 120);

    let isSizeMutated = false;

    // ДВОЙНАЯ БУФЕРИЗАЦИЯ: Переаллокация теневого буфера БЕЗ деструктивной очистки экрана \x1b[2J
    if (!_shadowCanvasMatrix.matrix || _shadowCanvasMatrix.w !== maxCols || _shadowCanvasMatrix.h !== maxRows) {
        
        // Синхронизируем размер буфера ConPTY Windows, но экран НЕ чистим!
        process.stdout.write("\x1b[8;" + maxRows + ";" + maxCols + "t");

        _shadowCanvasMatrix.matrix = new Array(maxRows);
        for (let y = 0; y < maxRows; y++) {
            _shadowCanvasMatrix.matrix[y] = new Array(maxCols);
            for (let x = 0; x < maxCols; x++) {
                // Инициализируем пустыми масками
                _shadowCanvasMatrix.matrix[y][x] = { char: "\0", fg: "", bg: "" };
                Object.preventExtensions(_shadowCanvasMatrix.matrix[y][x]);
            }
            Object.preventExtensions(_shadowCanvasMatrix.matrix[y]);
        }
        _shadowCanvasMatrix.w = maxCols;
        _shadowCanvasMatrix.h = maxRows;
        isSizeMutated = true;
    }

    const shadowM = _shadowCanvasMatrix.matrix;
    let outputBufferStr = "";
    
    let lastFg = "";
    let lastBg = "";

    // Сбрасываем каретку выжигания ОС на координаты 1;1
    outputBufferStr += "\x1b[H";

    for (let y = 0; y < maxRows; y++) {
        const currRow = currentCanvasMatrix[y];
        const shadRow = shadowM[y];
        if (!currRow || !shadRow) continue;

        let isCursorPositionSet = false;

        for (let x = 0; x < maxCols; x++) {
            const cCell = currRow[x];
            const sCell = shadRow[x];
            if (!cCell || !sCell) continue;

            // КОНЦЕПЦИЯ ГРЯЗНОГО ПИКСЕЛЯ (Dirty Cell): 
            // Если размеры изменились (isSizeMutated) — пиксель безусловно признается грязным.
            // Иначе — сверяем дельту с теневым буфером прошлого шага СМО.
            if (isSizeMutated || cCell.char !== sCell.char || cCell.fg !== sCell.fg || cCell.bg !== sCell.bg) {
                
                if (!isCursorPositionSet) {
                    outputBufferStr += "\x1b[" + (y + 1) + ";" + (x + 1) + "H";
                    isCursorPositionSet = true;
                }

                if (cCell.fg !== lastFg) {
                    outputBufferStr += cCell.fg;
                    lastFg = cCell.fg;
                }
                if (cCell.bg !== lastBg) {
                    outputBufferStr += cCell.bg;
                    lastBg = cCell.bg;
                }

                outputBufferStr += cCell.char;

                // Переносим актуальное состояние в теневое ОЗУ-зеркало
                sCell.char = cCell.char;
                sCell.fg = cCell.fg;
                sCell.bg = cCell.bg;
            } else {
                isCursorPositionSet = false;
            }
        }
    }

    // Тотальный атомарный выстрел накопленного буфера в физический stdout
    if (outputBufferStr.length > 0) {
        const ioBuffer = Buffer.from(outputBufferStr, "utf8");
        fs.writeSync(1, ioBuffer, 0, ioBuffer.length, null);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/flusher.js
 * Время модификации: 19.08.2026 00:01:05 MSK
 */
