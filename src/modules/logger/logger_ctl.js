/**
 * @file src/modules/logger/logger_ctl.js
 * @version 3.1.1-RELEASE-SMO-LOGGER-CTL-STERILE
 * @description Контроллер и фазовый фильтр СМО-прибора обслуживания Канала 108 (Logger).
 * ИСПРАВЛЕНА РАБОТА С ПАМЯТЬЮ И ДИСКОМ: Удален блокирующий appendFileSync, запись переведена на logsArray.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% try-catch.
 */

/**
 * Старая фабрика сборки контроллера сохранена для совместимости автоскана V8, 
 * но рантайм GEN III использует ленивый монтаж через IoC-монтажник slot_maker.js.
 */
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
    if (!pack || !pack.mdl || !pack.view) return false;
    
    const m = pack.mdl; 
    const intent = String(intentStr || "");
    let isMutated = false;

    switch (intent) {
        case "MOVE_CURSOR_DOWN":
            // Поддержка навигации и скроллинга по журналу логов
            if (m.viewportOffset !== undefined) {
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
            if (currentTx && currentTx.P3) {
                const logString = String(currentTx.P3);
                
                // ИСПРАВЛЕНИЕ: Пишем строго в преаллоцированный logsArray (128 строк из slot_maker.js)
                if (Array.isArray(m.logsArray)) {
                    const currentTotal = Math.floor(m.totalLogsCount || 0);
                    const maxCapacity = Math.floor(m.maxLines || 128);
                    
                    if (currentTotal < maxCapacity) {
                        // Заполняем массив последовательно до лимита емкости
                        m.logsArray[currentTotal] = logString;
                        m.totalLogsCount = currentTotal + 1;
                    } else {
                        // Кольцевой циклический сдвиг буфера без аллокаций памяти и shift()
                        for (let i = 1; i < maxCapacity; i++) {
                            m.logsArray[i - 1] = m.logsArray[i];
                        }
                        m.logsArray[maxCapacity - 1] = logString;
                    }
                    
                    // ИСПРАВЛЕНИЕ: Прямой I/O вызов fs.appendFileSync полностью удален.
                    // Все аппаратные и системные прерывания ввода-вывода логируются
                    // параллельно и неблокирующим образом на уровне tty_byte_sniffer.js.
                    
                    m._isDirty = true; 
                    isMutated = true;
                }
            }
            break;
            
        case "UPDATE_THEME_MASK":
            m._isDirty = true;
            isMutated = true;
            break;
    }
    return isMutated;
}
