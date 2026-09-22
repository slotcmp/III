/**
 * @file src/modules/explorer/intents/collection_inject.js
 * @version 2.0.1-RELEASE-SMO-EXPLORER-REDUCER-COLLECTION-INJECT-STRICT
 * @description Абстрактный DOD-редьюсер налива массивов данных (Канал 102/103).
 * ИСПРАВЛЕНО: Убран паразитный оффсет +1, ломавший расчет лимитов скролла на Канале 14.
 * Выполнен в строгой парадигме PAC / DOD / IDD / Zero Allocation / 0% GC.
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

    // =================================================================
    // СИНХРОНИЗАЦИЯ СТРОГО ПО РЕAЛЬНOМУ РАЗМЕРУ КОЛЛЕКЦИИ (IDD-ИСПРАВЛЕНИЕ)
    // =================================================================
    // Убираем "+ 1". Канал 14 должен знать точное количество файлов для O(1) хит-теста
    generateGpssTransaction("14", "SYNC_SCROLLBAR_METRICS", {
        targetSlotId: slotIdStr, 
        totalItems: srcLen, // ◄── ПЕРЕДАЕМ ЧЕСТНЫЙ ДЛИНУ МАССИВА
        maxVisibleRows: maxVisibleRows
    }, slotIdStr);

    return true;
}
