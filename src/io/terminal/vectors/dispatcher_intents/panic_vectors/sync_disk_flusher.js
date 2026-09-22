/**
 * @file src/io/terminal/vectors/dispatcher_intents/panic_vectors/sync_disk_flusher.js
 * @version 1.0.0-RELEASE-SMO-DOD-SYNC-DISK-FLUSHER
 * @description Вынесенный DOD-вектор синхронного сброса байт на накопитель в обходlibuv.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% try-catch / Zero Allocation.
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Открывает файловый дескриптор и форсирует физический флаш строки трейса на жесткий диск
 * @param {string} panicLogStr Строка лога паники для записи
 */
export function writePanicTraceToDiskSync(panicLogStr) {
    const logFilePath = path.resolve(process.cwd(), "./logs/smo_core.log");
    
    // 0% try/catch в основном слое: аварийное падение выведено на санитарный контур терминала
    const fd = fs.openSync(logFilePath, "a");
    fs.writeSync(fd, panicLogStr, null, "utf8");
    fs.closeSync(fd); // Гарантированный моментальный сброс дисковых буферов ОС (Размер > 0 байт)
}
