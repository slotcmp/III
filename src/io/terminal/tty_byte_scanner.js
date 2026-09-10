
/**
 * @file src/io/terminal/tty_byte_scanner.js
 * @version 3.9.5-RELEASE-SMO-BYTE-SCANNER-SNIFFER-HYDRATED
 * @description Посимвольный конечный автомат разбора байт TTY (Control-контур).
 * ИСПРАВЛЕНО КОЛЕСИКО: Инжектирован низкоуровневый TTY-сниффер для дампа масок мыши.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { _scannerState } from "./tty_scanner_state.js";
import { processSgrMouseState } from "./tty_mouse_decoder.js";
import { dumpIncomingHardwareBytes } from "./tty_byte_sniffer.js"; // Импортируем сниффер

const _staticTokenBuffer = Buffer.alloc(4);

/**
 * Побайтовый разбор чанков ввода дескриптора stdin
 */
export function scanTtyBytes(rawKeyBuffer, kernel) {
    if (!rawKeyBuffer || !kernel) return;

    // =================================================================
    // ВРЕМЕННЫЙ DOD-ПЕРЕХВАТ ДЛЯ ДИАГНОСТИКИ КОЛЕСИКА МЫШИ
    // =================================================================
    dumpIncomingHardwareBytes(rawKeyBuffer);

    const len = rawKeyBuffer.length;
    const st = _scannerState;

    for (let i = 0; i < len; i++) {
        const b = rawKeyBuffer[i];

        const targetBusModuleUrlStr = new URL("../../core/smo/bus.js", import.meta.url).href;
        
        if (b === 0x00) {
            import(targetBusModuleUrlStr).then((bus) => {
                if (bus && typeof bus.generateGpssTransaction === "function") {
                    bus.generateGpssTransaction("101", "ANIMATION_TICK", null, "4");
                    bus.generateGpssTransaction("1", "EXECUTE_RENDER", null, "4");
                }
            });
            continue; 
        }

        if (b === 0x03) {
            if (process.stdout) {
                process.stdout.write("\x1b[?1049l\x1b[?1003l\x1b[?1006l\x1b[?25h\x1b[0m\n");
            }
            process.exit(0);
        }

        if (st.state === 0) {
            if (b === 0x1B) {
                st.state = 1; 
                continue;
            }

            if (st.utf8Expected === 0) {
                if ((b & 0x80) === 0x00) {
                    _dispatchKeyToken(b, String.fromCharCode(b), kernel);
                } else if ((b & 0xE0) === 0xC0) {
                    st.utf8Buffer[0] = b; st.utf8Length = 1; st.utf8Expected = 2;
                } else if ((b & 0xF0) === 0xE0) {
                    st.utf8Buffer[0] = b; st.utf8Length = 1; st.utf8Expected = 3;
                } else if ((b & 0xF8) === 0xF0) {
                    st.utf8Buffer[0] = b; st.utf8Length = 1; st.utf8Expected = 4;
                }
            } else {
                st.utf8Buffer[st.utf8Length++] = b;
                
                if (st.utf8Length === st.utf8Expected) {
                    for (let j = 0; j < st.utf8Expected; j++) {
                        _staticTokenBuffer[j] = st.utf8Buffer[j];
                    }
                    
                    const assembledCharStr = _staticTokenBuffer.toString("utf8", 0, st.utf8Expected);
                    st.utf8Expected = 0; st.utf8Length = 0;
                    
                    _dispatchKeyToken(0, assembledCharStr, kernel);
                }
            }
            continue;
        }

        if (st.state === 1) {
            if (b === 0x5B) {
                st.state = 2; 
            } else {
                const altCharToken = String.fromCharCode(b).toLowerCase();
                _dispatchKeyToken(0x1B, "alt+" + altCharToken, kernel);
                st.state = 0; 
            }
            continue;
        }

        if (st.state === 2) {
            if (b === 0x3C) {
                st.state = 4; 
                st._paramIdx = 0; st.btnCode = 0; st.mX = 0; st.mY = 0;
            } else {
                const arrowChar = String.fromCharCode(b);
                let arrowName = "";
                if (arrowChar === "A") arrowName = "up";
                else if (arrowChar === "B") arrowName = "down";
                else if (arrowChar === "C") arrowName = "right";
                else if (arrowChar === "D") arrowName = "left";

                if (arrowName.length > 0) {
                    _dispatchKeyToken(0, arrowName, kernel);
                }
                st.state = 0;
            }
            continue;
        }

        if (st.state === 4) {
            processSgrMouseState(b, kernel);
        }
    }
}

function _dispatchKeyToken(rawByteNum, charTokenStr, kernel) {
    let nameToken = charTokenStr.toLowerCase();
    let sequenceStr = charTokenStr;

    if (rawByteNum === 0x7F || nameToken === "backspace") { nameToken = "backspace"; sequenceStr = ""; }
    else if (rawByteNum === 0x0D || rawByteNum === 0x0A || nameToken === "enter" || nameToken === "return") { nameToken = "enter"; sequenceStr = "\n"; }
    else if (rawByteNum === 0x09 || nameToken === "tab") { nameToken = "tab"; sequenceStr = "\t"; }

    const focusedId = String(kernel.model?.logicalState?.focusedSlotId || "105");
    const kbdPayload = { name: nameToken, sequence: sequenceStr };
    Object.preventExtensions(kbdPayload);
    
    if (kernel.workerGateway && typeof kernel.workerGateway.triggerKeyboardBufferParsing === "function") {
        kernel.workerGateway.triggerKeyboardBufferParsing(focusedId, kbdPayload);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_byte_scanner.js
 * Время изменения: 06.09.2026 18:24:10 MSK
 */