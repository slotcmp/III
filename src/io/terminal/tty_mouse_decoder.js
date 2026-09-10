/**
 * @file src/io/terminal/tty_mouse_decoder.js
 * @version 2.5.4-RELEASE-GOLDEN-MONOMORPHIC-STATE-REDIRECT-FIXED
 * @description Мономорфный посимвольный декодер SGR-пакетов мыши (PAC / Control-контур).
 * ИСПРАВЛЕНА СИНТАКСИЧЕСКАЯ ОШИБКА: Импорт _scannerState перенаправлен на tty_scanner_state.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

// ИСПРАВЛЕНИЕ: Перенаправляем точку импорта регистра на изолированный стейт-файл
import { _scannerState } from "./tty_scanner_state.js";
import { parseAndDispatchSgr } from "./tty_mouse_parser.js";

/**
 * Разбор параметров "button;X;Y" SGR-пакета мыши в потоке ввода терминала
 * @param {number} byte Текущий считываемый байт из чанка ввода stdin
 * @param {Object} kernel Ссылка на ОЗУ-рантайм ядра хоста
 */
export function processSgrMouseState(byte, kernel) {
    if (byte === 0x3b) { 
        _scannerState._paramIdx++; 
        return; 
    }
    
    if (byte >= 0x30 && byte <= 0x39) {
        const d = byte - 0x30;
        if (_scannerState._paramIdx === 0) {
            _scannerState.btnCode = (_scannerState.btnCode * 10) + d;
        } else if (_scannerState._paramIdx === 1) {
            _scannerState.mX = (_scannerState.mX * 10) + d;
        } else if (_scannerState._paramIdx === 2) {
            _scannerState.mY = (_scannerState.mY * 10) + d;
        }
        return;
    }
    
    if (byte === 0x4d || byte === 0x6d) {
        const finalBtn = _scannerState.btnCode;
        const finalX = _scannerState.mX;
        const finalY = _scannerState.mY;
        const isReleaseBool = (byte === 0x6d);

        _scannerState.state = 0;
        _scannerState.btnCode = 0;
        _scannerState.mX = 0;
        _scannerState.mY = 0;
        _scannerState._paramIdx = 0;
        _scannerState.isRelease = isReleaseBool;

        if (typeof parseAndDispatchSgr === "function") {
            parseAndDispatchSgr(
                finalBtn, 
                finalX, 
                finalY, 
                isReleaseBool, 
                null, 
                kernel
            );
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_mouse_decoder.js
 * Время исправления: 03.09.2026 12:20:10 MSK
 */
