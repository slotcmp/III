/**
 * @file src/io/terminal/tty_byte_scanner.js
 * @version 6.8.7-RELEASE-SMO-SCANNER-KEYLOGS-PURE-DOD
 * @description Низкоуровневый посимвольный автомат разбора ANSI/ESC/CSI байтовых потоков ввода.
 * Осуществляет динамическое вычисление фокуса панелей по полю displayIndex без хардкода.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { _scannerState } from "./tty_scanner_state.js";
import { processSgrMouseState } from "./tty_mouse_decoder.js";
import { generateGpssTransaction } from "../../core/smo/bus.js";
import { dumpKeyboardChunk } from "./tty_byte_sniffer.js";
import { forceInvalidateShadowCanvas } from "./flusher.js";

/**
 * Маршалинг и декомпозиция сырых чанков stdin буфера в тактовые транзакты СМО
 * @param {Buffer} bufferChunk Сырой буфер байт из дескриптора ввода
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 */
export function scanTtyBytes(bufferChunk, kernel) {
    if (!bufferChunk || bufferChunk.length === 0 || !kernel) return;
    const totalBytes = bufferChunk.length;
    const focusedSlotIdStr = String(kernel.model?.logicalState?.focusedSlotId || "105");
    const chunkString = bufferChunk.toString("utf8");
    
    if (kernel.model?.logicalState?.appSettings?.ttni?.bKeyLogBypass !== true) {
        dumpKeyboardChunk(kernel, bufferChunk, chunkString, _scannerState.state);
    }
    
    for (let i = 0; i < totalBytes; i++) {
        const byte = bufferChunk[i];
        if (byte === 0x03) {
            process.stdout.write("\x1b[?1049l\x1b[?1003l\x1b[?1006l\x1b[?25h\x1b[0m\x1b[2J\x1b[H");
            process.exit(0);
        }
        switch (_scannerState.state) {
            case 0: _processBaseStreamState(byte, focusedSlotIdStr, kernel); break;
            case 1: _processEscPrefixState(byte, kernel); break;
            case 2: _processCsiState(byte, focusedSlotIdStr, kernel); break;
            case 4: processSgrMouseState(byte, kernel); break;
            default: _scannerState.state = 0; break;
        }
    }
}

function _processBaseStreamState(byte, focusedSlotIdStr, kernel) {
    if (byte === 0x1b) { 
        _scannerState.state = 1; 
        _scannerState.pendingUtf8LeadByte = 0; 
        return; 
    }
    if (byte === 0x0d || byte === 0x0a) {
        _scannerState.pendingUtf8LeadByte = 0;
        generateGpssTransaction(focusedSlotIdStr, "ENTER_PRESSED", null);
        return;
    }
    if (byte === 0x7f || byte === 0x08) {
        _scannerState.pendingUtf8LeadByte = 0;
        generateGpssTransaction(focusedSlotIdStr, "BACKSPACE_PRESSED", null);
        return;
    }
    if (byte === 0x09) {
        _scannerState.pendingUtf8LeadByte = 0;
        generateGpssTransaction(focusedSlotIdStr, "ROTATE_SLOT_STACK", null);
        return;
    }
    if (byte >= 0x20 && byte < 0x7f) {
        _scannerState.pendingUtf8LeadByte = 0;
        generateGpssTransaction(focusedSlotIdStr, "KEY_PRESSED", { char: String.fromCharCode(byte) });
    } else if (byte === 0xd0 || byte === 0xd1) {
        _scannerState.pendingUtf8LeadByte = byte;
    } else if (_scannerState.pendingUtf8LeadByte > 0 && byte >= 0x80 && byte <= 0xbf) {
        const unicodeCode = ((_scannerState.pendingUtf8LeadByte & 0x1f) << 6) | (byte & 0x3f);
        _scannerState.pendingUtf8LeadByte = 0;
        generateGpssTransaction(focusedSlotIdStr, "KEY_PRESSED", { char: String.fromCharCode(unicodeCode) });
    }
}

function _processEscPrefixState(byte, kernel) {
    if (byte === 0x5b) {
        _scannerState.state = 2;
        _scannerState.kbdLen = 0;
    } else {
        _scannerState.state = 0;
        
        // ДИНАМИЧЕСКИЙ ДЕКОДЕР ALT + 1..6: Полное исключение хардкода по Манифесту
        if (byte >= 0x31 && byte <= 0x36 && kernel.model?.logicalState?.panelRegistry) {
            const requestedDisplayIndex = byte - 0x30; // Переводим ASCII-символ цифры в integer 1..6
            const registry = kernel.model.logicalState.panelRegistry;
            const keys = Object.keys(registry);
            let targetSlotIdStr = "";
            
            // Находим целевой прибор на лету по его displayIndex
            for (let i = 0; i < keys.length; i++) {
                const id = keys[i];
                if (registry[id] && registry[id].displayIndex === requestedDisplayIndex) {
                    targetSlotIdStr = id;
                    break;
                }
            }
            
            if (targetSlotIdStr.length > 0) {
                kernel.model.logicalState.focusedSlotId = targetSlotIdStr;
                if (typeof forceInvalidateShadowCanvas === "function") forceInvalidateShadowCanvas();
                if (typeof kernel.executeViewportBlit === "function") kernel.executeViewportBlit();
            }
        }
    }
}

function _processCsiState(byte, focusedSlotIdStr, kernel) {
    if (byte === 0x3c) {
        _scannerState.state = 4;
        _scannerState.btn = 0; 
        _scannerState.mX = 0; 
        _scannerState.mY = 0; 
        _scannerState.partIdx = 0;
        return;
    }
    if (byte === 0x41 || byte === 0x42) {
        _scannerState.state = 0;
        const cmd = (byte === 0x41) ? "MOVE_CURSOR_UP" : "MOVE_CURSOR_DOWN";
        generateGpssTransaction(focusedSlotIdStr, cmd, null);
        return;
    }
    if (byte === 0x7e || (byte >= 0x41 && byte <= 0x5a) || (byte >= 0x61 && byte <= 0x7a)) {
        _scannerState.state = 0;
        return;
    }
    if (_scannerState.kbdLen < 16) {
        _scannerState.kbdBuffer[_scannerState.kbdLen++] = byte;
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_byte_scanner.js
 * Время модификации: 18.08.2026 17:42:01 MSK
 */
