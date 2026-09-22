/**
 * @file src/modules/theme/intents/collection_inject.js
 * @version 2.0.1-DEBUG-TRACK-THEME-INJECT
 * @description Конкретный прикладной DOD-редьюсер налива цветовых тем с трассировкой ОЗУ.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../../../core/smo/bus.js";

/**
 * Наполняет список тем прибора и инициирует расчет метрик скроллбара
 */
export function reduceCollectionInject(triad, payload) {
     const bTest=false
    // =================================================================
    // ВЫСШИЙ ПРИОРИТЕТ: ОТЛАДОЧНЫЙ ТРЕКИНГ ПО КОМАНДЕ ПОЛЬЗОВАТЕЛЯ
    // =================================================================
    if (bTest) console.log("\n====================================================");
    if (bTest) console.log("[THEME_INJECT_TRACE] МЕТОД reduceCollectionInject ВЫЗВАН!");
    if (bTest) console.log("ПРИСУТСТВИЕ ТРИАДЫ:", !!triad);
    if (bTest) console.log("ПРИСУТСТВИЕ МОДЕЛИ:", !!(triad && triad.mdl));
    if (bTest) console.log("ТИП PAYLOAD:", Array.isArray(payload) ? "ARRAY" : typeof payload);
    
    if (payload) {
        if (bTest) console.log("СОДЕРЖИМОЕ PAYLOAD:", JSON.stringify(payload).substring(0, 200) + "...");
    }

    if (!triad || !triad.mdl || !payload) {
        if (bTest) console.log("❌ КРИТИЧЕСКИЙ ОТКАЗ: Сбой базовых проверок аргументов (triad/mdl/payload).");
        if (bTest) console.log("====================================================\n");
        //process.exit(1);
    }

    const m = triad.mdl;
    const v = triad.view;

    let srcList = null;
    if (Array.isArray(payload)) {
        srcList = payload;
    } else if (typeof payload === "object") {
        srcList = payload.themes || payload.themesList || payload.items || payload.list || payload.masks;
    }

    if (bTest) console.log("ИЗВЛЕЧЕННЫЙ СПИСОК ТЕМ (srcList):", Array.isArray(srcList) ? `МАССИВ (${srcList.length} ед.)` : "НЕ МАССИВ / NULL");

    if (Array.isArray(srcList)) {
        try {
            const srcLen = srcList.length;
            
            if (bTest) console.log("СТАТУС КЛАССА ТЕМЫ ДО ЗАПИСИ (isExtensible):", Object.isExtensible(m));
            if (bTest) console.log("СТАТУС МАССИВА ТЕМ ДО ЗАПИСИ (isExtensible):", Object.isExtensible(m.themesList));

            if (!m.themesList) {
                m.themesList = new Array(srcLen);
            } else {
                m.themesList.length = 0;
            }

            for (let j = 0; j < srcLen; j++) {
                m.themesList[j] = srcList[j];
            }

            if (m.selectedIndex >= srcLen) {
                m.selectedIndex = 0;
            }
            
            if (bTest) console.log("✅ НАЛИВ В МОДЕЛЬ ПРОШЕЛ УСПЕШНО! ДЛИНА:", m.themesList.length);
        } catch (err) {
            console.error("❌ КРАШ ПРИ ЗАПИСИ В МОДЕЛЬ:", err.message);
            if (bTest) console.log("====================================================\n");
            process.exit(1);
        }
    }

    m._isDirty = true;

    try {
        const totalThemesNum = m.themesList ? m.themesList.length : 0;
        const maxVisibleRows = Math.max(1, Math.floor((v ? v.height : 16) - 5));

        if (bTest) console.log("ВЫСТРЕЛ СИНХРОНИЗАЦИИ НА КАНАЛ 14. СЛОТ 106...");
        generateGpssTransaction("14", "SYNC_SCROLLBAR_METRICS", {
            targetSlotId: "106", 
            totalItems: totalThemesNum, 
            maxVisibleRows: maxVisibleRows
        }, "106");
        if (bTest) console.log("✅ ТРАНЗАКТ СИНХРОНИЗАЦИИ СКРОЛЛБАРА ВЫПУЩЕН.");
    } catch (err) {
        console.error("❌ КРАШ ПРИ ОТПРАВКЕ ТРАНЗАКТА:", err.message);
    }

    if (bTest) console.log("====================================================\n");
    //process.exit(1); // Намертво останавливаем рантайм для анализа лога

    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/intents/collection_inject.js
 * Время изменения: 11.09.2026 19:25:00 MSK
 */
