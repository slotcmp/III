/**
 * @file src/modules/logger/logger_mdl.js
 * @version 3.0.2-RELEASE-SMO-LOGGER-MODEL-MONOMORPHIC
 * @description Мономорфная анемичная модель Журнала логов СМО (PAC / Abstraction-контур).
 * ИСПРАВЛЕНЫ СЛУЖЕБНЫЕ ФЛАГИ: Внедрены регистры грязи и подзоны для исключения TypeError на запечатанном объекте.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Фабрика аллокации запечатанного мономорфного состояния модели системного журнала
 * @returns {Object} Запечатанная структура модели данных
 */
export function createLoggerMdlInstance() {
    const maxLines = 128;
    const linesArr = new Array(maxLines);
    
    // Преаллоцируем пустые строковые регистры для исключения деоптимизации V8
    for (let i = 0; i < maxLines; i++) {
        linesArr[i] = "";
    }

    const mdlState = {
        maxLines: maxLines,
        logsArray: linesArr,
        totalLogsCount: 0,
        viewportOffset: 0,
        
        // Преаллоцированные служебные регистры Window Manager
        _isDirty: true,
        _activeSubZone: 1
    };

    Object.preventExtensions(mdlState);
    return mdlState;
}
