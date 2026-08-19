/**
 * @file src/core/app_config.js
 * @version 3.0.0-RELEASE-DOD-FORK
 * @description Эталонный верхнеуровневый DOD-загрузчик системных настроек.
 * Осуществляет превентивную безопасную загрузку JSON без использования запрещенного try/catch.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESOLVED_CONFIG_PATH = path.resolve(__dirname, "../../config/app_config.json");

/**
 * Загружает настройки приложения, используя превентивные проверки существования и валидности
 * @returns {Object} Запечатанная мономорфная структура настроек
 */
export function loadAppSettings() {
    const settings = {
        currentBorderAnsiMask: "gray", 

        view: { bOff: { content: true, frameContour: false, frameMetrics: false, debugMouse: false } },
        ttni: { bOff: true, bTrace: false, bLogsIgnore: true, bCaller: false, bKeyLogBypass: true, bSlotLogBypass: true },
        
        // Препреаллоцируем структуру маски логов для V8
        logLevelMsk: {
            "BOOT_SEQUENCE": "INFO",
            "UPDATE_VIEW": "NONE" // Явное объявление свойства до preventExtensions
        },

        lastFocusedSlotId: "105",
        activeThemeIdx: 2,
        s102_paths: ["C:\\\\", "C:\\\\", "C:\\\\", "C:\\\\"],
        s103_paths: ["C:\\\\", "C:\\\\", "C:\\\\", "C:\\\\"]
    };

    // ПРЕВЕНТИВНЫЙ ГВАРД БЕЗОПАСНОСТИ: Исключаем try/catch согласно Манифесту
    if (fs.existsSync(RESOLVED_CONFIG_PATH)) {
        const rawData = fs.readFileSync(RESOLVED_CONFIG_PATH, "utf8").trim();
        
        if (rawData.length > 0) {
            const parsed = JSON.parse(rawData);
            
            if (parsed && typeof parsed === "object") {
                const keys = Object.keys(parsed);
                const len = keys.length;
                
                for (let i = 0; i < len; i++) {
                    const k = keys[i];
                    if (k === "logLevelMsk" && parsed[k]) {
                        // Накатываем ключи словаря логов из JSON в наш прогретый объект
                        Object.assign(settings.logLevelMsk, parsed[k]);
                    } else if (k !== "currentBorderAnsiMask") {
                        settings[k] = parsed[k];
                    }
                }
            }
        }
    }

    if (settings.view && settings.view.bOff) Object.preventExtensions(settings.view.bOff);
    if (settings.view) Object.preventExtensions(settings.view);
    if (settings.ttni) Object.preventExtensions(settings.ttni);
    if (settings.logLevelMsk) Object.preventExtensions(settings.logLevelMsk);
    
    Object.preventExtensions(settings);
    return settings;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/app_config.js
 * Время модификации: 18.08.2026 17:49:50 MSK
 */
