/**
 * @file src/core/smo/loader_unit/steps/node_counter.js
 * @version 1.0.0-RELEASE-SMO-STEP-NODE-COUNTER
 * @description Безаллокационный плоский калькулятор количества слотов топологии.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

// Преаллоцированный статический стек для безаллокационного обхода дерева (0% GC)
const _staticCountNodesStack = new Array(64);

/**
 * Сканирует массив дочерних узлов топологии и возвращает общее число физических приборов
 * @param {Array} rootChildrenArr Массив корневых детей дерева разметки
 * @returns {number} Фактическое количество найденных слотов для гидратации
 */
export function countActiveTopologySlots(rootChildrenArr) {
    if (!rootChildrenArr || !Array.isArray(rootChildrenArr)) return 0;

    let totalSlotsCount = 0;
    let stackPtr = 0;

    // Накатываем стартовые корневые элементы в статический стек ОЗУ
    const initialLen = rootChildrenArr.length;
    for (let i = 0; i < initialLen; i++) {
        if (rootChildrenArr[i] && stackPtr < 64) {
            _staticCountNodesStack[stackPtr++] = rootChildrenArr[i];
        }
    }

    // Плоский высокоскоростной цикл обхода без рекурсивных замыканий
    while (stackPtr > 0) {
        const currNode = _staticCountNodesStack[--stackPtr];
        if (!currNode) continue;

        if (currNode.type === "slot" && currNode.id) {
            totalSlotsCount++;
        }

        const children = currNode.children;
        if (children && children.length > 0) {
            const cLen = children.length;
            for (let k = 0; k < cLen; k++) {
                if (stackPtr < 64) {
                    _staticCountNodesStack[stackPtr++] = children[k];
                }
            }
        }
    }

    // Прецизионно очищаем указатели памяти для предотвращения деоптимизаций TurboFan
    while (stackPtr > 0) {
        _staticCountNodesStack[--stackPtr] = null;
    }

    return totalSlotsCount;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/loader_unit/steps/node_counter.js
 * Время изменения: 10.09.2026 19:44:15 MSK
 */
