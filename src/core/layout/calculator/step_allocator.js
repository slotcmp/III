/**
 * @file src/core/layout/calculator/step_allocator.js
 * @version 1.3.0-RELEASE-SMO-DOD-STEP-ALLOCATOR-PAS3
 * @description Вспомогательный распределитель каретки шагов для Pass 3.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

export function allocateChildSteps(node, children, len, isRowFlow, absX, absY, absW, absH, globalGeoRegistry, recursiveCallback) {
    let runningX = absX;
    let runningY = absY;

    for (let i = 0; i < len; i++) {
        const child = children[i];
        if (!child) continue;

        if (child.enabled === false) {
            const childIdStr = String(child.id || "");
            if (childIdStr.length > 0 && childIdStr !== "root") {
                globalGeoRegistry[childIdStr] = { x: runningX, y: runningY, w: 0, h: 0 };
            }
            continue;
        }

        // Строго берем скорректированные Проходом 2 лимиты!
        let allocatedChildW = typeof child._computedMinW !== "undefined" ? Math.floor(child._computedMinW) : absW;
        let allocatedChildH = typeof child._computedMinH !== "undefined" ? Math.floor(child._computedMinH) : absH;

        if (isRowFlow) {
            if (i === len - 1) allocatedChildW = Math.max(allocatedChildW, (absX + absW) - runningX);
            allocatedChildH = absH;
        } else {
            allocatedChildW = absW;
            if (i === len - 1) allocatedChildH = Math.max(allocatedChildH, (absY + absH) - runningY);
        }

        recursiveCallback(child, runningX, runningY, allocatedChildW, allocatedChildH, globalGeoRegistry, null);

        if (isRowFlow) runningX += allocatedChildW;
        else runningY += allocatedChildH;
    }
}
