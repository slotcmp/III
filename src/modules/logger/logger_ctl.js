/**
 * @file src/modules/logger/logger_controller.js
 * @version 3.0.1-RELEASE-SMO-LOGGER-CONTROLLER-SYNCHRONOUS
 * @description Контроллер и фазовый фильтр СМО-прибора обслуживания Канала 108 (Logger).
 * Обеспечивает синхронное накопление лог-строк в ОЗУ-буфер без разрыва такта Event Loop.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { createLoggerMdlInstance } from "./logger_mdl.js";
import { createLoggerViewInstance, renderLoggerContent } from "./logger_view.js";

/**
 * Фабрика сборки мономорфного состояния PAC-контроллера логирования
 * @param {Object} appHostRef Ссылка на ядро хоста приложения
 * @param {string} slotIdStr Идентификатор целевого слота
 * @returns {Object} Запечатанная структура контроллера
 */
export function createLoggerController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "108");
    const ctlState = { mdl: createLoggerMdlInstance(), view: createLoggerViewInstance(id), host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

/**
 * Фазовый СМО-фильтр супершины прерываний для Прибора Канала 108
 * @param {Object} facilityState Состояние активного прибора СМО
 * @param {string} intentStr Идентификатор прерывания
 * @param {Object} contextPayload Контекст транзакта
 * @param {Object} currentTx Полный паспорт транзакта СМО
 * @returns {boolean} Флаг наличия мутаций
 */
export function processSpecificLoggerLogic(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack || !pack.mdl || !pack.view) return false;
    
    const mdl = pack.mdl; 
    const view = pack.view;
    const intent = String(intentStr || "");
    let isMutated = false;

    // СМО-ФАЗА ОТРИСОВКИ: Полностью СИНХРОННЫЙ вызов без асинхронных промисов и Event Loop
    if (intent === "SMO_PHASE_CONTENT") {
        renderLoggerContent(view, mdl);
        return true;
    }

    switch (intent) {
        case "ADD_LOG_ENTRY":
            if (currentTx && currentTx.P3) {
                // Безопасно наливаем строку следа в циклический ОЗУ-буфер логгера
                const logString = String(currentTx.P3);
                if (typeof mdl.pushLogLine === "function") {
                    mdl.pushLogLine(logString);
                } else if (Array.isArray(mdl.lines)) {
                    mdl.lines.push(logString);
                    if (mdl.lines.length > 250) {
                        mdl.lines.shift();
                    }
                }
                mdl._isDirty = true; 
                isMutated = true;
            }
            break;
    }
    return isMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/logger/logger_controller.js
 * Время модификации: 18.08.2026 17:03:15 MSK
 */
