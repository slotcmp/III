/**
 * @file src/modules/explorer/intents/scroll_mutated_handler.js
 * @version 1.0.0-RELEASE-SMO-EXPLORER-INTENT-SCROLL-MUTATED
 * @description Изолированная DOD-процедура сдвига вьюпорта и курсора Проводника.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

/**
 * Мутирует смещение вьюпорта и выбранный индекс модели
 * @param {Object} triad Ссылка на активную PAC-триаду Проводника
 * @param {Object} payload Полезная нагрузка с новым смещением и индексом
 * @returns {boolean} Флаг успешной мутации состояния
 */
export function handleScrollMutated(triad, payload) {
    if (!triad || !triad.mdl || !payload) return false;

    const mdl = triad.mdl;
    mdl.viewportOffset = Math.max(0, Math.floor(payload.viewportOffset || 0));
    mdl.selectedIndex  = Math.max(0, Math.floor(payload.selectedIndex || 0));
    mdl._isDirty = true;

    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/intents/scroll_mutated_handler.js
 * Время изменения: 10.09.2026 19:28:00 MSK
 */
