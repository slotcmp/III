/**
 * @file src/io/terminal/tty_hardware_gate.js
 * @version 1.1.1-RELEASE-SMO-HARDWARE-GATE-TYPED-BUFFER-SAFE
 * @description Аппаратный шлюз перехвата ввода-вывода терминала ОС (Presentation-контур).
 * ИСПРАВЛЕН КРАШ FREEZE: Удален деструктивный Object.freeze со статического Uint8Array буфера.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { scanTtyBytes } from "./tty_byte_scanner.js";
import { _globalRuntimeGeometryRegistry } from "../../core/registry/geometry.js";
import { generateGpssTransaction } from "../../core/smo/bus.js";

// ИСПРАВЛЕНИЕ: Оставляем чистый const Uint8Array буфер без вызова Object.freeze.
// Память выделена один раз при старте ядра, аллокации в куче на тактах исключены.
const _staticHeartbeatByteBuffer = new Uint8Array([0x00]);

/**
 * Переводит ConPTY дескрипторы терминала Windows в альтернативный UHD-режим
 */
export function enterAlternativeHardwareBuffer() {
    if (process.stdout && process.stdout.isTTY) {
        process.stdout.write("\x1b[?1049h\x1b[?1003h\x1b[?1006h\x1b[?25l");
    }
}

/**
 * Активирует посимвольное слушание дескрипторов ввода stdin/stdout
 * @param {Object} kernel Ссылка на рантайм хоста ядра
 */
export function listenHardwareInterrupts(kernel) {
    if (!kernel) return;

    // АСИНХРОННОЕ ПРЕРЫВАНИЕ ОС: Изменение размеров консоли Windows
    if (process.stdout && typeof process.stdout.on === "function") {
        process.stdout.on("resize", () => {
            const newCols = Math.max(40, Math.floor(process.stdout.columns || 120));
            const newRows = Math.max(10, Math.floor(process.stdout.rows || 30));
            
            _globalRuntimeGeometryRegistry["root"].w = newCols;
            _globalRuntimeGeometryRegistry["root"].h = newRows;
            
            const resizePayload = { w: newCols, h: newRows };
            Object.preventExtensions(resizePayload);
            generateGpssTransaction("9", "TRIGGER_RESIZE", resizePayload);
        });
    }

    // АППАРАТНОЕ ПОБАЙТОВОЕ ПРЕРЫВАНИЕ ВВОДА
    if (process.stdin && process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on("data", (buf) => {
            scanTtyBytes(buf, kernel);
        });
    }

    // СТЕРЕИЛЬНЫЙ АППАРАТНЫЙ HEARTBEAT-ГЕНЕРАТОР ШИНЫ СМО
    // Вбрасывает пустой байт 0x00 каждые 100 мс прямо в конечный автомат ввода
    setInterval(() => {
        if (typeof scanTtyBytes === "function") {
            scanTtyBytes(_staticHeartbeatByteBuffer, kernel);
        }
    }, 100);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_hardware_gate.js
 * Время исправления: 03.09.2026 13:58:30 MSK
 * Ревизия: #0824-HARDWARE-HEARTBEAT-SAFE
 */
