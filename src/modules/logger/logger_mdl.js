/**
 * @file src/modules/logger/logger_mdl.js
 * @version 3.0.1-RELEASE-SMO-LOGGER-MODEL-MONOMORPHIC
 * @description Мономорфная анемичная модель Журнала логов СМО (PAC / Abstraction-контур).
 * Реализует чистый высокоскоростной кольцевой ОЗУ-буфер строк фиксированной длины.
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
        _isDirty: true
    };

    Object.preventExtensions(mdlState);
    return mdlState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/logger/logger_mdl.js
 * Время модификации: 18.08.2026 19:35:45 MSK
 */
