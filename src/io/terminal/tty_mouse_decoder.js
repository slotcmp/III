/**
 * @file src/io/terminal/tty_mouse_decoder.js
 * @version 2.5.5-RELEASE-SMO-MOUSE-DECOUPLED-COORDS-PRESERVED
 * @description Мономорфный посимвольный декодер SGR-пакетов мыши (PAC / Control-контур).
 * ИСПРАВЛЕНО: Удалено преждевременное затирание координат mX и mY при отпускании кнопки (m).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { _scannerState } from "./tty_scanner_state.js";
import { parseAndDispatchSgr } from "./tty_mouse_parser.js";

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
    
    // М — нажатие / скролл, m — отпускание кнопки
    if (byte === 0x4d || byte === 0x6d) {
        const finalBtn = _scannerState.btnCode;
        const finalX = _scannerState.mX;
        const finalY = _scannerState.mY;
        const isReleaseBool = (byte === 0x6d);

        // Переводим автомат в базовое состояние готовности к новому пакету
        _scannerState.state = 0;
        _scannerState._paramIdx = 0;
        _scannerState.isRelease = isReleaseBool;

        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: СОХРАНЯЕМ КООРДИНАТЫ!
        // Мы больше НЕ зануляем _scannerState.mX и mY здесь в ноль,
        // позволяя асинхронной шине легитимно считать точку клика отпускания.
        // Они перезапишутся естественным образом при следующем движении/нажатии мыши.
        _scannerState.btnCode = 0; 

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
