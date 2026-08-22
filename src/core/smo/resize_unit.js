/**
 * @file src/core/smo/resize_unit.js
 * @version 3.5.5-RELEASE-SMO-RESIZE-PIPELINE-SAFE
 * @description Модуль обслуживания Фазы 1-3 СМО (Прибор Канала 9 / resize_unit).
 * ИСПРАВЛЕН КРАШ V8: Мутации ширины перенаправлены на открытые регистры геометрии ядра хоста.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import fs from "node:fs";
import { generateGpssTransaction, _kernelContext } from "./bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";

/**
 * Превентивный гвард для безопасной записи метрик геометрии в лог
 * @param {string} messageStr Сформированная строка лога
 */
function appendGeoMetricsLogGuard(messageStr) {
    const targetLogPath = _kernelContext.logPath;
    if (!targetLogPath) return;
    fs.appendFileSync(targetLogPath, messageStr, "utf8");
}

/**
 * Фазовый СМО-фильтр супершины прерываний для Прибора Канала 9 (Resize)
 * @param {Object} facilityState Состояние активного инфраструктурного прибора СМО
 * @param {string} intentStr Идентификатор прерывания (TRIGGER_RESIZE или INJECT_GEO_MAP)
 * @param {Object} contextPayload Контекст транзакта (метрики консоли или скомпилированная карта)
 * @param {Object} currentTx Полный паспорт транзакта СМО
 * @returns {boolean} Флаг наличия мутаций рантайма для взвода IsDirty
 */
export function processSpecificResizeLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;
    
    const kernel = facilityState.host;
    if (!kernel) return false;

    const intent = String(intentStr || "");
    const ctx = contextPayload;

    // ФАЗА А: ПРЕРЫВАНИЕ ТЕРМИНАЛА (ОС ИЗМЕНИЛА ФИЗИЧЕСКИЕ РАЗМЕРЫ ОКНА)
    if (intent === "TRIGGER_RESIZE" && ctx) {
        const targetW = Math.max(40, Math.floor(ctx.w || 120));
        const targetH = Math.max(10, Math.floor(ctx.h || 30));
        
        // Пишем строго в базовые регистры ядра, инициализированные при старте index.js
        kernel.width = targetW; 
        kernel.height = targetH;
        
        if (kernel.model && kernel.model.width !== undefined) {
            kernel.model.width = targetW;
            kernel.model.height = targetH;
        }
        
        if (kernel.workerGateway && typeof kernel.workerGateway.triggerGeometryCalculation === "function") {
            const layoutTree = kernel.model?.layoutTree || kernel.layoutTopologyTree;
            const settingsObj = kernel.model?.logicalState?.appSettings;
            kernel.workerGateway.triggerGeometryCalculation(layoutTree, targetW, targetH, settingsObj, currentTx.id);
        }
        return true; 
    } 
    
    // ФАЗА Б: ИНЖЕКЦИЯ СКОМПИЛИРОВАННОЙ КАРТЫ ОТ ВОРКЕРА ГЕОМЕТРИИ
    if (intent === "INJECT_GEO_MAP" && ctx) {
        if (typeof kernel.updateGeometryMap === "function") {
            kernel.updateGeometryMap(ctx);
        }
        
        if (typeof forceInvalidateShadowCanvas === "function") {
            forceInvalidateShadowCanvas();
        }

        const now = new Date();
        const h = String(now.getHours()).padStart(2, "0");
        const m = String(now.getMinutes()).padStart(2, "0");
        const s = String(now.getSeconds()).padStart(2, "0");
        const rootGeo = ctx["root"] || { w: 120, h: 30 };
        
        const geoMetricsLineStr = "[" + h + ":" + m + ":" + s + " Msk] [СМО_LAYOUT] Геометрия TUI пересчитана воркером: W=" + 
                                  Math.floor(rootGeo.w) + " знакомест | H=" + Math.floor(rootGeo.h) + " строк\n";
        
        appendGeoMetricsLogGuard(geoMetricsLineStr);

        generateGpssTransaction("108", "ADD_LOG_ENTRY", geoMetricsLineStr);
        generateGpssTransaction("1", "EXECUTE_RENDER", null);
        return true; 
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/resize_unit.js
 * Время модификации: 21.08.2026 17:09:20 MSK
 */
