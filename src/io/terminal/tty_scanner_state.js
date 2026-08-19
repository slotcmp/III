/**
 * @file src/io/terminal/tty_scanner_state.js
 * @version 2.5.0-RELEASE-GOLDEN-MONOMORPHIC
 * @description Изолированные прецизионные ОЗУ-регистры автомата ввода (PAC / Abstraction-контур).
 * Полностью очищен от хардкода статических слотов под каноны динамического 3-го форка.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Единый запечатанный плоский объект низкоуровневых регистров автомата ввода
 */
export const _scannerState = {
    state: 0, 
    btn: 0, 
    mX: 0, 
    mY: 0, 
    partIdx: 0,
    kbdBuffer: new Array(16), 
    kbdLen: 0,
    pendingUtf8LeadByte: 0 
};

// Прогрев байтового буфера накопления ESC-последовательностей
for (let i = 0; i < 16; i++) {
    _scannerState.kbdBuffer[i] = 0;
}

Object.preventExtensions(_scannerState);

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_scanner_state.js
 * Время модификации: 18.08.2026 17:55:45 MSK
 */
