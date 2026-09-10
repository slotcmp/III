/**
 * @file src/core/layout/calculator.js
 * @version 3.8.0-RELEASE-SMO-DOD-PAS3-PURE
 * @description Проход 3 трехпроходного калькулятора. Стерильная трансляция лимитов в координаты.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { allocateChildSteps } from "./calculator/step_allocator.js";

export function pass3CalculatePositions(node, currentX, currentY, currentW, currentH, globalGeoRegistry, trackerMock) {
    if (!node || !globalGeoRegistry || node.enabled === false) return;

    const nodeIdStr = String(node.id || "");
    
    const absX = Math.floor(currentX || 0);
    const absY = Math.floor(currentY || 0);
    const absW = Math.floor(currentW);
    const absH = Math.floor(currentH);

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
    allocateChildSteps(node, children, len, isRowFlow, absX, absY, absW, absH, globalGeoRegistry, pass3CalculatePositions);
}
