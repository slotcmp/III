/**
 * @file index.js
 * @version 6.2.4-RELEASE-SMO-BOOTSTRAP-DIAGNOSTIC-CONNECTED
 * @description Входная точка ядра форка SLOTCMP III.
 * ИСПРАВЛЕНО: Инжектирован автономный файловый стенд runTabsGeometryValidationTest.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import fs from "node:fs";
import pathNode from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

// Импорт инфраструктурных компонентов ядра СМО
import { loadAppSettings } from "./src/core/app_config.js";
import { purgeLogFileAtStartup, _kernelContext, _gpssEngineState, generateGpssTransaction } from "./src/core/smo/bus.js";
import { initializeCoreRuntime, triggerPrimaryGpssPulse } from "./src/core/smo/bootstrap.js";
import { enterAlternativeHardwareBuffer, listenHardwareInterrupts } from "./src/io/terminal/tty_hardware_gate.js";

// Инжектируем созданный ранее диагностический сниффер клавиатурного контура
import { executeKbdDiagnosticSniffer } from "./src/core/smo/debug/kbd_diagnostic_sniffer.js";

// ЛИНКОВКА РЕВИЗИИ 1.0.3-RELEASE: Тестовый стенд для выявления промахов по ушкам 200
import { runTabsGeometryValidationTest } from "./src/core/smo/debug/tabs_geometry_test.js";

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

    // Замеряем стартовую физическую матрицу геометрии terminal
    const cols = Math.max(40, Math.floor(process.stdout?.columns || 120));
    const rows = Math.max(10, Math.floor(process.stdout?.rows || 30));

    // 3. Выполняем IoC-гидратацию рантайма и линкуем контекст
    const kernel = initializeCoreRuntime(topologyTree, configData, cols, rows);
    _gpssEngineState.runtime = kernel;

    // =================================================================
    // АВТОНОМНЫЙ ВЫЖИГ ГЕОМЕТРИИ: Пишем паспорт растра до ConPTY зажима
    // =================================================================
    if (typeof runTabsGeometryValidationTest === "function") {
        runTabsGeometryValidationTest();
    }

    // Переводим терминал ОС в UHD режим альтерначеского экрана
    enterAlternativeHardwareBuffer();
    
    // Включаем асинхронное слушание побайтовых прерываний клавиатуры/мыши stdin
    if (typeof listenHardwareInterrupts === "function") {
        listenHardwareInterrupts(kernel);
    }

    // =================================================================
    // ЖЕСТКИЙ СТАРТОВЫЙ ТАКТ ГИДРАТАЦИИ СЕТКИ (0% OOP / 0% Polling)
    // =================================================================
    const bootPayload = { w: cols, h: rows };
    Object.preventExtensions(bootPayload);
    generateGpssTransaction("9", "TRIGGER_RESIZE", bootPayload);

    // Выстреливаем первичный тактовый импульс в шину имитационного моделирования
    triggerPrimaryGpssPulse(kernel);

    // =================================================================
    // АВТОМАТИЧЕСКИЙ СНИФФЕР-ТАЙМЕР ТРАКТА ФОКУСА (ОТЛАДКА СЛОТА 105)
    // =================================================================
    setTimeout(() => {
        if (typeof executeKbdDiagnosticSniffer === "function") {
            executeKbdDiagnosticSniffer(kernel);
        }
    }, 3000);
}

// Глобальный защитный контур аварийного сброса терминала в канонический режим при падении
main().catch((err) => {
    try {
        fs.writeFileSync(
            "./crash.txt", 
            "=== КРИТИЧЕСКИЙ СБОЙ БУТСТРАПА SLOTCMP III ===\n" + 
            "Время: " + new Date().toISOString() + "\n" +
            "Стек ошибки:\n" + String(err.stack || err) + "\n"
        );
    } catch (e) {
        // Резервный гвард
    }

    if (process.stdout) {
        process.stdout.write("\x1b[?1049l\x1b[?1003l\x1b[?1006l\x1b[?25h\x1b[0m\n");
    }
    process.exit(1);
});