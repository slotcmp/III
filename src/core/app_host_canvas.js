/**
 * @file src/core/app_host_canvas.js
 * @version 1.0.0-RELEASE-SMO-HOST-CANVAS-PREALLOCATOR
 * @description Стерильный выделитель памяти под UHD-матрицу знакомест без GC-мусора.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Fast Properties.
 */

/**
 * Выделяет и запечатывает строки двумерного массива виртуального ConPTY-кадра
 * @returns {Array} Плоский массив фиксированных запечатанных строк объектов знакомест
 */
export function preallocateVirtualDisplayMatrix() {
    const matrixRowsCount = 64;
    const matrixColsCount = 512;
    const m = new Array(matrixRowsCount);
    
    for (let y = 0; y < matrixRowsCount; y++) {
        m[y] = new Array(matrixColsCount);
        const row = m[y];
        
        for (let x = 0; x < matrixColsCount; x++) {
            // Структура ячейки UHD-холста открыта для сверхбыстрой перезаписи примитивов (.char, .fg, .bg)
            row[x] = { char: " ", fg: "\x1b[37m", bg: "\x1b[40m" };
        }
        // Запечатываем только форму строки (набор колонок фиксирован в 512 для JIT Fast Properties)
        Object.preventExtensions(row);
    }
    
    return m;
}
