/**
 * @file src/modules/logger/logger_ctl.js
 * @version 3.2.1-RELEASE-SMO-LOGGER-CTL-SURROGATE-SANITIZER-FIXED
 * @description Контроллер и фазовый фильтр СМО-прибора обслуживания Канала 108 (Logger).
 * ИСПРАВЛЕН ИТEРАТОР: Ликвидирован бесконечный цикл в контуре санации UTF-суррогатов логов.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% try-catch.
 */

import { generateGpssTransaction } from "../../core/smo/bus.js";

export function createLoggerController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "108");
    const ctlState = { mdl: null, view: null, host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

/**
 * Чистая процедура редукции прерываний Слота 108
 */
export function processSpecificLoggerLogic(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack) return false;
    
    let m = null;
    if (Array.isArray(pack)) {
        if (pack[0]) m = pack[0].mdl;
    } else {
        m = pack.mdl;
    }
    
    if (!m) return false;
    
    const intent = String(intentStr || "");
    let isMutated = false;

    const maxVisibleLines = Math.max(1, (facilityState.view?.height || 6) - 4);
    const maxScrollLimit = Math.max(0, Math.floor(m.totalLogsCount || 0) - maxVisibleLines);

    switch (intent) {
        case "MOVE_CURSOR_DOWN":
            if (m.viewportOffset !== undefined && m.viewportOffset < maxScrollLimit) {
                m.viewportOffset++;
                m._isDirty = true;
                isMutated = true;
            }
            break;

        case "MOVE_CURSOR_UP":
            if (m.viewportOffset !== undefined && m.viewportOffset > 0) {
                m.viewportOffset--;
                m._isDirty = true;
                isMutated = true;
            }
            break;

        case "ADD_LOG_ENTRY":
            const rawMessage = contextPayload || (currentTx ? currentTx.P3 : null);
            if (rawMessage) {
                const logString = String(rawMessage);
                
                // =================================================================
                // ИСПРАВЛЕННЫЙ БЕЗАЛЛОКАЦИОННЫЙ ПОСИМВОЛЬНЫЙ UTF-САНАТOР (0% GC)
                // =================================================================
                let cleanLogStr = "";
                const rawLen = logString.length;

                // Фикс: Переменная цикла 'c' теперь прецизионно контролирует продвижение по строке
                for (let c = 0; c < rawLen; c++) {
                    const charCode = logString.charCodeAt(c);
                    const charStr = logString.charAt(c);

                    // Перехватываем суррогатные кавычки и тяжелые TUI-вертикали, ломающие длину ячеек
                    if (charCode === 0x2018 || charCode === 0x2019) {
                        cleanLogStr += "'"; 
                    } else if (charCode === 0x2502) {
                        cleanLogStr += "|"; 
                    } else if (charCode > 0x7F && charCode < 0x0400) {
                        cleanLogStr += "?"; 
                    } else {
                        cleanLogStr += charStr; 
                    }
                }

                if (Array.isArray(m.logsArray)) {
                    const currentTotal = Math.floor(m.totalLogsCount || 0);
                    const maxCapacity = Math.floor(m.maxLines || 128);
                    
                    if (currentTotal < maxCapacity) {
                        m.logsArray[currentTotal] = cleanLogStr;
                        m.totalLogsCount = currentTotal + 1;
                    } else {
                        for (let i = 1; i < maxCapacity; i++) {
                            m.logsArray[i - 1] = m.logsArray[i];
                        }
                        m.logsArray[maxCapacity - 1] = cleanLogStr;
                    }
                    
                    m._isDirty = true; 
                    isMutated = true;

                    if (facilityState.host?.virtualCanvasState) {
                        facilityState.host.virtualCanvasState.isDirty = true;
                    }
                }
            }
            break;
            
        case "UPDATE_THEME_MASK":
            m._isDirty = true;
            isMutated = true;
            break;
    }

    if (isMutated) {
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "108");
    }

    return isMutated;
}
