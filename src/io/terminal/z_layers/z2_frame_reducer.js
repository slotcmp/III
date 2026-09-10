/**
 * @file src/io/terminal/z_layers/z2_frame_reducer.js
 * @version 2.0.3-RELEASE-SMO-Z2-FRAME-STRICT-DECLARATIVE-HEIGHT
 * @description Автономная DOD-процедура послойного наката стальных рамок (Слой Z-2).
 * ИСПРАВЛЕН СЛОТ 100: Фильтрация рамок переведена на декларативный layoutNodeRef.height (0% хардкода).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation / 0% GC.
 */

import { _gpssEngineState } from "../../../core/smo/bus.js";
import { drawDisplayNodeFrame } from "../viewport_frame_drawer.js";

const _staticZ2NodesStack = new Array(64);

/**
 * Осуществляет вычерчивание каркаса рам окон поверх уложенного контента
 */
export function reduceFrameLayer(targetM, host, geoMap, allRegisteredKeys, lenKeys, currentFocusedSlotIdStr) {
    if (!host || !geoMap || !targetM) return;

    for (let i = 0; i < lenKeys; i++) {
        const slotId = allRegisteredKeys[i];
        if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9" || slotId === "10" || slotId === "11" || slotId === "12" || slotId === "200") {
            continue;
        }

        // Блокируем индивидуальную раму CLI, так как он безрамочный и лежит отдельно
        if (slotId === "105") {
            continue;
        }

        const geo = geoMap[slotId];
        const facility = _gpssEngineState.facilitiesRegistry.get(slotId);
        if (!facility || !geo) continue;

        let sX = Math.floor(geo.x || 0);
        let sY = Math.floor(geo.y || 0);
        let sW = Math.floor(geo.w || 0);
        let sH = Math.floor(geo.h || 0);

        // БЕЗАЛЛОКАЦИОННЫЙ ПОИСК ТОПОЛОГИИ НА ПЛОСКОМ СТЕКЕ (O(1))
        let layoutNodeRef = null;
        let stackPtr = 0;
        _staticZ2NodesStack[stackPtr++] = host.layoutTopologyTree;

        while (stackPtr > 0) {
            const currNode = _staticZ2NodesStack[--stackPtr];
            if (!currNode) continue;

            if (String(currNode.slot || currNode.id || "") === String(slotId)) {
                layoutNodeRef = currNode;
                break;
            }

            const children = currNode.children;
            if (children && children.length > 0) {
                const cLen = children.length;
                for (let k = 0; k < cLen; k++) {
                    if (stackPtr < 64) _staticZ2NodesStack[stackPtr++] = children[k];
                }
            }
        }

        while (stackPtr > 0) {
            _staticZ2NodesStack[--stackPtr] = null;
        }

        if (layoutNodeRef && layoutNodeRef.enabled === false) continue;

        // =================================================================
        // ИСПРАВЛЕНИЕ: ПРОВЕРКА ВЫСОТЫ ПО ДЕКЛАРАТИВНOМУ ЗНАЧЕНИЮ ИЗ JSON
        // =================================================================
        // Считываем высоту напрямую из манифеста. Если там жестко задана 1 строка —
        // рамок у прибора нет и быть не может. Полностью аннулируем накат Z-2.
        const declarativeHeight = layoutNodeRef ? parseInt(layoutNodeRef.height || "0", 10) : 0;
        if (declarativeHeight === 1 || sH === 1) {
            continue;
        }

        if (layoutNodeRef && layoutNodeRef.collapsed === true) {
            sH = Math.min(sH, 3); 
        }

        if (sW < 2 || sH < 2) continue;

        const compType = String(facility.componentType);
        const isFocused = (slotId === currentFocusedSlotIdStr);
        
        // Накатываем раму только для честных, объемных окон
        drawDisplayNodeFrame(targetM, compType, slotId, isFocused, sX, sY, sW, sH);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/z_layers/z2_frame_reducer.js
 * Время изменения: 10.09.2026 16:11:00 MSK
 */
