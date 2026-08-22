/**
 * @file src/core/app_config.js
 * @version 3.0.1-RELEASE-DOD-FORK
 * @description Эталонный верхнеуровневый DOD-загрузчик системных настроек.
 * ИСПРАВЛЕН НАКАТ ПОЛЕЙ: Запрещено динамическое расширение объекта для защиты Hidden Class.
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
        
        logLevelMsk: {
            "BOOT_SEQUENCE": "INFO",
            "UPDATE_VIEW": "NONE"
        },

        lastFocusedSlotId: "105",
        activeThemeIdx: 2,
        // ИСПРАВЛЕНИЕ: Пути переведены на мономорфные TUI-литералы "C:/"
        s102_paths: ["C:/", "C:/", "C:/", "C:/"],
        s103_paths: ["C:/", "C:/", "C:/", "C:/"]
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
                        Object.assign(settings.logLevelMsk, parsed[k]);
                    } 
                    // ИСПРАВЛЕНИЕ: Накатываем внешние свойства СТРОГО если они объявлены в settings.
                    // Это пресекает несанкционированное расширение полей и защищает Fast Properties режим V8.
                    else if (k !== "currentBorderAnsiMask" && settings[k] !== undefined) {
                        
                        if (Array.isArray(settings[k]) && Array.isArray(parsed[k])) {
                            const subLen = Math.min(settings[k].length, parsed[k].length);
                            for (let j = 0; j < subLen; j++) {
                                settings[k][j] = String(parsed[k][j]);
                            }
                        } else {
                            settings[k] = parsed[k];
                        }
                    }
                }
            }
        }
    }

    // Запечатываем подобъекты ОЗУ-структуры строго до финализации корня
    if (settings.view && settings.view.bOff) Object.preventExtensions(settings.view.bOff);
    if (settings.view) Object.preventExtensions(settings.view);
    if (settings.ttni) Object.preventExtensions(settings.ttni);
    if (settings.logLevelMsk) Object.preventExtensions(settings.logLevelMsk);
    
    Object.preventExtensions(settings);
    return settings;
}
