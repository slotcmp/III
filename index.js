/**
 * @file index.js
 * @version 3.4.0-RELEASE-SMO-REACTIVE-BOOT
 * @description Входная точка ядра 3-го форка.
 * Ликвидирован холостой ход setInterval, рантайм переведен на реактивную шину прерываний.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

import { loadAppSettings } from "./src/core/app_config.js";
import { _gpssEngineState, registerGpssFacility, generateGpssTransaction, purgeLogFileAtStartup, _kernelContext } from "./src/core/smo/bus.js";
import { _globalRuntimeGeometryRegistry } from "./src/core/registry/geometry.js";
import { createHostState } from "./src/core/app_host_factory.js";
import { assembleKeyboardUnit } from "./src/core/smo/keyboard_worker_unit.js";
import { scanTtyBytes } from "./src/io/terminal/tty_byte_scanner.js";

// Импортируем каскад для первотактного прогрева геометрии
import { pass1MeasureConstraints } from "./src/core/layout/measurer.js";
import { pass3CalculatePositions } from "./src/core/layout/calculator.js";
import { balanceGeometryMap } from "./src/core/layout/layout_balancer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolvedLayoutJsonPath = path.resolve(__dirname, "./config/layout.json");

async function main() {
    const configData = loadAppSettings();
    _kernelContext.logPath = configData?.systemLogPath || path.resolve(__dirname, "./smo.log");
    
    purgeLogFileAtStartup();
    execSync("chcp 65001", { stdio: "ignore" });

    if (process.stdout && process.stdout.isTTY) {
        process.stdout.write("\x1b[?1049h\x1b[?1003h\x1b[?1006h\x1b[?25l");
    }

    let topologyTree = { id: "root", type: "container", children: [] };
    if (fs.existsSync(resolvedLayoutJsonPath)) {
        topologyTree = JSON.parse(fs.readFileSync(resolvedLayoutJsonPath, "utf8").trim());
    }

    const cols = Math.max(40, Math.floor(process.stdout?.columns || 120));
    const rows = Math.max(10, Math.floor(process.stdout?.rows || 30));

    _globalRuntimeGeometryRegistry["root"] = { x: 0, y: 0, w: cols, h: rows };

    const kernel = createHostState(_gpssEngineState);
    _gpssEngineState.runtime = kernel;
    kernel.layoutTopologyTree = topologyTree;
    kernel.calculatedGeoMap = _globalRuntimeGeometryRegistry;

    // Наливаем appSettings строго до регистрации приборов для работы лог-гвардов
    kernel.model.logicalState.appSettings = configData;

    if (typeof assembleKeyboardUnit === "function") {
        const keyboardFacility = assembleKeyboardUnit(kernel);
        registerGpssFacility("4", keyboardFacility);
    }

    if (kernel.boot) {
        await kernel.boot();
    }
    
    if (kernel.workerGateway && typeof kernel.workerGateway.initWorkers === "function") {
        kernel.workerGateway.initWorkers();
    }

    // Первотактный синхронный прогрев флекс-координат
    pass1MeasureConstraints(topologyTree, cols, rows);
    pass3CalculatePositions(topologyTree, 0, 0, cols, rows, _globalRuntimeGeometryRegistry, null);
    balanceGeometryMap(_globalRuntimeGeometryRegistry, rows, cols);
    kernel.updateGeometryMap(_globalRuntimeGeometryRegistry);

    // ВЫСТРЕЛИВАЕМ ПЕРВИЧНЫЙ ИМПУЛЬС: Шина сама раскрутит каскад и вызовет блайтер!
    generateGpssTransaction("0", "init", null);
    generateGpssTransaction("1", "EXECUTE_RENDER", null);

    // АСИНХРОННОЕ ПРЕРЫВАНИЕ ОС: Перехват изменения размеров окна Windows-консоли
    if (process.stdout && typeof process.stdout.on === "function") {
        process.stdout.on("resize", () => {
            const newCols = Math.max(40, Math.floor(process.stdout.columns || 120));
            const newRows = Math.max(10, Math.floor(process.stdout.rows || 30));
            
            _globalRuntimeGeometryRegistry["root"].w = newCols;
            _globalRuntimeGeometryRegistry["root"].h = newRows;
            
            const resizePayload = { w: newCols, h: newRows };
            Object.preventExtensions(resizePayload);
            
            // Импульс Фазы А мгновенно будит ядро
            generateGpssTransaction("9", "TRIGGER_RESIZE", resizePayload);
        });
    }

    // АППАРАТНОЕ ПОБАЙТОВОЕ ПРЕРЫВАНИЕ ВВОДА (Канал 4 просыпается строго при нажатии клавиш)
    if (process.stdin && process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on("data", (rawKeyBuffer) => {
            scanTtyBytes(rawKeyBuffer, kernel);
            
            // Форсируем продвижение Канала 4 после падения байт в буфер
            const kbdUnit = _gpssEngineState.facilitiesRegistry.get("4");
            if (kbdUnit && typeof kbdUnit.advanceFacility === "function") {
                kbdUnit.advanceFacility();
            }
        });
    }
}

main().catch((err) => {
    process.stdout.write("\x1b[?1049l\x1b[?1003l\x1b[?1006l\x1b[?25h\x1b[0m\n");
    process.stderr.write("[FATAL_CRASH] Рантайм ядра форка разрушен: " + String(err.stack || err) + "\n");
    process.exit(1);
});

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: index.js
 * Время модификации: 18.08.2026 21:44:30 MSK
 */
