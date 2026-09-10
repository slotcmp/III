/**
 * @file src/core/app_config.js
 * @version 3.1.0-RELEASE-SMO-CONFIG-HISTORY-PREALLOCATED
 * @description DOD-загрузчик системных настроек и персистентной истории CLI.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESOLVED_CONFIG_PATH = path.resolve(__dirname, "../../config/app_config.json");

export function loadAppSettings() {
    const settings = {
        currentBorderAnsiMask: "gray", 
        currentPassiveAnsiMask: "darkgray", 

        // ПРЕЦИЗИОННАЯ АЛЛОКАЦИЯ РЕГИСТРОВ ИСТОРИИ КОМАНД
        cli_history: new Array(32),
        cli_history_count: 0,
        _isHistoryDirty: false, // Флаг отслеживания мутации ОЗУ

        view: { bOff: { content: true, frameContour: false, frameMetrics: false, debugMouse: false } },
        ttni: { bOff: true, bTrace: false, bLogsIgnore: true, bCaller: false, bKeyLogBypass: true, bSlotLogBypass: true },
        logLevelMsk: { "BOOT_SEQUENCE": "INFO", "UPDATE_VIEW": "NONE" },
        lastFocusedSlotId: "102",
        activeThemeIdx: 2,
        s102_paths: ["C:/", "C:/", "C:/", "C:/"],
        s103_paths: ["C:/", "C:/", "C:/", "C:/"]
    };

    // Забиваем пустые ячейки для V8 Fast Properties
    for (let i = 0; i < 32; i++) settings.cli_history[i] = "";

    if (fs.existsSync(RESOLVED_CONFIG_PATH)) {
        const rawData = fs.readFileSync(RESOLVED_CONFIG_PATH, "utf8").trim();
        if (rawData.length > 0) {
            const parsed = JSON.parse(rawData);
            if (parsed && typeof parsed === "object") {
                const keys = Object.keys(parsed);
                for (let i = 0; i < keys.length; i++) {
                    const k = keys[i];
                    if (k === "cli_history" && Array.isArray(parsed[k])) {
                        const len = Math.min(32, parsed[k].length);
                        settings.cli_history_count = len;
                        for (let j = 0; j < len; j++) settings.cli_history[j] = String(parsed[k][j]);
                    } else if (k === "logLevelMsk" && parsed[k]) {
                        Object.assign(settings.logLevelMsk, parsed[k]);
                    } else if (settings[k] !== undefined && k !== "cli_history") {
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
 * Атомарная синхронизация ОЗУ-истории с физическим JSON-диском (Вызывается по Ctrl+C / Ctrl+S)
 */
export function saveHistoryToDiskInline(settingsObj) {
    if (!settingsObj || settingsObj._isHistoryDirty === false) return;
    try {
        let rawData = "{}";
        if (fs.existsSync(RESOLVED_CONFIG_PATH)) {
            rawData = fs.readFileSync(RESOLVED_CONFIG_PATH, "utf8").trim() || "{}";
        }
        const json = JSON.parse(rawData) || Object.create(null);
        
        // Экспортируем чистый массив заполненных строк истории
        const cleanArr = new Array(Math.floor(settingsObj.cli_history_count));
        for (let i = 0; i < cleanArr.length; i++) {
            cleanArr[i] = settingsObj.cli_history[i];
        }
        json.cli_history = cleanArr;

        fs.writeFileSync(RESOLVED_CONFIG_PATH, JSON.stringify(json, null, 2), "utf8");
        settingsObj._isHistoryDirty = false;
    } catch (e) {
        if (process.stderr) process.stderr.write("[CONFIG_IO_FATAL] Сбой сохранения истории\n");
    }
}
