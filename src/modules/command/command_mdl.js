/**
 * @file src/modules/command/command_mdl.js
 * @version 3.0.0-RELEASE-DOD-FORK
 * @description Мономорфная модель командной строки (PAC / Abstraction-контур).
 * Выполняет супер-прогрев регистров текстового буфера для кэш-локальности V8.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Фабрика аллокации запечатанного мономорфного состояния CLI-модели
 * @returns {Object} Запечатанный объект состояния модели
 */
export function createCommandMdlInstance() {
    const mdlState = {
        _isDirty: false,
        textLength: 0,
        cursorX: 0,
        charBuffer: new Array(256),
        
        // СУПЕР-ПРОГРЕВ: Поля явно объявлены на фазе аллокации до preventExtensions
        buffer: "",
        cursor: 0
    };

    // Заполняем символьный буфер пустыми знакоместами
    for (let i = 0; i < 256; i++) {
        mdlState.charBuffer[i] = " ";
    }

    Object.preventExtensions(mdlState);
    return mdlState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/command/command_mdl.js
 * Время модификации: 18.08.2026 17:25:10 MSK
 */
