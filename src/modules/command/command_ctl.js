/**
 * @file src/modules/command/command_ctl.js
 * @version 5.4.0-RELEASE-SMO-COMMAND-CTL-CLEAN-FINAL
 * @description Стерильный роутер и фазовый фильтр СМО-прибора Канала 105 (Control-контур).
 * ИСПРАВЛЕНА СТРУКТУРА: Весь парсинг удален, контроллер возвращен к парадигме чистой O(1) диспетчеризации.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { generateGpssTransaction } from "../../core/smo/bus.js";

// Импорт размоноличенных контуров логики
import { reduceCliCharInput } from "./intents/cli_char_reducer.js";
import { reduceCliTabCompletion } from "./intents/cli_tab_reducer.js";
import { reduceCliHistoryNavigation } from "./intents/cli_history_reducer.js";

export function createCommandController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "105");
    const ctlState = { mdl: null, view: null, host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

export function processSpecificCommandLogic(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack || !Array.isArray(pack)) return false;

    // Мономорфное извлечение моделей по спецификации slot_maker.js
    const node = pack[0];
    if (!node || !node.mdl || !node.view) return false;

    const m = node.mdl;
    const v = node.view;

    const kernel = facilityState.host;
    const intent = String(intentStr || "");
    let isMutated = false;

    // Ленивая ОЗУ-линковка персистентного буфера истории
    if (!m.historyBuffer && kernel?.model?.logicalState?.appSettings) {
        const settings = kernel.model.logicalState.appSettings;
        m.historyBuffer = settings.cli_history;
        m.historyCount = Math.floor(settings.cli_history_count || 0);
        m.historyCursor = m.historyCount;
    }

    if (kernel?.model?.logicalState) {
        v._isFocused = (String(kernel.model.logicalState.focusedSlotId || "") === "105");
    }

    if (intent !== "TAB_COMPLETION_REQUEST" && m._tabCompletionActive === true) {
        m._tabCompletionActive = false;
        m._matchCount = 0;
    }

    // =================================================================
    // СТЕРЕЛЬНЫЙ O(1) РОУТИНГ СЕМАНТИЧЕСКИХ ИНТЕНТОВ ШИНЫ СМО
    // =================================================================
    if (intent === "KEY_PRESSED") {
        const rawCharObj = contextPayload || (currentTx ? currentTx.P3 : null);
        if (rawCharObj) {
            const chr = String(typeof rawCharObj === "object" ? (rawCharObj.char || "") : rawCharObj);
            isMutated = reduceCliCharInput(m, intent, chr);
        }
    }
    // Принимаем чистый, изолированный интент BACKSPACE от прибора Канала 4
    else if (intent === "BACKSPACE" || intent === "BACKSPACE_PRESSED" || intent === "DELETE_CHAR") {
        isMutated = reduceCliCharInput(m, "BACKSPACE", null);
    }
    // Принимаем чистые интенты навигации от прибора Канала 4
    else if (intent === "MOVE_CURSOR_LEFT" || intent === "MOVE_CURSOR_RIGHT") {
        isMutated = reduceCliCharInput(m, intent, null);
    }
    else if (intent === "TAB_COMPLETION_REQUEST") {
        isMutated = reduceCliTabCompletion(m, kernel);
    }
    else if (intent === "MOVE_CURSOR_UP" || intent === "MOVE_CURSOR_DOWN") {
        isMutated = reduceCliHistoryNavigation(m, intent);
    }
    else if (intent === "EXECUTE_COMMAND") {
        if (m.buffer && m.buffer.length > 0) {
            const commandStr = String(m.buffer).trim();
            
            if (m.historyBuffer) {
                if (m.historyCount < 32) {
                    m.historyBuffer[m.historyCount] = commandStr;
                    m.historyCount++;
                } else {
                    for (let i = 1; i < 32; i++) {
                        m.historyBuffer[i - 1] = m.historyBuffer[i];
                    }
                    m.historyBuffer = commandStr; 
                }
                m.historyCursor = m.historyCount;
                if (kernel?.model?.logicalState?.appSettings) {
                    kernel.model.logicalState.appSettings.cli_history_count = m.historyCount;
                    kernel.model.logicalState.appSettings._isHistoryDirty = true;
                }
            }

            generateGpssTransaction("0", "SYSTEM_COMMAND_EXECUTE", { rawCommand: commandStr }, "105");
            
            // Безаллокационный сброс строки ввода
            m.buffer = ""; m.cursor = 0; m.textLength = 0; m.cursorX = 0;
            for (let k = 0; k < 256; k++) m.charBuffer[k] = " ";
            m._isDirty = true;
            isMutated = true;
        }
    }
    else if (intent === "UPDATE_THEME_MASK") {
        m._isDirty = true;
        isMutated = true;
    }

    if (isMutated && kernel?.virtualCanvasState) {
        kernel.virtualCanvasState.isDirty = true;
    }

    return isMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/command/command_ctl.js
 * Время изменения: 05.09.2026 12:46:00 MSK
 */
