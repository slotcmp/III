/**
 * @file src/core/slot_maker/steps/topology_finder.js
 * @version 1.0.0-RELEASE-SMO-STEP-TOPOLOGY-FINDER
 * @description Безаллокационный поиск ноды прибора в runtime-дереве топологии разметки.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

// Преаллоцированный статический стек для безаллокационного обхода дерева (0% GC)
const _staticFinderNodesStack = new Array(64);

/**
 * Находит узел разметки по строковому ID слота или возвращает детерминированный фолбэк
 * @param {Object} kernel Ссылка на ОЗУ-рантайм ядра хоста
 * @param {string} slotId Строковый идентификатор целевого прибора
 * @param {number} fallbackW Дефолтная ширина из полезной нагрузки воркера
 * @param {number} fallbackH Дефолтная высота из полезной нагрузки воркера
 * @returns {Object} Ссылка на живой узел разметки или мономорфный фолбэк-объект
 */
export function findTopologyNodeOrFallback(kernel, slotId, fallbackW, fallbackH) {
    if (!kernel || !kernel.layoutTopologyTree) {
        const mock = { id: slotId, _computedMinW: fallbackW, _computedMinH: fallbackH };
        Object.preventExtensions(mock);
        return mock;
    }

    let foundNodeRef = null;
    let stackPtr = 0;
    _staticFinderNodesStack[stackPtr++] = kernel.layoutTopologyTree;

    // Высокоскоростной плоский итератор по дереву топологии
    while (stackPtr > 0) {
        const currNode = _staticFinderNodesStack[--stackPtr];
        if (!currNode) continue;

        if (String(currNode.slot || currNode.id || "") === String(slotId)) {
            foundNodeRef = currNode;
            break;
        }

        const children = currNode.children;
        if (children && children.length > 0) {
            const cLen = children.length;
            for (let k = 0; k < cLen; k++) {
                if (stackPtr < 64) _staticFinderNodesStack[stackPtr++] = children[k];
            }
        }
    }

    // Зачищаем ОЗУ-указатели для защиты TurboFan от утечек ссылок
    while (stackPtr > 0) {
        _staticFinderNodesStack[--stackPtr] = null;
    }

    // Если нода найдена, но калькулятор воркера еще не накатил метрики — страхуем свойствами
    if (foundNodeRef) {
        if (foundNodeRef._computedMinW === undefined) foundNodeRef._computedMinW = fallbackW;
        if (foundNodeRef._computedMinH === undefined) foundNodeRef._computedMinH = fallbackH;
        return foundNodeRef;
    }

    // Безопасный мономорфный фолбэк-паспорт
    const fallbackMock = { id: slotId, _computedMinW: fallbackW, _computedMinH: fallbackH };
    Object.preventExtensions(fallbackMock);
    return fallbackMock;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker/steps/topology_finder.js
 * Время изменения: 10.09.2026 18:35:00 MSK
 */
