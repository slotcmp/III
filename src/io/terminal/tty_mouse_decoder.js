/**
 * @file src/io/terminal/tty_mouse_decoder.js
 * @version 2.5.2-RELEASE-GOLDEN-MONOMORPHIC
 * @description Мономорфный посимвольный декодер SGR-пакетов мыши (PAC / Control-контур).
 * Выполняет высокоскоростной разбор параметров координат без макрозадач и аллокаций строк.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { _scannerState } from "./tty_scanner_state.js";
import { parseAndDispatchSgr } from "./tty_mouse_parser.js";

/**
 * Разбор параметров "button;X;Y" SGR-пакета мыши в потоке ввода терминала
 * @param {number} byte Текущий считываемый байт из чанка ввода stdin
 * @param {Object} kernel Ссылка на ОЗУ-рантайм ядра хоста
 */
export function processSgrMouseState(byte, kernel) {
    // Если встретили разделитель ';', смещаем индекс считываемой части координат
    if (byte === 0x3b) { 
        _scannerState.partIdx++; 
        return; 
    }
    
    // Аккумулируем числовые разряды координат X, Y и кода кнопки
    if (byte >= 0x30 && byte <= 0x39) {
        const d = byte - 0x30;
        if (_scannerState.partIdx === 0) {
            _scannerState.btn = (_scannerState.btn * 10) + d;
        } else if (_scannerState.partIdx === 1) {
            _scannerState.mX = (_scannerState.mX * 10) + d;
        } else if (_scannerState.partIdx === 2) {
            _scannerState.mY = (_scannerState.mY * 10) + d;
        }
        return;
    }
    
    // Финализирующие маркеры SGR-пакета: 'M' (нажатие/перемещение), 'm' (отпускание)
    if (byte === 0x4d || byte === 0x6d) {
        // Запоминаем текущие значения в ОЗУ для вызова парсера
        const finalBtn = _scannerState.btn;
        const finalX = _scannerState.mX;
        const finalY = _scannerState.mY;

        // АТОМАРНЫЙ DOD-СБРОС: Полностью очищаем регистры накопления для следующего клика
        _scannerState.state = 0;
        _scannerState.btn = 0;
        _scannerState.mX = 0;
        _scannerState.mY = 0;
        _scannerState.partIdx = 0;

        // Выстреливаем очищенные координаты в хит-тест флекс-сетки
        if (typeof parseAndDispatchSgr === "function") {
            parseAndDispatchSgr(
                finalBtn, 
                finalX, 
                finalY, 
                byte === 0x6d, 
                _scannerState.staticSlots, 
                kernel
            );
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_mouse_decoder.js
 * Время модификации: 18.08.2026 17:55:10 MSK
 */
