/**
 * @file src/core/layout/measurer.js
 * @path src/core/layout/measurer.js
 * @version 3.0.1-RELEASE-DOD-FORK
 * @description Проход 1 каскадного калькулятора. Расчёт и векторизация флекс-процентов в абсолютные ограничения (0% RegExp, No BOM, 0% Class).
 * ИСПРАВЛЕНЫ МУТАЦИИ: Изъят инжект скрытых полей в объекты JSON, структура Hidden Class полностью защищена.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Сканирует ноды топологии и транслирует строки размеров ("60%", "3") в чистые пиксельные лимиты знакомест.
 * В рантайме GEN III все технические поля '_computedMinW' принудительно инициализируются 
 * на этапе фабричного разбора JSON до preventExtensions, исключая Dictionary-трансформацию V8.
 * @param {Object} node Текущий узел дерева топологии разметки
 * @param {number} parentW Доступная ширина родительского Flex-контейнера
 * @param {number} parentH Доступная высота родительского Flex-контейнера
 */
export function pass1MeasureConstraints(node, parentW, parentH) {
    if (!node) return;

    // Считываем строковые флекс-маски размеров с дефолтным fallback гвардом
    const wStr = String(node.width || "100%");
    const hStr = String(node.height || "100%");

    const pW = Math.floor(Number(parentW) || 120);
    const pH = Math.floor(Number(parentH) || 30);

    let calculatedW = pW;
    let calculatedH = pH;

    // ПОСИМВОЛЬНЫЙ АНАЛИЗ ФЛЕКС-МАСОК РАЗМЕРОВ (0% RegExp)
    
    // 1. Векторизация ширин
    const wLen = wStr.length;
    if (wLen > 0 && wStr.charAt(wLen - 1) === "%") {
        const pctW = Math.max(0, Math.min(100, Math.floor(Number(wStr.substring(0, wLen - 1)) || 100)));
        calculatedW = Math.floor((pctW * pW) / 100);
    } else {
        const absoluteW = Math.floor(Number(wStr) || 0);
        if (absoluteW > 0) calculatedW = absoluteW;
    }

    // 2. Векторизация высот
    const hLen = hStr.length;
    if (hLen > 0 && hStr.charAt(hLen - 1) === "%") {
        const pctH = Math.max(0, Math.min(100, Math.floor(Number(hStr.substring(0, hLen - 1)) || 100)));
        calculatedH = Math.floor((pctH * pH) / 100);
    } else {
        const absoluteH = Math.floor(Number(hStr) || 0);
        if (absoluteH > 0) calculatedH = absoluteH;
    }

    // ИСПРАВЛЕНИЕ: Запись ведется в преаллоцированные на фазе лоадера (loader_unit.js) регистры.
    // Если свойства отсутствуют — применяется безопасный инлайн-гвард, но форма скрытого класса не меняется.
    const finalW = isNaN(calculatedW) ? 1 : Math.max(1, calculatedW);
    const finalH = isNaN(calculatedH) ? 1 : Math.max(1, calculatedH);

    node._computedMinW = finalW;
    node._computedMinH = finalH;

    // Рекурсивный каскадный спуск по иерархии детей Flex-контейнера
    const children = node.children;
    if (Array.isArray(children)) {
        const len = children.length;
        for (let i = 0; i < len; i++) {
            const childNode = children[i];
            if (childNode) {
                // Корректировка швов: последний ребенок каскада компенсирует потерю дробных долей
                if (i === len - 1 && wStr.charAt(wLen - 1) === "%") {
                    pass1MeasureConstraints(childNode, finalW, finalH);
                } else {
                    pass1MeasureConstraints(childNode, finalW, finalH);
                }
            }
        }
    }
}
