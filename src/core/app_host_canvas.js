/**
 * @file src/core/app_host_canvas.js
 * @version 2.0.0-RELEASE-SMO-HOST-CANVAS-INT32ARRAY
 * @description Чистая DOD-преаллокация UHD-матрицы кадра на базе примитивов Int32Array.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Fast Properties / Zero Allocation.
 */

import { packCellBits } from "../io/terminal/sprite_blit.js";

/**
 * Выделяет и запечатывает строки двумерного массива виртуального ConPTY-кадра в числах
 * @returns {Int32Array[]} Массив фиксированных запечатанных строк объектов знакомест
 */
export function preallocateVirtualDisplayMatrix() {
    const matrixRowsCount = 64;
    const matrixColsCount = 512;
    const m = new Array(matrixRowsCount);
    
    // Прекомпилируем битовую маску дефолтного пробела на черном фоне
    const defaultSpacePackedBits = packCellBits(" ", "\x1b[37m", "\x1b[40m");

    for (let y = 0; y < matrixRowsCount; y++) {
        m[y] = new Int32Array(matrixColsCount);
        const row = m[y];
        
        // Быстрый налив чисел в ОЗУ
        for (let x = 0; x < matrixColsCount; x++) {
            row[x] = defaultSpacePackedBits;
        }
        
        Object.preventExtensions(row);
    }
    
    Object.preventExtensions(m);
    return m;
}
