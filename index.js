/**
 * @file index.js
 * @version 5.0.0-RELEASE-SMO-PURE-PROCEDURAL-MANIFEST
 * @description Входная точка ядра форка SLOTCMP III. 
 * ДЕКОМПОЗИЦИЯ ЗАВЕРШЕНА: Логика разнесена на tty_hardware_gate.js и bootstrap.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import fs from "node:fs";
import pathNode from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

import { loadAppSettings } from "./src/core/app_config.js";
import { purgeLogFileAtStartup, _kernelContext, _gpssEngineState } from "./src/core/smo/bus.js";
import { initializeCoreRuntime, triggerPrimaryGpssPulse } from "./src/core/smo/bootstrap.js";
import { enterAlternativeHardwareBuffer, listenHardwareInterrupts } from "./src/io/terminal/tty_hardware_gate.js";

const __dirname = pathNode.dirname(fileURLToPath(import.meta.url));
const resolvedLayoutJsonPath = pathNode.resolve(__dirname, "./config/layout.json");

async function main() {
    const configData = loadAppSettings();
    _kernelContext.logPath = configData?.systemLogPath || pathNode.resolve(__dirname, "./smo.log");
    
    purgeLogFileAtStartup();
    execSync("chcp 65001", { stdio: "ignore" });

    // Читаем суверенное дерево топологии интерфейса из JSON
    let topologyTree = { id: "root", type: "container", children: [] };
    if (fs.existsSync(resolvedLayoutJsonPath)) {
        topologyTree = JSON.parse(fs.readFileSync(resolvedLayoutJsonPath, "utf8").trim());
    }

    const cols = Math.max(40, Math.floor(process.stdout?.columns || 120));
    const rows = Math.max(10, Math.floor(process.stdout?.rows || 30));

    // ТАКТ 0: Синхронная аллокация ОЗУ ядра и прогрев флекс-геометрии
    const kernel = initializeCoreRuntime(topologyTree, configData, cols, rows);
    _gpssEngineState.runtime = kernel;

    // ТАКТ 1: Перевод терминала Windows в UHD альтернативный буфер
    enterAlternativeHardwareBuffer();

    // ТАКТ 2: Навешиваем слушатели аппаратных прерываний (ConPTY / stdin)
    listenHardwareInterrupts(kernel);

    // ТАКТ 3: Запуск первичного реактивного импульса на шине СМО
    triggerPrimaryGpssPulse(kernel);
}

main().catch((err) => {
    process.stdout.write("\x1b[?1049l\x1b[?1003l\x1b[?1006l\x1b[?25h\x1b[0m\n");
    process.stderr.write("[FATAL_ROOT_CRASH] Платформа ядра разрушена: " + String(err.stack || err) + "\n");
    process.exit(1);
});
