/**
 * @file src/io/terminal/tty_byte_sniffer.js
 * @version 2.5.0-RELEASE-GOLDEN-MONOMORPHIC
 * @description Выделенный утилитарный логгер потока байтового ввода (PAC / Abstraction).
 * Выполняет экранирование управляющих символов и дамп пакетов без регулярных выражений.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import fs from "node:fs";
import { _kernelContext } from "../../core/smo/bus.js";

/**
 * Превентивный гвард для безопасной записи дампов в динамический лог-файл
 */
function appendSnifferLogGuard(messageStr) {
    const targetLogPath = _kernelContext.logPath;
    if (!targetLogPath) return; // Раннее гашение, если ОЗУ-контекст ядра еще не готов
    fs.appendFileSync(targetLogPath, messageStr, "utf8");
}

/**
 * Формирование детального дампа ANSI-пакета ввода в дисковый лог без использования RegExp
 * @param {Object} kernel Ссылка на ОЗУ-рантайм ядра хоста
 * @param {Buffer} bufferChunk Сырой буфер байт из дескриптора ввода
 * @param {string} chunkString Строковое представление чанка
 * @param {number} currentStateNum Текущее состояние автомата сканера
 */
export function dumpKeyboardChunk(kernel, bufferChunk, chunkString, currentStateNum) {
    if (!bufferChunk || !kernel) return;

    const totalBytes = bufferChunk.length;
    const rawString = String(chunkString || "");
    const strLen = rawString.length;
    let escapedChunkStr = "";

    // БЕЗАЛЛОКАЦИОННЫЙ ПОСИМВОЛЬНЫЙ ЭКРАНИРОВЩИК ESC-СИМВОЛОВ (0% RegExp)
    for (let i = 0; i < strLen; i++) {
        const char = rawString.charAt(i);
        if (char === "\x1b") {
            escapedChunkStr += "^[";
        } else {
            escapedChunkStr += char;
        }
    }

    let kbdDump = "[INPUT_RAW_CHUNK] Принято байт: " + totalBytes + " | Символы: " + escapedChunkStr + "\n";
    
    for (let idx = 0; idx < totalBytes; idx++) {
        kbdDump += "  -> Байт #" + idx + ": 0x" + bufferChunk[idx].toString(16).toUpperCase() + 
                   " (DEC: " + bufferChunk[idx] + ") | Автомат_State: " + currentStateNum + "\n";
    }
    
    appendSnifferLogGuard(kbdDump + "\n");
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_byte_sniffer.js
 * Время модификации: 18.08.2026 17:53:15 MSK
 */
