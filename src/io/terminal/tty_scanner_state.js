/**
 * @file src/io/terminal/tty_scanner_state.js
 * @version 2.6.0-RELEASE-GOLDEN-MONOMORPHIC-UTF8-ACCUMULATOR
 * @description Изолированные прецизионные ОЗУ-регистры автомата ввода (PAC / Abstraction-контур).
 * ИСПРАВЛЕНЫ КРАКОЗЯБРЫ: Добавлены регистры накопления многобайтовых байт UTF-8.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

export const _scannerState = {
    state: 0,
    btnCode: 0,
    mX: 0,
    mY: 0,
    isRelease: false,
    
    _paramIdx: 0,
    _chunkBuf0: "",
    _chunkBuf1: "",
    _chunkBuf2: "",

    // ИСПРАВЛЕНИЕ: Регистры для сборки UTF-8 символов без GC
    utf8Buffer: new Uint8Array(4),
    utf8Length: 0,
    utf8Expected: 0
};

Object.preventExtensions(_scannerState);

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_scanner_state.js
 * Время исправления: 03.09.2026 13:40:00 MSK
 */
