/**
 * @file src/io/terminal/tty_hardware_gate.js
 * @version 1.0.1-RELEASE-SMO-HARDWARE-GATE
 * @description Аппаратный шлюз перехвата ввода-вывода терминала ОС (Presentation-контур).
 * ИСПРАВЛЕНА СВЯЗЬ: Дублирующийся парсер изъят, чанки направляются строго в tty_byte_scanner.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { scanTtyBytes } from "./tty_byte_scanner.js";
import { _gpssEngineState } from "../../core/smo/bus.js";
import { _globalRuntimeGeometryRegistry } from "../../core/registry/geometry.js";
import { generateGpssTransaction } from "../../core/smo/bus.js";

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

    // АППАРАТНОЕ ПОБАЙТОВОЕ ПРЕРЫВАНИЕ ВВОДА (Контур очищен от коллизий)
    if (process.stdin && process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on("data", (buf) => {
            // Вбрасываем чанк байт напрямую в канонический конечный автомат
            scanTtyBytes(buf, kernel);

            // КРИТИЧЕСКИЙ ПИНОК ШИНЫ: Продвигаем очереди приборов СМО на каждом прерывании
            const mouseUnit = _gpssEngineState.facilitiesRegistry.get("10");
            if (mouseUnit && typeof mouseUnit.advanceFacility === "function") {
                mouseUnit.advanceFacility();
            }
            const kbdUnit = _gpssEngineState.facilitiesRegistry.get("4");
            if (kbdUnit && typeof kbdUnit.advanceFacility === "function") {
                kbdUnit.advanceFacility();
            }
        });
    }
}
