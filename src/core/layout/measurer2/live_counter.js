/**
 * @file src/core/layout/measurer/live_counter.js
 * @version 1.1.0-RELEASE-SMO-DOD-MEASURER-LIVE-COUNTER-PERFECT
 * @description Безаллокационный счетчик топологически активных слотов разметки.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

/**
 * Подсчитывает количество живых детей и вычисляет суммарную фиксированную высоту жестких/свернутых слотов
 * @param {Array} children Массив дочерних узлов уровня
 * @param {number} len Общая длина массива детей
 * @returns {number} Упакованный бинарный флаг: (fixedLinesAllocatedNum << 16) | liveCountNum
 */
export function countLiveLayoutChildren(children, len) {
    let liveCountNum = 0;
    let fixedLinesAllocatedNum = 0;

    for (let i = 0; i < len; i++) {
        const child = children[i];
        if (child && child.enabled !== false) {
            // Если узел имеет фиксированную высоту (не в процентах) — суммируем её
            const hStr = String(child.height || "");
            const isPercentH = hStr.length > 0 && hStr.charAt(hStr.length - 1) === "%";
            
            if (child.collapsed === true) {
                fixedLinesAllocatedNum += 3; // Каждое свернутое окно жестко съедает 3 строки
                liveCountNum++;
            } else if (!isPercentH && hStr.length > 0) {
                fixedLinesAllocatedNum += Math.max(1, Math.floor(Number(hStr) || 1));
            } else {
                liveCountNum++; // Чистый флекс-участник
            }
        }
    }

    return (fixedLinesAllocatedNum << 16) | (liveCountNum & 0xFFFF);
}
