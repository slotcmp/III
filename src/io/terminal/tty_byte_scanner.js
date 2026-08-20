/**
 * @file src/io/terminal/tty_byte_scanner.js
 * @version 3.4.0-RELEASE-SMO-BYTE-SCANNER-LOGGING-STABLE
 * @description Посимвольный конечный автомат разбора байт TTY (Control-контур).
 * ИСПРАВЛЕНЫ ЛОГИ: Внедрена прямая фиксация нажатий в лог СМО до маршалинга.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { parseAndDispatchSgr } from "./tty_mouse_parser.js";
import { generateGpssTransaction } from "../../core/smo/bus.js";

// Плоский ОЗУ-регистр состояния парсера ( Hidden Class жестко зафиксирован )
export const _scannerState = {
    state: 0,
    btnCode: 0,
    mX: 0,
    mY: 0,
    isRelease: false,
    
    // Внутренние строковые накопители токенов SGR
    _paramIdx: 0,
    _chunkBuf0: "",
    _chunkBuf1: "",
    _chunkBuf2: ""
};
Object.preventExtensions(_scannerState);

/**
 * Главный побайтовый инжектор. Разбирает ASCII-поток клавиатуры и SGR-мыши
 * @param {Buffer|Uint8Array} rawKeyBuffer Сырой буфер байт от process.stdin
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 */
export function scanTtyBytes(rawKeyBuffer, kernel) {
    if (!rawKeyBuffer || !kernel) return;

    const len = rawKeyBuffer.length;
    const st = _scannerState;

    for (let i = 0; i < len; i++) {
        const b = rawKeyBuffer[i];

        // СОСТОЯНИЕ 0: Ожидание управляющего ESC-символа или обычный ввод букв
        if (st.state === 0) {
            if (b === 0x1B) {
                st.state = 1; // Поймали ESC-префикс последовательности
                continue;
            }
            
            const charToken = String.fromCharCode(b);
            const focusedId = String(kernel.model?.logicalState?.focusedSlotId || "105");
            
            const kbdPayload = { name: charToken.toLowerCase(), sequence: charToken };
            Object.preventExtensions(kbdPayload);
            
            // ПРЕЦИЗИОННАЯ ЗАПИСЬ В ЛОГ СМО: Фиксируем нажатие до ухода на шину
            const now = new Date();
            const h = String(now.getHours()).padStart(2, "0");
            const m = String(now.getMinutes()).padStart(2, "0");
            const s = String(now.getSeconds()).padStart(2, "0");

            const logLineStr = "[" + h + ":" + m + ":" + s + " Msk] [INPUT_KEYBOARD] Нажата клавиша (ASCII " + b + "): '" + charToken + "' | Направлено в Слот: " + focusedId + "\n";
            
            if (typeof generateGpssTransaction === "function") {
                generateGpssTransaction("108", "ADD_LOG_ENTRY", logLineStr);
            }
            
            // Отправляем транзакт на Канал 4 клавиатуры
            generateGpssTransaction("4", "PROCESS_KEYPRESS", kbdPayload);
            continue;
        }

        // СОСТОЯНИЕ 1: Ожидание CSI-префикса '[' (0x5B)
        if (st.state === 1) {
            if (b === 0x5B) {
                st.state = 2;
            } else {
                st.state = 0; // Сброс, одиночный ESC (например, кнопка Escape)
            }
            continue;
        }

        // СОСТОЯНИЕ 2: Детекция типа события (Мышь '<' или стрелки клавиатуры)
        if (st.state === 2) {
            if (b === 0x3C) {
                st.state = 4; // Поймали '<' — это SGR пакет мыши
                st._paramIdx = 0;
                st._chunkBuf0 = "";
                st._chunkBuf1 = "";
                st._chunkBuf2 = "";
            } else {
                // Стрелки клавиатуры или функциональные клавиши (F1-F12)
                const arrowChar = String.fromCharCode(b);
                let arrowName = "";
                if (arrowChar === "A") arrowName = "up";
                else if (arrowChar === "B") arrowName = "down";
                else if (arrowChar === "C") arrowName = "right";
                else if (arrowChar === "D") arrowName = "left";

                if (arrowName.length > 0) {
                    const arrowPayload = { name: arrowName, sequence: "\x1b[" + arrowChar };
                    Object.preventExtensions(arrowPayload);
                    generateGpssTransaction("4", "PROCESS_KEYPRESS", arrowPayload);
                }
                st.state = 0;
            }
            continue;
        }

        // СОСТОЯНИЕ 4: ПОСИМВОЛЬНЫЙ СБОР ПАРАМЕТРОВ SGR МЫШИ
        if (st.state === 4) {
            if (b === 0x3B) {
                st._paramIdx++;
                continue;
            }

            if (b === 0x4D || b === 0x6D) {
                st.isRelease = (b === 0x6D);
                
                st.btnCode = Math.max(0, parseInt(st._chunkBuf0, 10) || 0);
                st.mX = Math.max(1, parseInt(st._chunkBuf1, 10) || 1);
                st.mY = Math.max(1, parseInt(st._chunkBuf2, 10) || 1);

                parseAndDispatchSgr(st.btnCode, st.mX, st.mY, st.isRelease, null, kernel);

                st.state = 0;
                continue;
            }

            const digitChar = String.fromCharCode(b);
            if (st._paramIdx === 0) st._chunkBuf0 += digitChar;
            else if (st._paramIdx === 1) st._chunkBuf1 += digitChar;
            else if (st._paramIdx === 2) st._chunkBuf2 += digitChar;
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_byte_scanner.js
 * Время модификации: 20.08.2026 22:20:10 MSK
 */
