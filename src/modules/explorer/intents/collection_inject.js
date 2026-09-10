/**
 * @file src/modules/explorer/intents/collection_inject.js
 * @version 2.0.0-RELEASE-SMO-EXPLORER-REDUCER-COLLECTION-INJECT
 * @description Абстрактный DOD-редьюсер налива массивов данных (Канал 102/103).
 */

import { generateGpssTransaction } from "../../../core/smo/bus.js";

export function reduceCollectionInject(triad, payload, slotIdStr, viewStack) {
    if (!triad || !payload || !payload.items || !Array.isArray(viewStack)) return false;

    const srcItemsArray = payload.items;
    const srcLen = srcItemsArray.length;
    const stackLen = viewStack.length;

    for (let i = 0; i < stackLen; i++) {
        const node = viewStack[i];
        if (node && node.mdl && node.mdl.itemsList) {
            const targetArr = node.mdl.itemsList;
            
            targetArr.length = 0; 
            for (let j = 0; j < srcLen; j++) {
                targetArr[j] = srcItemsArray[j]; 
            }

            if (node.mdl.selectedIndex >= targetArr.length) {
                node.mdl.selectedIndex = Math.max(0, targetArr.length - 1);
            }
            node.mdl._isDirty = true;
        }
    }

    const v = triad.view;
    const maxVisibleRows = Math.max(1, Math.floor((v ? v.height : 15) - 4));

    generateGpssTransaction("14", "SYNC_SCROLLBAR_METRICS", {
        targetSlotId: slotIdStr, totalItems: srcLen + 1, maxVisibleRows: maxVisibleRows
    }, slotIdStr);

    return true;
}
