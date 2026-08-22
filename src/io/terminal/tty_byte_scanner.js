/**
 * @file src/io/terminal/tty_byte_scanner.js
 * @version 3.8.1-RELEASE-SMO-BYTE-SCANNER-RAW-FIXED
 * @description Посимвольный конечный автомат разбора байт TTY (Control-контур).
 * ИСПРАВЛЕН ТОЛЧЕК ШИНЫ: Добавлен принудительный пинок реактивного цикла продвижения приборов.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { processSgrMouseState } from "./tty_mouse_decoder.js";

// Плоский ОЗУ-регистр состояния парсера (Hidden Class жестко зафиксирован)
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

        // КРИТИЧЕСКИЙ ГВАРД СИСТЕМНОГО СИГНАЛА: Перехват Ctrl+C (ASCII код 0x03)
        if (b === 0x03) {
            if (process.stdout) {
                process.stdout.write("\x1b[?1049l\x1b[?1003l\x1b[?1006l\x1b[?25h\x1b[0m\n");
            }
            process.exit(0);
        }

        // СОСТОЯНИЕ 0: Ожидание управляющего ESC-символа или обычный ввод букв
        if (st.state === 0) {
            if (b === 0x1B) {
                st.state = 1; // Поймали ESC-префикс последовательности
                continue;
            }
            
            let charToken = String.fromCharCode(b);
            let nameToken = charToken.toLowerCase();
            
            if (b === 0x7F) { nameToken = "backspace"; charToken = ""; }
            else if (b === 0x0D || b === 0x0A) { nameToken = "enter"; charToken = "\n"; }
            else if (b === 0x09) { nameToken = "tab"; charToken = "\t"; }

            const focusedId = String(kernel.model?.logicalState?.focusedSlotId || "105");
            const kbdPayload = { name: nameToken, sequence: charToken };
            Object.preventExtensions(kbdPayload);
            
            if (kernel.workerGateway && typeof kernel.workerGateway.triggerKeyboardBufferParsing === "function") {
                kernel.workerGateway.triggerKeyboardBufferParsing(focusedId, kbdPayload);
            }
            continue;
        }

        // СОСТОЯНИЕ 1: Ожидание CSI-префикса '[' (0x5B) ИЛИ разбор Alt+ клавиши
        if (st.state === 1) {
            if (b === 0x5B) {
                st.state = 2; // Переходим к разбору мыши/стрелок
            } else {
                const altCharToken = String.fromCharCode(b).toLowerCase();
                const focusedId = String(kernel.model?.logicalState?.focusedSlotId || "105");
                
                const altPayload = { name: "alt+" + altCharToken, sequence: "\x1b" + altCharToken };
                Object.preventExtensions(altPayload);

                if (kernel.workerGateway && typeof kernel.workerGateway.triggerKeyboardBufferParsing === "function") {
                    kernel.workerGateway.triggerKeyboardBufferParsing(focusedId, altPayload);
                }
                st.state = 0; 
            }
            continue;
        }

        // СОСТОЯНИЕ 2: Детекция типа события (Мышь '<' или стрелки клавиатуры)
        if (st.state === 2) {
            if (b === 0x3C) {
                st.state = 4; // Поймали '<' — это SGR пакет мыши
                st._paramIdx = 0;
                st.btnCode = 0;
                st.mX = 0;
                st.mY = 0;
            } else {
                const arrowChar = String.fromCharCode(b);
                let arrowName = "";
                if (arrowChar === "A") arrowName = "up";
                else if (arrowChar === "B") arrowName = "down";
                else if (arrowChar === "C") arrowName = "right";
                else if (arrowChar === "D") arrowName = "left";

                if (arrowName.length > 0) {
                    const arrowPayload = { name: arrowName, sequence: "" };
                    Object.preventExtensions(arrowPayload);
                    
                    if (kernel.workerGateway && typeof kernel.workerGateway.triggerKeyboardBufferParsing === "function") {
                        kernel.workerGateway.triggerKeyboardBufferParsing(String(kernel.model?.logicalState?.focusedSlotId || "105"), arrowPayload);
                    }
                }
                st.state = 0;
            }
            continue;
        }

        // СОСТОЯНИЕ 4: ДЕЛЕГИРУЕМ ВЕКТОРИЗОВАННОМУ ДЕКОДЕРУ МЫШИ
        if (st.state === 4) {
            // Передаем байт в мономорфный декодер
            processSgrMouseState(b, kernel);
        }
    }
}
