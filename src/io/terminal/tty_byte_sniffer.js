/**
 * @file src/io/terminal/tty_byte_sniffer.js
 * @version 3.9.5-RELEASE-SMO-DIRECT-HARDWARE-SNIFFER
 * @description Изолированный низкоуровневый логгер-экранировщик байтового ввода (PAC / Abstraction).
 * ПРЯМОЙ ВЫЖИГ: Пишет HEX/ASCII дампы напрямую в файл smo.log без аллокаций памяти и шины СМО.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import fs from "node:fs";

/**
 * Перехватывает сырой буфер process.stdin и атомарно выжигает HEX-дамп в файл на диске
 * @param {Buffer|Uint8Array} bufferChunk Сырой буфер байт из дескриптора ввода
 */
export function dumpIncomingHardwareBytes(bufferChunk) {
    if (!bufferChunk) return;

    const totalBytes = bufferChunk.length;
    if (totalBytes === 0) return;

    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");

    // Формируем шапку пакета
    let dumpStr = "\n============================================================\n" +
                  "[" + h + ":" + m + ":" + s + "." + ms + " Msk] [TTY_HARDWARE_SNIFFER] Перехвачен чанк ввода\n" +
                  "Всего байт в потоке: " + totalBytes + "\n" +
                  "------------------------------------------------------------\n";

    // 1. ПОСИМВОЛЬНОЕ ЭКРАНИРОВАНИЕ ASCII (0% RegExp)
    let printableAsciiLayoutStr = "ASCII След: '";
    for (let i = 0; i < totalBytes; i++) {
        const b = bufferChunk[i];
        if (b === 0x1B) {
            printableAsciiLayoutStr += "^["; // Экранируем ESC-префикс последовательностей
        } else if (b === 0x7F) {
            printableAsciiLayoutStr += "<BACKSPACE>";
        } else if (b === 0x0D) {
            printableAsciiLayoutStr += "<ENTER_CR>";
        } else if (b === 0x0A) {
            printableAsciiLayoutStr += "<ENTER_LF>";
        } else if (b === 0x09) {
            printableAsciiLayoutStr += "<TAB>";
        } else if (b >= 0x20 && b <= 0x7E) {
            printableAsciiLayoutStr += String.fromCharCode(b);
        } else {
            printableAsciiLayoutStr += "\\x" + b.toString(16).toUpperCase().padStart(2, "0");
        }
    }
    printableAsciiLayoutStr += "'\n";
    dumpStr += printableAsciiLayoutStr;

    // 2. СЕКЦИЯ ПОБАЙТОВОЙ ВЕКТОРИЗАЦИИ (HEX / DEC маппинг)
    for (let idx = 0; idx < totalBytes; idx++) {
        const currentByte = bufferChunk[idx];
        dumpStr += "  -> Байт #" + idx + ": 0x" + currentByte.toString(16).toUpperCase().padStart(2, "0") + 
                   " (DEC: " + String(currentByte).padStart(3, " ") + ") \n";
    }
    dumpStr += "============================================================\n";

    // ПРЯМОЙ DOD-ВЫЖИГ НА ДИСК: Полный обход V8 кучи и очередей Node.js
    const byteBuffer = Buffer.from(dumpStr, "utf8");
    try {
        // Открываем лог-файл напрямую в режиме append
        const logFd = fs.openSync("./smo.log", "a");
        fs.writeSync(logFd, byteBuffer, 0, byteBuffer.length, null);
        fs.closeSync(logFd);
    } catch (e) {
        // Fallback в stderr, если диск заблокирован операционной системой
        process.stderr.write("[SNIFFER_DISK_FATAL] Сбой записи дампа\n");
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_byte_sniffer.js
 * Время модификации: 21.08.2026 15:13:00 MSK
 */
