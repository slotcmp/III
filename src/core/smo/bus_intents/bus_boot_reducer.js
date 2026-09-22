/**
 * @file src/core/smo/bus_intents/bus_boot_reducer.js
 * @version 1.0.0-RELEASE-SMO-BUS-BOOT-REDUCER
 * @description Вынесенный изолированный редьюсер очистки и инициализации дисковых журналов логов.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% try-catch / Zero Allocation.
 */

import fs from "node:fs";
import path from "node:path";
import { loadAppSettings } from "../../app_config.js";
import { _kernelContext } from "../bus.js";
import { purgeAuditFileAtStartup } from "../tick_sniffer.js";

/**
 * Выполняет принудительный безаллокационный сброс системных трейс-файлов при холодном пуске ядра
 */
export function purgeLogFileAtStartup() {
    // 0% try/catch в основном слое: изоляция падения выведена на внешний контур stdout/stderr
    fs.writeFileSync(path.resolve(process.cwd(), "./logs/smo_core.log"), "", "utf8");
    fs.writeFileSync(path.resolve(process.cwd(), "./smo_ticks.audit"), "", "utf8");

    const targetLogPath = _kernelContext.logPath;
    if (targetLogPath) {
        fs.writeFileSync(targetLogPath, "", "utf8");
    }
    
    const configData = loadAppSettings();
    const isBypass = configData ? (configData.bAuditTicksBypass === true) : false;
    if (!isBypass) { 
        purgeAuditFileAtStartup(); 
    }
}
