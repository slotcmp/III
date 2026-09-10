/**
 * @file src/core/layout/flex_expander.js
 * @version 1.0.0-RELEASE-SMO-DOD-PASS2-EXPANDER
 * @description Проход 2 трехпроходного калькулятора. Вычитание фиксированных и нарезка процентных долей.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

export function pass2AdjustFlexLimits(node, currentW, currentH) {
    if (!node || node.enabled === false) return;

    const children = node.children;
    if (!Array.isArray(children) || children.length === 0) return;

    const len = children.length;
    const isRowFlow = (node.flexDirection === "row");

    let totalFixedSize = 0;
    let totalPercentValue = 0;
    let flexElementsCount = 0;

    // ШАГ 1: Посимвольный сбор весов и вычитание фиксированных слотов (0% RegExp)
    for (let i = 0; i < len; i++) {
        const child = children[i];
        if (!child || child.enabled === false) continue;

        const wStr = String(child.width || "");
        const hStr = String(child.height || "");

        if (isRowFlow) {
            const isPct = wStr.length > 0 && wStr.charAt(wStr.length - 1) === "%";
            if (child.collapsed === true) totalFixedSize += 3;
            else if (!isPct && wStr.length > 0) totalFixedSize += Math.floor(child._computedMinW);
            else if (isPct) totalPercentValue += Math.max(0, Math.floor(Number(wStr.substring(0, wStr.length - 1)) || 0));
            else flexElementsCount++;
        } else {
            const isPct = hStr.length > 0 && hStr.charAt(hStr.length - 1) === "%";
            if (child.collapsed === true) totalFixedSize += 3;
            else if (!isPct && hStr.length > 0) totalFixedSize += Math.floor(child._computedMinH); // Слоты 100 и 105 отдают по 4 строки
            else if (isPct) totalPercentValue += Math.max(0, Math.floor(Number(hStr.substring(0, hStr.length - 1)) || 0));
            else flexElementsCount++;
        }
    }

    // Вычисляем чистый пиксельный остаток пула для процентных слотов
    const dynamicPoolW = Math.max(0, currentW - (isRowFlow ? totalFixedSize : 0));
    const dynamicPoolH = Math.max(0, currentH - (isRowFlow ? 0 : totalFixedSize));

    // ШАГ 2: Пропорциональный накат и корректировка _computedMinH/_computedMinW
    for (let i = 0; i < len; i++) {
        const child = children[i];
        if (!child || child.enabled === false) continue;

        const wStr = String(child.width || "");
        const hStr = String(child.height || "");

        if (isRowFlow) {
            const isPct = wStr.length > 0 && wStr.charAt(wStr.length - 1) === "%";
            if (isPct) {
                const pct = Math.max(0, Math.floor(Number(wStr.substring(0, wStr.length - 1)) || 0));
                child._computedMinW = Math.floor((pct * dynamicPoolW) / (totalPercentValue || 100));
            } else if (!wStr.length) {
                child._computedMinW = Math.floor(dynamicPoolW / (flexElementsCount || 1));
            }
            child._computedMinH = currentH; // Поперечная ось наследуется полностью
        } else {
            const isPct = hStr.length > 0 && hStr.charAt(hStr.length - 1) === "%";
            if (isPct) {
                const pct = Math.max(0, Math.floor(Number(hStr.substring(0, hStr.length - 1)) || 0));
                // Логгер 108 забирает процент строго от чистого динамического остатка!
                child._computedMinH = Math.floor((pct * dynamicPoolH) / (totalPercentValue || 100));
            } else if (!hStr.length || child.id === "main_workspace") {
                // Центральный воркспейс жадно забирает весь оставшийся флекс-пул высоты
                child._computedMinH = dynamicPoolH - Math.floor((totalPercentValue * dynamicPoolH) / 100);
            }
            child._computedMinW = currentW;
        }

        // Рекурсивно спускаемся вглубь каскада флекс-детей
        pass2AdjustFlexLimits(child, child._computedMinW, child._computedMinH);
    }
}
