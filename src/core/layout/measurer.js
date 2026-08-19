/**
 * @file: src/core/layout/measurer.js
 * @path: C:\slotcmd_3\src\core\layout\measurer.js
 * @version: 3.0.0-RELEASE-DOD-FORK
 * @description: Проход 1 каскадного калькулятора. Расчёт и векторизация флекс-процентов в абсолютные ограничения (0% RegExp, No BOM, 0% Class).
 * @revision: #0817-LAYOUT-MEASURER-DOD
 */

/**
 * ЧИСТАЯ ПРОЦЕДУРА: Сканирует ноды топологии и транслирует строки размеров ("60%", "3") в чистые пиксельные лимиты знакомест
 */
export function pass1MeasureConstraints(node, parentW, parentH) {
    if (!node) return;

    const wStr = String(node.width || "100%");
    const hStr = String(node.height || "100%");

    let calculatedW = Math.floor(Number(parentW) || 120);
    let calculatedH = Math.floor(Number(parentH) || 30);

    // ПОСИМВОЛЬНЫЙ АНАЛИЗ ФЛЕКС-МАСОК РАЗМЕРОВ (0% RegExp)
    // 1. Обработка ширин
    if (wStr.charAt(wStr.length - 1) === "%") {
        const pctW = Math.max(0, Math.min(100, Math.floor(Number(wStr.substring(0, wStr.length - 1)) || 100)));
        calculatedW = Math.floor((pctW * parentW) / 100);
    } else {
        const absoluteW = Math.floor(Number(wStr) || 0);
        if (absoluteW > 0) calculatedW = absoluteW;
    }

    // 2. Обработка высот
    if (hStr.charAt(hStr.length - 1) === "%") {
        const pctH = Math.max(0, Math.min(100, Math.floor(Number(hStr.substring(0, hStr.length - 1)) || 100)));
        calculatedH = Math.floor((pctH * parentH) / 100);
    } else {
        const absoluteH = Math.floor(Number(hStr) || 0);
        if (absoluteH > 0) calculatedH = absoluteH;
    }

    // Защита Hidden Class от NaN и превентивный прогрев полей
    node._computedMinW = isNaN(calculatedW) ? 1 : Math.max(1, calculatedW);
    node._computedMinH = isNaN(calculatedH) ? 1 : Math.max(1, calculatedH);

    // Рекурсивный каскадный спуск по иерархии детей Flex-контейнера
    const children = node.children || [];
    const len = children.length;
    for (let i = 0; i < len; i++) {
        pass1MeasureConstraints(children[i], node._computedMinW, node._computedMinH);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/layout/measurer.js
 * Время модификации: 17.08.2026 20:26:10 MSK
 */
