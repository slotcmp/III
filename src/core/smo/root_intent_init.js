/**
 * @file src/core/smo/root_intent_init.js
 * @version 3.1.0-RELEASE-SMO-ROOT-INTENT-INIT-FIXED
 * @description DOD-процессор фазы первичного холодного запуска (init) (Control-контур).
 * Гарантирует отложенную отправку IPC-команд индексации VFS после прогрева Event Loop.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { assembleSlot } from "../slot_maker.js";

/**
 * Осуществляет бутстрап и детерминированную гидратацию системных СМО-компонентов
 * @param {Object} unitState Ссылка на состояние вызывающего прибора
 * @param {Object} r Ссылка на ОЗУ-рантайм хоста ядра
 * @returns {boolean} Флаг успешности проведения фазы инициализации
 */
export function processInitIntent(unitState, r) {
    if (!unitState || !r || typeof r.dispatch !== "function") return false;
    
    if (r.isSystemFullyBooted === true) return false;
    r.isSystemFullyBooted = true; 

    const rawCols = process.stdout ? Math.floor(process.stdout.columns || 120) : 120;
    const rawRows = process.stdout ? Math.floor(process.stdout.rows || 30) : 30;

    const cols = isNaN(rawCols) ? 120 : Math.max(1, rawCols);
    const rows = isNaN(rawRows) ? 30 : Math.max(1, rawRows);

    const resizePayload = { w: cols, h: rows };
    Object.preventExtensions(resizePayload);
    r.dispatch("9", "TRIGGER_RESIZE", resizePayload);

    // ПОШАГОВЫЙ БУТСТРАП ВСЕХ ПЯТИ ПРИКЛАДНЫХ ПРИБОРОВ НА ТАКТЕ ИНИЦИАЛИЗАЦИИ ЯДРА
    if (typeof assembleSlot === "function") {
        assembleSlot(r, "101", "dashboard");
        assembleSlot(r, "102", "explorer");
        assembleSlot(r, "103", "explorer");
        assembleSlot(r, "106", "theme");
        assembleSlot(r, "105", "command");
        assembleSlot(r, "108", "logger");
    }

    // ОТЛОЖЕННЫЙ ТАКТОВЫЙ ЗАПУСК ИНДЕКСАЦИИ VFS ДЛЯ СЛОТОВ 102 И 103
    const configData = r.model?.logicalState?.appSettings;
    const startPath102 = configData?.s102_paths?.[0] || "C:\\\\";
    const startPath103 = configData?.s103_paths?.[0] || "C:\\\\";

    if (r.workerGateway && typeof r.workerGateway.triggerDirectoryIndexing === "function") {
        r.workerGateway.triggerDirectoryIndexing("102", startPath102, 0);
        r.workerGateway.triggerDirectoryIndexing("103", startPath103, 0);
    }

    r.isStageHydratedAndReady = true;
    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/root_intent_init.js
 * Время модификации: 18.08.2026 19:29:10 MSK
 */
