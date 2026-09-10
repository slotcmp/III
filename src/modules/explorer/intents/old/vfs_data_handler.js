/**
 * @file src/modules/explorer/intents/vfs_data_handler.js
 * @version 1.0.0-RELEASE-SMO-EXPLORER-INTENT-VFS-DATA
 * @description Изолированная DOD-процедура инжекции списков файлов VFS (Канал 102/103).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../../../core/smo/bus.js";

/**
 * Распределяет пришедший из воркера массив файлов по всем вкладкам триады
 * @param {Object} triad Ссылка на абстрактную PAC-триаду Проводника
 * @param {Object} payload Полезная нагрузка с массивом файлов
 * @param {string} slotIdStr Идентификатор физического слота (102/103)
 * @param {Object} viewStack Весь массив вкладок прибора
 * @returns {boolean} Флаг успешной мутации состояния
 */
export function handleInjectVfsData(triad, payload, slotIdStr, viewStack) {
    if (!triad || !payload || !payload.items || !Array.isArray(viewStack)) return false;

    const srcItemsArray = payload.items;
    const srcLen = srcItemsArray.length;
    const stackLen = viewStack.length;

    // Безаллокационный налив данных во все вкладки для синхронизации
    for (let i = 0; i < stackLen; i++) {
        const node = viewStack[i];
        if (node && node.mdl && node.mdl.itemsList) {
            const targetArr = node.mdl.itemsList;
            
            // Сбрасываем длину без перевыделения памяти массива (0% GC)
            targetArr.length = 0; 
            for (let j = 0; j < srcLen; j++) {
                targetArr[j] = srcItemsArray[j]; 
            }

            // Корректируем индекс выделенной строки, если список файлов уменьшился
            if (node.mdl.selectedIndex >= targetArr.length) {
                node.mdl.selectedIndex = Math.max(0, targetArr.length - 1);
            }
            node.mdl._isDirty = true;
        }
    }

    // Вычисляем высоту контентной зоны для настройки скроллбара
    const v = triad.view;
    const maxVisibleRows = Math.max(1, Math.floor((v ? v.height : 15) - 4));

    // Синхронизируем физическую полосу прокрутки на Канале 14
    generateGpssTransaction("14", "SYNC_SCROLLBAR_METRICS", {
        targetSlotId: slotIdStr,
        totalItems: srcLen + 1, 
        maxVisibleRows: maxVisibleRows
    }, slotIdStr);

    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/intents/vfs_data_handler.js
 * Время изменения: 10.09.2026 19:26:00 MSK
 */
