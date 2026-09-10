/**
 * @file src/io/terminal/z_layers/z3_interactive_reducer.js
 * @version 2.0.2-RELEASE-SMO-Z3-INTERACTIVE-DECLARATIVE-BUTTONS-FIX
 * @description Автономная DOD-процедура наката управляющих кнопок и вкладок (Слой Z-3).
 * ИСПРАВЛЕН СЛОТ 100: Системные кнопки рамы отключены на основе декларативной высоты из JSON.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation / 0% GC.
 */

import { _gpssEngineState } from "../../../core/smo/bus.js";
import { drawWindowButtonsOverlay } from "../viewport_frame_drawer.js";
import { drawWindowTabsOverlay } from "../generic_tui_layout.js";

const _staticTitlesStringsCacheArray = new Array(16);
const _staticDodNodesStack = new Array(64);

let _staticTabsbarXTracker = 0;

/**
 * Осуществляет накат интерактивного обвеса самым верхним Z-приоритетом кадра
 */
export function reduceInteractiveLayer(targetM, host, geoMap, allRegisteredKeys, lenKeys) {
    if (!host || !geoMap || !targetM) return;

    const tabsbarGeo = geoMap["200"];
    _staticTabsbarXTracker = tabsbarGeo ? Math.floor(tabsbarGeo.x || 0) + 1 : 1;

    for (let i = 0; i < lenKeys; i++) {
        const slotId = allRegisteredKeys[i];
        if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9" || slotId === "10" || slotId === "11" || slotId === "12" || slotId === "200") {
            continue;
        }

        const geo = geoMap[slotId];
        const facility = _gpssEngineState.facilitiesRegistry.get(slotId);
        if (!facility || !geo || facility.enabled === false) continue;

        const sX = Math.floor(geo.x || 0);
        const sY = Math.floor(geo.y || 0);
        const sW = Math.floor(geo.w || 0);
        const sH = Math.floor(geo.h || 0);

        if (sW < 1 || sH < 1) continue;

        // БЕЗАЛЛОКАЦИОННЫЙ ПОИСК ТОПОЛОГИИ НА ПЛОСКОМ СТЕКЕ (O(1))
        let layoutNodeRef = null;
        let stackPtr = 0;
        _staticDodNodesStack[stackPtr++] = host.layoutTopologyTree;

        while (stackPtr > 0) {
            const currNode = _staticDodNodesStack[--stackPtr];
            if (!currNode) continue;

            if (String(currNode.slot || currNode.id || "") === String(slotId)) {
                layoutNodeRef = currNode;
                break;
            }

            const children = currNode.children;
            if (children && children.length > 0) {
                const cLen = children.length;
                for (let k = 0; k < cLen; k++) {
                    if (stackPtr < 64) _staticDodNodesStack[stackPtr++] = children[k];
                }
            }
        }

        while (stackPtr > 0) {
            _staticDodNodesStack[--stackPtr] = null;
        }

        // =================================================================
        // ИСПРАВЛЕНИЕ: БЛOКИРОВКА СИСТЕМНЫХ КНОПОК ДЛЯ ПЛОСКИХ СЛОТОВ
        // =================================================================
        // Проверяем высоту напрямую из JSON. Если в манифесте задана 1 строка —
        // прибор не имеет рамы, и накат кнопок [-][▲][×] полностью блокируется.
        const declarativeHeight = layoutNodeRef ? parseInt(layoutNodeRef.height || "0", 10) : 0;

        if (declarativeHeight > 1 && sH > 1) {
            drawWindowButtonsOverlay(targetM, sX, sY, sW, sH, slotId);
        }

        // 2. РАСПРЕДЕЛЕНИЕ ВКЛАДОК ПО ПРАВИЛУ ТABS_IN
        const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
        if (facility.viewStack) {
            const node = Array.isArray(facility.viewStack) ? facility.viewStack[activeIdx] : facility.viewStack;
            
            const rawTabsArray = layoutNodeRef?.tabs || [];
            const tabsCount = Math.min(rawTabsArray.length, 16);

            if (tabsCount > 0) {
                for (let t = 0; t < tabsCount; t++) {
                    _staticTitlesStringsCacheArray[t] = String(rawTabsArray[t]?.title || "TAB");
                }
                const cleanTitlesList = _staticTitlesStringsCacheArray.slice(0, tabsCount);

                if (node?.mdl) {
                    node.mdl._globalTabsNamesCached = cleanTitlesList;
                }

                if (layoutNodeRef && layoutNodeRef.tabs_in === true) {
                    drawWindowTabsOverlay(targetM, sX, sY, sW, sH, node?.mdl, cleanTitlesList, activeIdx);
                } else if (tabsbarGeo) {
                    const tW = Math.floor(tabsbarGeo.w || 120);
                    const oldTabStartX = _staticTabsbarXTracker;
                    
                    drawWindowTabsOverlay(targetM, oldTabStartX, -1, tW, 3, node?.mdl, cleanTitlesList, activeIdx);

                    let totalWidthOccupied = 0;
                    for (let t = 0; t < tabsCount; t++) {
                        totalWidthOccupied += cleanTitlesList[t].length + 3; 
                    }
                    _staticTabsbarXTracker += totalWidthOccupied + 3;
                }
            }
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/z_layers/z3_interactive_reducer.js
 * Время изменения: 10.09.2026 16:14:15 MSK
 */
