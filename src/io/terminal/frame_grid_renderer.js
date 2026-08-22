/**
 * @file src/io/terminal/frame_grid_renderer.js
 * @version 3.3.3-RELEASE-SMO-FRAME-GRID-LAZY-COMPLIANT
 * @description Модуль координатной отрисовки фоновых СМО-маркеров знакомест прибора.
 * ИСПРАВЛЕНА ОЧИСТКА: Границы очистки локализованы внутри рамок, предотвращая деструктивный затир контента.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Заполняет внутреннюю область прибора фоновой координатной сеткой знакомест
 * @param {Array[]} matrix Плоская мономорфная UHD-матрица знакомест прибора
 * @param {number} currentW Текущая флекс-ширина прибора в знакоместах
 * @param {number} currentH Текущая флекс-высота прибора в строках
 * @param {boolean} isFocusedBool Флаг активности/фокуса панели в интерфейсе
 */
export function drawFrameGrid(matrix, currentW, currentH, isFocusedBool) {
    if (!matrix) return;
    
    const maxCols = Math.max(1, Math.floor(currentW || 40));
    const maxRows = Math.max(1, Math.floor(currentH || 5));
    
    // Динамический подбор приглушенного цвета подложки (Xterm-256)
    const gridColorAnsi = isFocusedBool ? "\x1b[38;5;236m" : "\x1b[38;5;234m";
    const bgColorAnsi = "\x1b[40m";

    // ИСПРАВЛЕНИЕ: Обход и подготовка холста ведутся строго ВНУТРИ рамок (от 1 до max - 1)
    // Это исключает повреждение геометрии оконных границ и затирку заголовков слотов
    for (let y = 1; y < maxRows - 1; y++) {
        const row = matrix[y];
        if (!row) continue;
        
        for (let x = 1; x < maxCols - 1; x++) {
            const cell = row[x];
            if (!cell) continue;
            
            // Расчет локального шага подложки относительно внутреннего пространства
            const localX = x - 1;
            const localY = y - 1;

            if (localY % 2 === 0 && localX % 4 === 0) {
                cell.char = "·";
                cell.fg = gridColorAnsi;
                cell.bg = bgColorAnsi;
            } else {
                // Чистим только некратные ячейки контента от альфа-нулей
                cell.char = " ";
                cell.fg = "\x1b[37m";
                cell.bg = bgColorAnsi;
            }
        }
    }
}
