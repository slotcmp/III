/**
 * @file src/modules/theme/intents/collection_inject.js
 * @version 1.0.0-RELEASE-SMO-THEME-REDUCER-COLLECTION-INJECT
 * @description Конкретный прикладной DOD-редьюсер налива массивов цветовых тем (Канал 106).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../../../core/smo/bus.js";

/**
 * Наполняет список тем прибора и инициирует расчет метрик скроллбара
 * @param {Object} triad Ссылка на абстрактную PAC-триаду Палитры тем
 * @param {Object} payload Полезная нагрузка с массивом тем или масок
 * @returns {boolean} Флаг успешной мутации состояния
 */
export function reduceCollectionInject(triad, payload) {
    if (!triad || !triad.mdl || !payload) return false;

    const m = triad.mdl;
    const v = triad.view;

    // Извлекаем массив тем из полезной нагрузки
    const srcList = payload.themesList || payload.items || payload.list;
    
    if (Array.isArray(srcList)) {
        const srcLen = srcList.length;
        
        // Преаллоцируем или сбрасываем существующий массив модели без утечек (0% GC)
        if (!m.themesList) {
            m.themesList = new Array(srcLen);
        } else {
            m.themesList.length = 0;
        }

        for (let j = 0; j < srcLen; j++) {
            m.themesList[j] = srcList[j];
        }

        // Страхуем индекс выделенной темы от выхода за границы нового массива
        if (m.selectedIndex >= srcLen) {
            m.selectedIndex = 0;
        }
    }

    m._isDirty = true;

    // Вычисляем высоту контентной зоны для настройки скроллбара
    const totalThemesNum = m.themesList ? m.themesList.length : 0;
    const maxVisibleRows = Math.max(1, Math.floor((v ? v.height : 16) - 5));

    // Накатываем метрики прокрутки на Канал 14
    generateGpssTransaction("14", "SYNC_SCROLLBAR_METRICS", {
        targetSlotId: "106", 
        totalItems: totalThemesNum, 
        maxVisibleRows: maxVisibleRows
    }, "106");

    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/intents/collection_inject.js
 * Время изменения: 10.09.2026 20:51:00 MSK
 */
