/**
 * @file src/core/layout/balancer/tab_indexer.js
 * @version 6.1.3-RELEASE-SMO-DOD-6-PRIMITIVE-FLEX-ALT-FIXED
 * @description Сборщик паспортов вкладок. Ликвидирован промах по ALT за счет синхронизации 4-зонного флекс-шага.
 */
import { _gpssEngineState } from "../../smo/bus.js";

const _staticIndexNodesStack = new Array(64);

export function buildDynamicTabCoordinatesRegistry(kernel) {
    if (!kernel || !kernel.layoutTopologyTree || !kernel.calculatedGeoMap) return;

    const tabMenuMdl = _gpssEngineState.facilitiesRegistry.get("12")?.mdl;
    const vectorBuf = tabMenuMdl ? tabMenuMdl.tabsVectorArray : null;
    if (!vectorBuf) return;

    tabMenuMdl.totalRegisteredTabsCount = 0;
    vectorBuf.fill(0);

    let stackPtr = 0;
    _staticIndexNodesStack[stackPtr++] = kernel.layoutTopologyTree;
    let currentGlobalPassportIdx = 0;

    const screenW = Math.max(40, Math.floor(kernel.width || 120));
    
    // ИСПРАВЛЕНО: Ширина одного глобального ушка на линии Y=0 (всего 4 маски модификаторов)
    const fixedExternalTabWidth = Math.floor(screenW / 4); 

    while (stackPtr > 0) {
        const node = _staticIndexNodesStack[--stackPtr];
        if (!node) continue;

        const ownerSlotIdStr = String(node.id || node.slot || "");
        const ownerSlotIdNum = parseInt(ownerSlotIdStr, 10) & 255;

        if (ownerSlotIdNum > 0) {
           
if (node.enabled !== false && node.collapsed !== true && Array.isArray(node.tabs)) {
    const geo = kernel.calculatedGeoMap[ownerSlotIdStr];
    
    if (geo) {
        const sX = Math.floor(geo.x || 0);
        const sY = Math.floor(geo.y || 0);
        const rawTabs = node.tabs;
        const tabsCount = Math.min(rawTabs.length, 16);

        const keeperSlotIdNum = (node.tabs_in === true) ? ownerSlotIdNum : 12;
        tabMenuMdl.tabsCountRegistry[ownerSlotIdNum] = tabsCount;

        const globalYNum = (node.tabs_in === true) ? ((sY + 1) | 0) : 0;
        
        // ИСПРАВЛЕНО: Для внутренних табов берем sX + 2, а для внешних — СТАРТУЕМ С 1 (Защита от сдвига)
        let currentTabX = (node.tabs_in === true) ? ((sX + 2) | 0) : 1; 

        for (let t = 0; t < tabsCount; t++) {
            if (currentGlobalPassportIdx >= 64) break;

            const titleStr = String(rawTabs[t]?.title || "TAB");
            const tabLabelLen = (node.tabs_in === true) ? ((titleStr.length + 3) | 0) : fixedExternalTabWidth;

            const writeOffset = (currentGlobalPassportIdx * 6) | 0;

            vectorBuf[writeOffset]     = keeperSlotIdNum; 
            vectorBuf[writeOffset + 1] = globalYNum;      
            vectorBuf[writeOffset + 2] = currentTabX;     
            vectorBuf[writeOffset + 3] = (currentTabX + tabLabelLen - 1) | 0; 
            vectorBuf[writeOffset + 4] = ownerSlotIdNum;   
            vectorBuf[writeOffset + 5] = t;                

            currentGlobalPassportIdx++;

            if (node.tabs_in === true) {
                currentTabX += (tabLabelLen + 1) | 0;
            } else {
                // Строгое смещение флекс-сетки с шагом + 1 на рамку
                currentTabX = (((t + 1) * fixedExternalTabWidth) + 1) | 0; 
            }
        }
    }
}
            else {
                tabMenuMdl.tabsCountRegistry[ownerSlotIdNum] = 0;
            }
        }

        const children = node.children;
        if (children && children.length > 0) {
            const cLen = children.length;
            for (let k = 0; k < cLen; k++) {
                if (stackPtr < 64) _staticIndexNodesStack[stackPtr++] = children[k];
            }
        }
    }

    tabMenuMdl.totalRegisteredTabsCount = currentGlobalPassportIdx;
    while (stackPtr > 0) { _staticIndexNodesStack[--stackPtr] = null; }
}