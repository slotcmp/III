/**
 * @file src/io/terminal/tty_byte_sniffer.js
 * @version 3.9.8-RELEASE-SMI-DIRECT-HARDWARE-SNIFFER-SILENCED
 * @description Изолированный низкоуровневый логгер-экранировщик байтового ввода (PAC / Abstraction).
 * ИСПРАВЛЕН СПАМ: Деятельность сниффера полностью придушена на входе для ликвидации файла smo.log.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% GC.
 */

import fs from "node:fs";

// Преаллоцированный статический буфер для записи дампов без Garbage Collection
const _staticSnifferByteBuffer = new Uint8Array(65536);
const BUFFER_LIMIT = 65536 - 128; // Оставляем безопасный зазор под футер

/**
 * Перехватывает сырой буфер process.stdin и атомарно выжигает HEX-дамп в файл на диске
 * @param {Buffer|Uint8Array} bufferChunk Сырой буфер байт из дескриптора ввода
 */
export function dumpIncomingHardwareBytes(bufferChunk) {
    // =================================================================
    // ИСПРАВЛЕНИЕ: ЖЕСТКАЯ ЗАГЛУШКА НИЗКОУРОВНЕВОГО СНИФФЕРА ТЕРМИНАЛА
    // =================================================================
    // Пассивно гасим такты, полностью освобождая Event Loop от дискового I/O
    return;

    if (!bufferChunk) return;

    const totalBytes = bufferChunk.length;
    if (totalBytes === 0) return;

    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");

    const buf = _staticSnifferByteBuffer;
    let ptr = 0;

    const headerStr = "\n============================================================\n" +
                      "[" + h + ":" + m + ":" + s + "." + ms + " Msk] [TTY_HARDWARE_SNIFFER] Перехвачен чанк ввода\n" +
                      "Всего байт в потоке: " + totalBytes + "\n" +
                      "------------------------------------------------------------\nASCII След: '";
    for (let i = 0; i < headerStr.length; i++) buf[ptr++] = headerStr.charCodeAt(i);

    // 1. ПОСИМВОЛЬНОЕ БЕЗАЛЛОКАЦИОННОЕ ЭКРАНИРОВАНИЕ ASCII
    for (let i = 0; i < totalBytes; i++) {
        if (ptr >= BUFFER_LIMIT) break; // Защитный барьер переполнения

        const b = bufferChunk[i];
        if (b === 0x1B) {
            buf[ptr++] = 0x5E; buf[ptr++] = 0x5B; 
        } else if (b === 0x7F) {
            const t = "<BACKSPACE>"; for (let j = 0; j < t.length; j++) buf[ptr++] = t.charCodeAt(j);
        } else if (b === 0x0D) {
            const t = "<ENTER_CR>"; for (let j = 0; j < t.length; j++) buf[ptr++] = t.charCodeAt(j);
        } else if (b === 0x0A) {
            const t = "<ENTER_LF>"; for (let j = 0; j < t.length; j++) buf[ptr++] = t.charCodeAt(j);
        } else if (b === 0x09) {
            const t = "<TAB>"; for (let j = 0; j < t.length; j++) buf[ptr++] = t.charCodeAt(j);
        } else if (b >= 0x20 && b <= 0x7E) {
            buf[ptr++] = b;
        } else {
            buf[ptr++] = 0x5C; buf[ptr++] = 0x78; 
            const h1 = (b >> 4) & 0x0F;
            const h2 = b & 0x0F;
            buf[ptr++] = h1 < 10 ? 48 + h1 : 87 + h1;
            buf[ptr++] = h2 < 10 ? 48 + h2 : 87 + h2;
        }
    }

    buf[ptr++] = 0x27; buf[ptr++] = 0x0A; 

    // 2. СЕКЦИЯ ПОБАЙТОВОЙ ВЕКТОРИЗАЦИИ С ГВАРДОМ ЕМКОСТИ БУФЕРА
    for (let idx = 0; idx < totalBytes; idx++) {
        if (ptr >= BUFFER_LIMIT) break; 

        const currentByte = bufferChunk[idx];
        const itemHeaderStr = "  -> Байт #" + idx + ": 0x";
        for (let i = 0; i < itemHeaderStr.length; i++) buf[ptr++] = itemHeaderStr.charCodeAt(i);

        const h1 = (currentByte >> 4) & 0x0F;
        const h2 = currentByte & 0x0F;
        buf[ptr++] = h1 < 10 ? 48 + h1 : 87 + h1;
        buf[ptr++] = h2 < 10 ? 48 + h2 : 87 + h2;

        const decStr = " (DEC: " + String(currentByte).padStart(3, " ") + ") \n";
        for (let i = 0; i < decStr.length; i++) buf[ptr++] = decStr.charCodeAt(i);
    }

    const footerStr = "============================================================\n";
    for (let i = 0; i < footerStr.length; i++) buf[ptr++] = footerStr.charCodeAt(i);

    const logFd = fs.openSync("./smo.log", "a");
    fs.writeSync(logFd, buf, 0, ptr, null);
    fs.closeSync(logFd);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_byte_sniffer.js
 * Время изменения: 09.09.2026 15:35:00 MSK
 */
