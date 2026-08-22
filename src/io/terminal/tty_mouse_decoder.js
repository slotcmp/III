/**
 * @file src/io/terminal/tty_mouse_decoder.js
 * @version 2.5.3-RELEASE-GOLDEN-MONOMORPHIC
 * @description Мономорфный посимвольный декодер SGR-пакетов мыши (PAC / Control-контур).
 * ИСПРАВЛЕНА АДРЕСАЦИЯ: Имена регистров синхронизированы со стейтом tty_byte_scanner.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { _scannerState } from "./tty_byte_scanner.js";
import { parseAndDispatchSgr } from "./tty_mouse_parser.js";

/**
 * Разбор параметров "button;X;Y" SGR-пакета мыши в потоке ввода терминала
 * @param {number} byte Текущий считываемый байт из чанка ввода stdin
 * @param {Object} kernel Ссылка на ОЗУ-рантайм ядра хоста
 */
export function processSgrMouseState(byte, kernel) {
    // ИСПРАВЛЕНИЕ: Читаем и мутируем канонический регистр _paramIdx из tty_byte_scanner.js
    if (byte === 0x3b) { 
        _scannerState._paramIdx++; 
        return; 
    }
    
    // Высокоскоростной посимвольный сбор числовых разрядов координат (Zero Allocation)
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
    
    // Финализирующие маркеры SGR-пакета: 'M' (нажатие/перемещение), 'm' (отпускание)
    if (byte === 0x4d || byte === 0x6d) {
        // Копируем накопленные примитивы из ОЗУ перед атомарным DOD-сбросом
        const finalBtn = _scannerState.btnCode;
        const finalX = _scannerState.mX;
        const finalY = _scannerState.mY;
        const isReleaseBool = (byte === 0x6d);

        // АТОМАРНЫЙ DOD-СБРОС РЕГИСТРОВ НАКОПЛЕНИЯ ПЕРЕД СЛЕДУЮЩИМ ПРЕРЫВАНИЕМ МЫШИ
        // Поля стейта очищаются in-place без изменения Hidden Class формы объекта
        _scannerState.state = 0;
        _scannerState.btnCode = 0;
        _scannerState.mX = 0;
        _scannerState.mY = 0;
        _scannerState._paramIdx = 0;
        _scannerState.isRelease = isReleaseBool;

        // Выстреливаем очищенные и векторизованные координаты в хит-тест флекс-сетки
        if (typeof parseAndDispatchSgr === "function") {
            parseAndDispatchSgr(
                finalBtn, 
                finalX, 
                finalY, 
                isReleaseBool, 
                null, // staticSlots изъят как устаревший ООП-артефакт, СМО-приборы налиты в Map
                kernel
            );
        }
    }
}
