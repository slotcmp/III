/**
 * @file src/core/slot_maker/steps/tab_passport_builder.js
 * @version 1.0.0-RELEASE-SMO-STEP-TAB-PASSPORT-BUILDER
 * @description Безаллокационный генератор и валидатор строковых паспортов TUI-вкладок.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

/**
 * Процедурно собирает и очищает массив названий вкладок для прибора
 * @param {string} comp Имя компонента (домен)
 * @param {Array} rawTabs Массив сырых конфигураций табов из payload
 * @param {Array} outNamesCache Преаллоцированный пустой массив под имена
 * @returns {number} Фактическое количество собранных вкладок
 */
export function buildTabNamesCache(comp, rawTabs, outNamesCache) {
    if (rawTabs && Array.isArray(rawTabs) && rawTabs.length > 0) {
        const tabsCount = rawTabs.length;
        
        for (let idx = 0; idx < tabsCount; idx++) {
            const tCfg = rawTabs[idx];
            let titleStr = String(tCfg && typeof tCfg === "object" ? (tCfg.title || tCfg.name || "") : "");
            
            // Если имя пустое — даем строгое системное имя по умолчанию
            if (titleStr.length === 0) {
                titleStr = "T" + String(idx + 1);
            }
            outNamesCache[idx] = titleStr;
        }
        return tabsCount;
    }

    // Фолбэк для одиночного суверенного окна (0 вкладок в layout.json)
    outNamesCache[0] = String(comp).toUpperCase();
    return 1;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker/steps/tab_passport_builder.js
 * Время изменения: 10.09.2026 18:36:12 MSK
 */
