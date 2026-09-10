/**
 * @file src/core/slot_maker/shape_sealer.js
 * @version 1.1.0-RELEASE-SMO-IOC-SHAPE-SEALER-INT32ARRAY-COMPLIANT
 * @description Безопасный DOD-упаковщик Fast Properties форм V8 без блокировки ячеек знакомест.
 * ИСПРАВЛЕН КРАШ ПРИМИТИВОВ: Полностью удален вызов preventExtensions над элементами-числами Int32Array.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Предотвращает динамическое расширение структуры массивов матрицы
 * @param {Int32Array[]} matrix Двумерный числовой массив вьюхи прибора
 */
export function sealDisplayMatrixShape(matrix) {
    if (!matrix) return;
    const h = matrix.length;
    
    for (let y = 0; y < h; y++) {
        const row = matrix[y];
        // Запечатываем только сам объект строки Int32Array для мономорфизма fast-properties
        if (row && Object.isExtensible(row)) {
            Object.preventExtensions(row);
        }
    }
    
    if (Object.isExtensible(matrix)) {
        Object.preventExtensions(matrix);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker/shape_sealer.js
 * Время исправления: 03.09.2026 13:12:00 MSK
 */
