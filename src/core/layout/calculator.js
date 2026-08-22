/**
 * @file src/core/layout/calculator.js
 * @version 3.0.1-RELEASE-DOD-FORK
 * @description Третий проход каскадного калькулятора разметки (PAC / Abstraction-контур).
 * ИСПРАВЛЕНЫ СДВИГИ: Внедрен алгоритм распределения реального доступного пространства родителя.
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
    
    // ИСПРАВЛЕНИЕ: Базовые габариты узла определяются доступным родительским пространством
    // с жестким нижним гвардом безопасности из предварительного просчета pass1
    const absW = Math.max(Math.floor(currentW || 1), Math.floor(node._computedMinW || 1));
    const absH = Math.max(Math.floor(currentH || 1), Math.floor(node._computedMinH || 1));

    // Наливаем вычисленный растр в глобальный плоский реестр ОЗУ для конкретного СМО-прибора
    if (nodeIdStr.length > 0 && nodeIdStr !== "root") {
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

        // ИСПРАВЛЕНИЕ: Дочерний узел получает пропорциональную долю от РЕАЛЬНОЙ ширины родителя (absW/absH)
        // Если узел имеет жесткий процент/коэффициент разметки, он интерполируется in-place
        let allocatedChildW = Math.floor(child._computedMinW || 1);
        let allocatedChildH = Math.floor(child._computedMinH || 1);

        // Если это единственный или последний флекс-ребенок — он забирает весь остаток пространства родителя
        if (isRowFlow) {
            if (i === len - 1) {
                allocatedChildW = Math.max(allocatedChildW, absX + absW - runningX);
            } else {
                allocatedChildW = Math.max(allocatedChildW, Math.floor((child.flexGrow || 1) * (absW / len)));
            }
            allocatedChildH = absH; // Растягиваем по высоте строки по канону Flexbox Cross-Axis
        } else {
            allocatedChildW = absW; // Растягиваем по ширине колонки
            if (i === len - 1) {
                allocatedChildH = Math.max(allocatedChildH, absY + absH - runningY);
            } else {
                allocatedChildH = Math.max(allocatedChildH, Math.floor((child.flexGrow || 1) * (absH / len)));
            }
        }

        // Рекурсивный проброс вычисленных физических габаритов вглубь каскада
        pass3CalculatePositions(child, runningX, runningY, allocatedChildW, allocatedChildH, globalGeoRegistry, trackerMock);

        // Сдвигаем базовые каретки позиционирования строго на ФАКТИЧЕСКИ выделенный шаг
        if (isRowFlow) {
            runningX += allocatedChildW;
        } else {
            runningY += allocatedChildH;
        }
    }
}
