/**
 * @file index.js
 * @version 6.2.2-RELEASE-SMO-BOOTSTRAP-RESIZE-PINNED
 * @description Входная точка ядра форка SLOTCMP III.
 * ИСПРАВЛЕН СТАРТОВЫЙ РЕСАЙЗ: Добавлен принудительный тактовый пинк TRIGGER_RESIZE на Канал 9 при холодном пуске.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import fs from "node:fs";
import pathNode from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

// Импорт инфраструктурных компонентов ядра СМО
import { loadAppSettings } from "./src/core/app_config.js";
import { purgeLogFileAtStartup, _kernelContext, _gpssEngineState, generateGpssTransaction } from "./src/core/smo/bus.js"; // Инжектирован generateGpssTransaction
import { initializeCoreRuntime, triggerPrimaryGpssPulse } from "./src/core/smo/bootstrap.js";
import { enterAlternativeHardwareBuffer, listenHardwareInterrupts } from "./src/io/terminal/tty_hardware_gate.js";

const __dirname = pathNode.dirname(fileURLToPath(import.meta.url));
const resolvedLayoutJsonPath = pathNode.resolve(__dirname, "./config/layout.json");

async function main() {
    // 1. Загружаем преаллоцированные DOD-настройки конфигурации
    const configData = loadAppSettings();
    _kernelContext.logPath = configData?.systemLogPath || pathNode.resolve(__dirname, "./smo.log");
    
    // Очищаем старые файлы трассировки
    purgeLogFileAtStartup();
    
    // Гарантируем поддержку Юникода/Кириллицы в ConPTY консоли Windows
    execSync("chcp 65001", { stdio: "ignore" });

    // 2. Считываем и парсим дерево topologyTree окон Window Manager
    let topologyTree = { id: "root", type: "container", children: [] };
    if (fs.existsSync(resolvedLayoutJsonPath)) {
        topologyTree = JSON.parse(fs.readFileSync(resolvedLayoutJsonPath, "utf8").trim());
    }

    // Замеряем стартовую физическую матрицу геометрии терминала
    const cols = Math.max(40, Math.floor(process.stdout?.columns || 120));
    const rows = Math.max(10, Math.floor(process.stdout?.rows || 30));

    // 3. Выполняем IoC-гидратацию рантайма и линкуем контекст
    const kernel = initializeCoreRuntime(topologyTree, configData, cols, rows);
    _gpssEngineState.runtime = kernel;

    // Переводим терминал ОС в UHD режим альтерначеского экрана
    enterAlternativeHardwareBuffer();
    
    // Включаем асинхронное слушание побайтовых прерываний клавиатуры/мыши stdin
    if (typeof listenHardwareInterrupts === "function") {
        listenHardwareInterrupts(kernel);
    }

    // =================================================================
    // ЖЕСТКИЙ СТАРТОВЫЙ ТАКТ ГИДРАТАЦИИ СЕТКИ (0% OOP / 0% Polling)
    // =================================================================
    // Выстреливаем принудительным прерыванием в Канал 9, передавая живые метрики консоли (например, 208х51)
    const bootPayload = { w: cols, h: rows };
    Object.preventExtensions(bootPayload);
    generateGpssTransaction("9", "TRIGGER_RESIZE", bootPayload);

    // Выстреливаем первичный тактовый импульс в шину имитационного моделирования
    triggerPrimaryGpssPulse(kernel);
}

// Глобальный защитный контур аварийного сброса терминала в канонический режим при падении
main().catch((err) => {
    if (process.stdout) {
        process.stdout.write("\x1b[?1049l\x1b[?1003l\x1b[?1006l\x1b[?25h\x1b[0m\n");
    }
    if (process.stderr) {
        process.stderr.write("[FATAL_ROOT_CRASH] Платформа ядра разрушена: " + String(err.stack || err) + "\n");
    }
    process.exit(1);
});
