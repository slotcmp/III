/**
 * @file src/io/terminal/tty_byte_scanner.js
 * @version 4.1.2-RELEASE-SMO-BYTE-SCANNER-ROUTER-STRICT-DOD
 * @description Размоноличенный пассивный процедурный диспетчер побайтового ввода TTY.
 * ИСПРАВЛЕНО: Динамическая аллокация _vtParamBuf полностью удалена. Автомат переведен 
 * на чтение преаллоцированных регистров скрытого класса _scannerState.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { _scannerState } from "./tty_scanner_state.js";
import { processSgrMouseState } from "./tty_mouse_decoder.js";
import { dumpIncomingHardwareBytes } from "./tty_byte_sniffer.js"; 
import { reduceBasicAsciiAndUtf8 } from "./vectors/ascii_utf8_vector.js";
import { reduceAnsiEscapeState } from "./vectors/ansi_escape_vector.js";
import { reduceHardwareFKeysState } from "./vectors/hardware_fkeys_vector.js";

/**
 * Главный распределитель побайтового чанка ввода stdin
 */
export function scanTtyBytes(rawKeyBuffer, kernel) {
    if (!rawKeyBuffer || !kernel) return;

    dumpIncomingHardwareBytes(rawKeyBuffer);

    const len = rawKeyBuffer.length;
    const st = _scannerState;

    for (let i = 0; i < len; i++) {
        const b = rawKeyBuffer[i];

        if (b === 0x00) continue; 

        if (b === 0x03) {
            if (process.stdout) {
                process.stdout.write("\x1b[?1049l\x1b[?1003l\x1b[?1006l\x1b[?25h\x1b[0m\n");
            }
            process.exit(0);
        }

        // ПРЯМАЯ БЕЗАЛЛОКАЦИОННАЯ МАРШРУТИЗАЦИЯ ПО ВЕКТОРАМ ПРЕРЫВАНИЙ
        if (st.state === 0) {
            reduceBasicAsciiAndUtf8(b, st, kernel);
        } else if (st.state === 1 || st.state === 2) {
            reduceAnsiEscapeState(b, st, kernel);
        } else if (st.state === 4) {
            processSgrMouseState(b, kernel);
        } else if (st.state === 5 || st.state === 6) {
            reduceHardwareFKeysState(b, st, kernel);
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_byte_scanner.js
 * Время изменения: 16.09.2026 18:45:00 MSK
 */
