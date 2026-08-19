/**
 * @file src/io/terminal/frame_grid_renderer.js
 * @version 3.0.2-RELEASE-SMO-FRAME-GRID-DOD
 * @description Модуль координатной отрисовки фоновых СМО-маркеров знакомест прибора.
 * Осуществляет посимвольное заполнение внутренней сетки в границах выделенного слота.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Заполняет внутреннюю область прибора фоновой координатной сеткой знакомест
 * @param {Array[]} matrix Плоская мономорфная матрица знакомест прибора
 * @param {number} currentW Текущая ширина прибора в знакоместах
 * @param {number} currentH Текущая высота прибора в строках
 * @param {boolean} isFocusedBool Флаг активности/фокуса панели в интерфейсе
 */
export function drawFrameGrid(matrix, currentW, currentH, isFocusedBool) {
    if (!matrix) return;
    
    const maxCols = Math.max(1, Math.floor(currentW || 40));
    const maxRows = Math.max(1, Math.floor(currentH || 5));
    
    const gridColorAnsi = isFocusedBool ? "\x1b[38;5;235m" : "\x1b[38;5;234m";
    const bgColorAnsi = "\x1b[40m";

    // СМО-КОНВЕЙЕР: Гарантируем, что сетка заполняет ТОЛЬКО легитимные физические границы прибора
    for (let y = 0; y < maxRows; y++) {
        const row = matrix[y];
        if (!row) continue;

        for (let x = 0; x < maxCols; x++) {
            const cell = row[x];
            if (!cell) continue;

            // Если ячейка находится на границе - это зона рамок, сетку туда не льем
            if (y === 0 || y === maxRows - 1 || x === 0 || x === maxCols - 1) {
                continue;
            }

            // Каждые 4 строки и 8 столбцов выжигаем СМО-маркер знакоместа
            if (y % 4 === 0 && x % 8 === 0) {
                cell.char = "·";
                cell.fg = gridColorAnsi;
                cell.bg = bgColorAnsi;
            } else {
                cell.char = " ";
                cell.fg = "\x1b[37m";
                cell.bg = bgColorAnsi;
            }
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/frame_grid_renderer.js
 * Время модификации: 18.08.2026 16:47:05 MSK
 */
