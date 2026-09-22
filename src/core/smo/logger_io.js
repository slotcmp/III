/**
 * @file src/core/smo/logger_io.js
 * @version 2.2.1-RELEASE-SMO-LOGGER-IO-MKDIR-FIXED
 * @description Низкоуровневый атомарный упаковщик дисковых потоков логирования СМО.
 * ИСПРАВЛЕН КРАШ ПУТИ: Добавлено атомарное рекурсивное создание папки logs перед fs.openSync.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import fs from "node:fs";
import path from "node:path";

const RESOLVED_LOGS_DIR = path.resolve(process.cwd(), "./logs");
// ИСПРАВЛЕНИЕ: Гарантируем физическое наличие директории до открытия дескриптора
if (!fs.existsSync(RESOLVED_LOGS_DIR)) {
    fs.mkdirSync(RESOLVED_LOGS_DIR, { recursive: true });
}

const FD_CORE = fs.openSync(path.resolve(RESOLVED_LOGS_DIR, "smo_core.log"), "a");
//console.log("RESOLVED_LOGS_DIR=",RESOLVED_LOGS_DIR);process.exit(1);

const _staticLogByteBuffer = new Uint8Array(65536);
const _staticLogEncoderBuffer = Buffer.alloc(65536);

/**
 * Инлайновая запись системного сообщения в дескриптор ядра (0% GC)
 */
export function writeCoreLogMessageInline(messageStr) {
    if (!messageStr || messageStr.length === 0) return;

    const cleanStr = String(messageStr);
    const bytesWritten = _staticLogEncoderBuffer.write(cleanStr, 0, "utf8");

    for (let i = 0; i < bytesWritten; i++) {
        _staticLogByteBuffer[i] = _staticLogEncoderBuffer[i];
    }

    // Пишем строго в один файл ядра, дублирующий поток убран
    fs.writeSync(FD_CORE, _staticLogByteBuffer, 0, bytesWritten, null);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/logger_io.js
 * Время изменения: 09.09.2026 15:26:10 MSK
 */
