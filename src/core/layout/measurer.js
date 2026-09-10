/**
 * @file src/core/layout/measurer.js
 * @path src/core/layout/measurer.js
 * @version 3.6.0-RELEASE-SMO-DOD-PAS1-PURE
 * @description Проход 1 трехпроходного калькулятора. Сбор сырых лимитов из JSON.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / No BOM.
 */

export function pass1MeasureConstraints(node, parentW, parentH) {
    if (!node) return;

    if (node.enabled === false) {
        node._computedMinW = 0;
        node._computedMinH = 0;
        if (Array.isArray(node.children)) {
            const len = node.children.length;
            for (let i = 0; i < len; i++) {
                if (node.children[i]) pass1MeasureConstraints(node.children[i], 0, 0);
            }
        }
        return;
    }

    const wStr = String(node.width || "100%");
    const hStr = String(node.height || "100%");

    const pW = Math.floor(Number(parentW) || 120);
    const pH = Math.floor(Number(parentH) || 30);

    let calculatedW = pW;
    let calculatedH = pH;

    const wLen = wStr.length;
    if (wLen > 0 && wStr.charAt(wLen - 1) === "%") {
        const pctW = Math.max(0, Math.min(100, Math.floor(Number(wStr.substring(0, wLen - 1)) || 100)));
        calculatedW = Math.floor((pctW * pW) / 100);
    } else {
        const absoluteW = Math.floor(Number(wStr) || 0);
        if (absoluteW > 0) calculatedW = absoluteW;
    }

    const hLen = hStr.length;
    if (hLen > 0 && hStr.charAt(hLen - 1) === "%") {
        const pctH = Math.max(0, Math.min(100, Math.floor(Number(hStr.substring(0, hLen - 1)) || 100)));
        calculatedH = Math.floor((pctH * pH) / 100);
    } else {
        const absoluteH = Math.floor(Number(hStr) || 0);
        if (absoluteH > 0) calculatedH = absoluteH;
    }

    if (node.collapsed === true) {
        calculatedH = 3;
    }

    node._computedMinW = isNaN(calculatedW) ? 1 : Math.max(1, calculatedW);
    node._computedMinH = isNaN(calculatedH) ? 1 : Math.max(1, calculatedH);

    const children = node.children;
    if (Array.isArray(children)) {
        const len = children.length;
        if (len === 0) return;

        const isRowFlow = (node.flexDirection === "row");
        for (let i = 0; i < len; i++) {
            const childNode = children[i];
            if (!childNode) continue;

            if (isRowFlow) {
                pass1MeasureConstraints(childNode, Math.floor(node._computedMinW / len), node._computedMinH);
            } else {
                pass1MeasureConstraints(childNode, node._computedMinW, Math.floor(node._computedMinH / len));
            }
        }
    }
}
