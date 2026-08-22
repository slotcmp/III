/**
 * @file src/modules/command/command_ctl.js
 * @version 3.4.1-RELEASE-SMO-COMMAND-CTL-STERILE
 * @description Контроллер и фазовый фильтр СМО-прибора обслуживания Канала 105 (Command Line).
 * ИСПРАВЛЕНА РЕАКТИВНОСТЬ: Выполнение команд переведено на генерацию транзактов прерывания шины СМО.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction } from "../../core/smo/bus.js";
import { calculateMutation } from "../../io/terminal/common_input_engine.js";

/**
 * Старая фабрика сборки контроллера сохранена для совместимости автоскана V8, 
 * но рантайм GEN III использует ленивый монтаж через IoC-монтажник slot_maker.js.
 */
export function createCommandController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "105");
    const ctlState = { mdl: null, view: null, host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

/**
 * Чистая процедура редукции прерываний Слота 105
 */
export function processSpecificCommandLogic(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack || !pack.mdl || !pack.view) return false;
    
    const m = pack.mdl; 
    const v = pack.view;
    const intent = String(intentStr || "");
    let isMutated = false;

    // Синхронизируем флаг фокуса отображения с глобальным фокусом ядра хоста
    if (facilityState.host?.model?.logicalState) {
        const currentFocusedId = String(facilityState.host.model.logicalState.focusedSlotId || "");
        v._isFocused = (currentFocusedId === "105");
    }

    switch (intent) {
        case "KEY_PRESSED":
            if (contextPayload && contextPayload.char) {
                const patch = calculateMutation("TYPE_CHAR", contextPayload.char, m);
                if (patch) {
                    m.buffer = String(patch.buffer);
                    m.cursor = Math.max(0, Math.floor(patch.cursor || 0));
                    
                    const charCount = Math.min(m.buffer.length, 256);
                    m.textLength = charCount;
                    m.cursorX = m.cursor;
                    
                    for (let i = 0; i < charCount; i++) {
                        m.charBuffer[i] = m.buffer.charAt(i);
                    }
                    
                    m._isDirty = true;
                    isMutated = true;
                }
            }
            break;

        case "BACKSPACE_PRESSED":
            // Реализация удаления символов через общий input-движок
            const bsPatch = calculateMutation("BACKSPACE", null, m);
            if (bsPatch) {
                m.buffer = String(bsPatch.buffer);
                m.cursor = Math.max(0, Math.floor(bsPatch.cursor || 0));
                
                const charCount = Math.min(m.buffer.length, 256);
                m.textLength = charCount;
                m.cursorX = m.cursor;
                
                for (let i = 0; i < 256; i++) {
                    m.charBuffer[i] = i < charCount ? m.buffer.charAt(i) : " ";
                }
                
                m._isDirty = true;
                isMutated = true;
            }
            break;

        case "EXECUTE_COMMAND":
            if (m.buffer && m.buffer.length > 0) {
                const commandStr = String(m.buffer).trim();
                
                // ИСПРАВЛЕНИЕ: Вместо мертвого пассивного флага выстреливаем реактивный транзакт на Канал 0!
                // Это мгновенно будит ядро и передает команду на исполнение в системный контур.
                generateGpssTransaction("0", "SYSTEM_COMMAND_EXECUTE", {
                    rawCommand: commandStr
                });
                
                // Атомарно очищаем ОЗУ-регистры строки ввода
                m.buffer = "";
                m.cursor = 0;
                m.textLength = 0;
                m.cursorX = 0;
                for (let k = 0; k < 256; k++) m.charBuffer[k] = " ";
                
                m._isDirty = true;
                isMutated = true;
            }
            break;

        case "UPDATE_THEME_MASK":
            m._isDirty = true;
            isMutated = true;
            break;
    }
    return isMutated;
}
