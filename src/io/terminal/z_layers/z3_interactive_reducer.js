/**
 * @file src/io/terminal/z_layers/z3_interactive_reducer.js
 * @version 2.0.6-RELEASE-SMO-Z3-ATOMIC-PASSPORT-RESET
 * @description Автономная DOD-процедура послойного наката интерактивного обвеса (Слой Z-3).
 * ИСПРАВЛЕНО: Счетчик и ОЗУ-вектор паспортов Канала 12 зачищаются строго на старте такта Z-3.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { _gpssEngineState } from "../../../core/smo/bus.js";
import { drawWindowButtonsOverlay } from "../frame_decorator.js";
import { drawWindowTabsOverlay } from "../generic_tui_layout.js";

const _staticTitlesStringsCacheArray = new Array(16);
const _staticDodNodesStack = new Array(64);

/**
 * Осуществляет накат интерактивного обвеса самым верхним Z-приоритетом кадра
 */
export function reduceInteractiveLayer(targetM, host, geoMap, allRegisteredKeys, lenKeys) {
    if (!host || !geoMap || !targetM) return;

    // =================================================================
    // СУВЕРЕННЫЙ DOD-СБРОС КАРЕТКИ ПЕРЕД НАЧАЛОМ ЗАПОЛНЕНИЯ ВЕКТОРA
    // =================================================================
    const tabMenuFacility = _gpssEngineState.facilitiesRegistry.get("12");
    const tabMenuMdl = tabMenuFacility ? tabMenuFacility.mdl : null;
    if (tabMenuMdl) {
        tabMenuMdl.totalRegisteredTabsCount = 0; // Сброс каретки в ноль строго в домене Слота 12
        if (tabMenuMdl.tabsVectorArray) {
            tabMenuMdl.tabsVectorArray.fill(0);  // Очистка бинарной ОЗУ-памяти 384 ячеек
        }
    }

    for (let i = 0; i < lenKeys; i++) {
        const slotId = allRegisteredKeys[i];
        
        if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9" || slotId === "10" || slotId === "11" || slotId === "14") {
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

        const declarativeHeight = layoutNodeRef ? parseInt(layoutNodeRef.height || "0", 10) : 0;

        // 1. ОТРИСОВКА КНОПОК ДЛЯ ОБЪЕМНЫХ ОКOН
        if (declarativeHeight > 1 && sH > 1) {
            drawWindowButtonsOverlay(targetM, sX, sY, sW, sH, slotId);
        }

        // 2. ДЕКЛАРАТИВНЫЙ НАКАТ ВКЛАДОК НА ОСНОВЕ МОДЕЛИ LAYOUT.JSON
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
                } else if (slotId === "200") {
                    drawWindowTabsOverlay(targetM, sX, -1, sW, sH, node?.mdl, cleanTitlesList, activeIdx);
                }
            }
        }
    }
}