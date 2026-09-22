/**
 * @file src/io/terminal/tty_scanner_state.js
 * @version 2.6.1-RELEASE-SMO-SCANNER-STATE-STRICT-PREALLOCATED
 * @description Изолированные прецизионные ОЗУ-регистры автомата ввода (PAC / Abstraction-контур).
 * ИСПРАВЛЕНО: Ключ isRelease преаллоцирован в Hidden Class со старта бутстрапа,
 * что полностью ликвидирует TypeError: object is not extensible на строке 40.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

export const _scannerState = {
    state: 0,
    btnCode: 0,
    mX: 0,
    mY: 0,
    
    // ПРЕAЛЛОКАЦИЯ: Ключ жестко забит в структуру до preventExtensions
    isRelease: false, 
    
    _paramIdx: 0,
    _chunkBuf0: "",
    _chunkBuf1: "",
    _chunkBuf2: "",

    // Регистры для сборки UTF-8 символов без GC
    utf8Buffer: new Uint8Array(4),
    utf8Length: 0,
    utf8Expected: 0,

    // Регистры параметров для размоноличенного F-парсера
    _vtParamBuf: new Uint8Array(8),
    _vtParamLen: 0
};

// Намертво запечатываем мономорфный скрытый класс в куче V8
Object.preventExtensions(_scannerState);

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_scanner_state.js
 * Время исправления: 16.09.2026 18:35:00 MSK
 */
