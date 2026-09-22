/**
 * @file src/system/tab_menu/intents/registration_handler.js
 * @version 1.0.1-RELEASE-SMO-INTENT-REGISTRATION-HANDLER-PURE
 * @description Изолированная DOD-процедура конфигурации счетчиков вкладок (Канал 12).
 * ИСПРАВЛЕН КРАШ: Очищен от мутаций удаленных буферов, пишет строго в tabsCountRegistry.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

/**
 * Прописывает факт наличия и количество TUI-вкладок прибора в системный регистр
 * @param {Object} m Ссылка на анемичную модель Канала 12
 * @param {Object} contextPayload Объект полезной нагрузки транзакта прерывания
 * @returns {boolean} Всегда false, так как интент конфигурационный и не требует рендера кадра
 */
export function handleRegistrationTabSpace(m, contextPayload) {
    if (!m || !contextPayload) return false;

    // Безопасное побитовое извлечение ID слота-владельца ушек
    const slotId = Math.floor(contextPayload.slotIdNum || contextPayload.slotId || 0) & 255;
    const count  = Math.max(0, Math.floor(contextPayload.tabsCount || 0)) & 15;
    
    // Фиксируем количество вкладок для этого слота в системном Uint8Array регистре
    if (m.tabsCountRegistry) {
        m.tabsCountRegistry[slotId] = count;
    }

    return false;
}
