/**
 * @file: src/io/terminal/tty_byte_scanner.js
 * @path: C:\slotcmd_3\src\io\terminal\tty_byte_scanner.js
 * @version: 2.5.1-RELEASE-GOLDEN-MONOMORPHIC
 * @description: Эталoнный диспетчер ANSI-потока ввода. Исправлен парсинг SGR-метки мыши '<' (0% RegExp, No BOM, 0% Class).
 * @revision: #0818-SCANNER-STRICT-SGR-FIXED
 */
import { _scannerState } from "./tty_scanner_state.js";
import { processSgrMouseState } from "./tty_mouse_decoder.js";
import { generateGpssTransaction } from "../../core/smo/bus.js";`nimport { dumpKeyboardChunk } from "./tty_byte_sniffer.js"; from "../../core/smo/bus.js";

export function scanTtyBytes(bufferChunk, kernel) {
    if (!bufferChunk || bufferChunk.length === 0 || !kernel) return;

    const totalBytes = bufferChunk.length;
    const focusedSlotIdStr = String(kernel.model?.logicalState?.focusedSlotId || "105");

    for (let i = 0; i < totalBytes; i++) {
        const byte = bufferChunk[i];

        if (byte === 0x03) {
            process.stdout.write("\x1b[?1049l\x1b[?1003l\x1b[?1006l\x1b[0m\x1b[2J\x1b[H");
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
    if (byte === 0x1b) { _scannerState.state = 1; _scannerState.pendingUtf8LeadByte = 0; return; } 
    
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
        
        let targetSlotIdStr = "";
        if (byte === 0x31) targetSlotIdStr = "101";
        else if (byte === 0x32) targetSlotIdStr = "102";
        else if (byte === 0x33) targetSlotIdStr = "103";
        else if (byte === 0x34) targetSlotIdStr = "106";
        else if (byte === 0x35) targetSlotIdStr = "105";
        else if (byte === 0x36) targetSlotIdStr = "108";

        if (targetSlotIdStr.length > 0 && kernel.model?.logicalState) {
            kernel.model.logicalState.focusedSlotId = targetSlotIdStr;
            generateGpssTransaction("0", "UPDATE_VIEW", null); 
        }
    }
}

function _processCsiState(byte, focusedSlotIdStr, kernel) {
    // ИСПРАВЛЕНО: При обнаружении символа '<' (0x3c) превентивно переходим в мышиное состояние 4
    if (byte === 0x3c) { 
        _scannerState.state = 4; 
        _scannerState.btn = 0; _scannerState.mX = 0; _scannerState.mY = 0; _scannerState.partIdx = 0; 
        return; 
    } 
    
    // Перехват стрелок UP (0x41) и DOWN (0x42)
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
