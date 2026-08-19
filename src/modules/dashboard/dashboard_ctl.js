/**
 * @file src/modules/dashboard/dashboard_controller.js
 * @version 3.0.1-RELEASE-SMO-DASHBOARD-CONTROLLER-SYNCHRONOUS
 * @description Контроллер и фазовый фильтр СМО-прибора обслуживания Канала 101 (Dashboard).
 * Переключает под-вкладки мониторинга ресурсов ядра без разрыва такта Event Loop.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { createDashboardMdlInstance } from "./dashboard_mdl.js";
import { createDashboardViewInstance, renderDashboardContent } from "./dashboard_view.js";

/**
 * Фабрика сборки мономорфного состояния PAC-контроллера дашборда
 * @param {Object} appHostRef Ссылка на ядро хоста приложения
 * @param {string} slotIdStr Идентификатор целевого слота
 * @returns {Object} Запечатанная структура контроллера
 */
export function createDashboardController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "101");
    const ctlState = { mdl: createDashboardMdlInstance(), view: createDashboardViewInstance(id), host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

/**
 * Фазовый СМО-фильтр супершины прерываний для Прибора Канала 101
 * @param {Object} facilityState Состояние активного прибора СМО
 * @param {string} intentStr Идентификатор прерывания
 * @param {Object} contextPayload Контекст транзакта
 * @param {Object} currentTx Полный паспорт транзакта СМО
 * @returns {boolean} Флаг наличия мутаций
 */
export function processSpecificDashboardLogic(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack || !pack.mdl || !pack.view) return false;
    
    const mdl = pack.mdl;
    const view = pack.view;
    const intent = String(intentStr || "");
    let isMutated = false;

    // СМО-ФАЗА ОТРЕСОВКИ: Полностью СИНХРОННЫЙ вызов отрисовщика из статического импорта
    if (intent === "SMO_PHASE_CONTENT") {
        renderDashboardContent(view, mdl);
        return true;
    }

    switch (intent) {
        case "ROTATE_SLOT_STACK":
        case "ROTATE_DASHBOARD_SUBVIEW":
            // Переключаем под-вкладку Дашборда (Линейка <-> Монитор) строго по прерыванию СМО
            view._subViewTypeStr = (view._subViewTypeStr === "monitor") ? "ruler" : "monitor";
            facilityState.activeStackIdx = (view._subViewTypeStr === "monitor") ? 1 : 0;
            mdl._isDirty = true; 
            isMutated = true;
            break;
    }
    return isMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/dashboard/dashboard_controller.js
 * Время модификации: 18.08.2026 17:08:45 MSK
 */
