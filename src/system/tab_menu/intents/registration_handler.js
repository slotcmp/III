/**
 * @file src/system/tab_menu/intents/registration_handler.js
 * @version 1.0.0-RELEASE-SMO-INTENT-REGISTRATION-HANDLER
 * @description Изолированная DOD-процедура конфигурации координатной сетки вкладок (Канал 12).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

/**
 * Прописывает физические X-границы TUI-вкладок прибора в плоский буфер модели
 * @param {Object} m Ссылка на анемичную модель Канала 12
 * @param {Object} contextPayload Объект полезной нагрузки транзакта прерывания
 * @returns {boolean} Всегда false, так как интент конфигурационный и не требует перерендеринга кадра
 */
export function handleRegistrationTabSpace(m, contextPayload) {
    if (!m || !contextPayload) return false;

    const slotId = Math.floor(contextPayload.slotIdNum || 0) & 255;
    const count = Math.max(0, Math.floor(contextPayload.tabsCount || 0)) & 15;
    
    // Фиксируем количество вкладок для этого слота в системном регистре
    m.tabsCountRegistry[slotId] = count;
    
    // Рассчитываем стартовое смещение внутри плоского буфера координат (32 байта/ячейки на слот)
    const offset = slotId * 32;
    const srcCoords = contextPayload.coords;

    if (Array.isArray(srcCoords)) {
        for (let i = 0; i < count; i++) {
            if (srcCoords[i]) {
                // Попарно штампуем границы ушка: [start, end, start, end...]
                m.coordinatesBuffer[offset + (i * 2)] = Math.floor(srcCoords[i].start || 0);
                m.coordinatesBuffer[offset + (i * 2) + 1] = Math.floor(srcCoords[i].end || 0);
            }
        }
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/system/tab_menu/intents/registration_handler.js
 * Время изменения: 10.09.2026 17:48:00 MSK
 */
