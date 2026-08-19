/**
 * @file src/core/layout/calculator.js
 * @version 3.0.0-RELEASE-DOD-FORK
 * @description Третий проход каскадного калькулятора разметки (PAC / Abstraction-контур).
 * Вычисляет абсолютные экранные координаты слотов и наливает их в реестр ОЗУ без преждевременных блокировок.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Вычисляет абсолютные x, y, w, h слотов и динамически наливает их в ОЗУ-реестр геометрии
 * @param {Object} node Текущий узел дерева топологии разметки
 * @param {number} currentX Текущая координата смещения X
 * @param {number} currentY Текущая координата смещения Y
 * @param {number} currentW Рассчитанная ширина узла
 * @param {number} currentH Рассчитанная высота узла
 * @param {Object} globalGeoRegistry Глобальный плоский ОЗУ-реестр геометрии панелей
 * @param {Object|null} trackerMock Служебный трекер/заглушка
 */
export function pass3CalculatePositions(node, currentX, currentY, currentW, currentH, globalGeoRegistry, trackerMock) {
    if (!node || !globalGeoRegistry) return;

    const nodeIdStr = String(node.id || "");
    
    const absX = Math.floor(currentX || 0);
    const absY = Math.floor(currentY || 0);
    const absW = Math.max(1, Math.floor(node._computedMinW || currentW || 1));
    const absH = Math.max(1, Math.floor(node._computedMinH || currentH || 1));

    // Наливаем вычисленный растр в глобальный плоский реестр ОЗУ для конкретного СМО-прибора
    if (nodeIdStr.length > 0 && nodeIdStr !== "root") {
        // Убрана преждевременная блокировка preventExtensions для обеспечения работы layout_balancer.js
        globalGeoRegistry[nodeIdStr] = {
            x: isNaN(absX) ? 0 : absX,
            y: isNaN(absY) ? 0 : absY,
            w: isNaN(absW) ? 1 : absW,
            h: isNaN(absH) ? 1 : absH
        };
    }

    const children = node.children || [];
    const len = children.length;
    if (len === 0) return;

    const isRowFlow = (node.flexDirection === "row");
    let runningX = absX;
    let runningY = absY;

    // Рассчитываем каскадное смещение для вложенных Flex-детей внутри контейнера
    for (let i = 0; i < len; i++) {
        const child = children[i];
        if (!child) continue;

        const childW = Math.max(1, Math.floor(child._computedMinW || 1));
        const childH = Math.max(1, Math.floor(child._computedMinH || 1));

        pass3CalculatePositions(child, runningX, runningY, childW, childH, globalGeoRegistry, trackerMock);

        // Сдвигаем базовые каретки позиционирования по вектору флекс-направления
        if (isRowFlow) {
            runningX += childW;
        } else {
            runningY += childH;
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/layout/calculator.js
 * Время модификации: 18.08.2026 18:27:00 MSK
 */
