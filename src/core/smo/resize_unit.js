/**
 * @file src/core/smo/resize_unit.js
 * @version 3.9.0-RELEASE-SMO-RESIZE-REALIGNMENT-CONNECTED
 * @description Модуль обслуживания Фазы 1-3 СМО (Прибор Канала 9 / resize_unit).
 * ИСПРАВЛЕНА ПУСТОТА ОКOН: Интегрирован вызов realignAllActiveViewBuffers для реактивной нарезки Int32Array буферов.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction } from "./bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";
import { writeCoreLogMessageInline } from "./logger_io.js";

// Импортируем наш размоноличенный DOD-очиститель координат и выравниватель буферов вьюх
import { clearDirtyGeometryRegistry } from "../layout/balancer/geo_cleaner.js";
import { realignAllActiveViewBuffers } from "../layout/layout_balancer.js"; // Инжектируем выравниватель

/**
 * Фазовый СМО-фильтр супершины прерываний для Прибора Канала 9 (Resize)
 */
export function processSpecificResizeLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;
    
    const kernel = facilityState.host;
    if (!kernel) return false;

    const intent = String(intentStr || "");
    const ctx = contextPayload;

    if ((intent === "TRIGGER_RESIZE" || intent === "FORCE_RECALCULATE_LAYOUT") && ctx) {
        const targetW = Math.max(40, Math.floor(ctx.w || ctx.width || kernel.width || 120));
        const targetH = Math.max(10, Math.floor(ctx.h || ctx.height || kernel.height || 30));
        
        kernel.width = targetW; 
        kernel.height = targetH;
        
        if (kernel.model && kernel.model.width !== undefined) {
            kernel.model.width = targetW;
            kernel.model.height = targetH;
        }
        
        if (kernel.workerGateway && typeof kernel.workerGateway.triggerGeometryCalculation === "function") {
            const layoutTree = kernel.layoutTopologyTree || kernel.model?.layoutTree;
            const settingsObj = kernel.model?.logicalState?.appSettings;
            
            const txId = currentTx ? currentTx.id : 0;
            kernel.workerGateway.triggerGeometryCalculation(layoutTree, targetW, targetH, settingsObj, txId);
        }
        return true; 
    } 
    
    // =================================================================
    // ИСПРАВЛЕННЫЙ КОНТУР ИНЖЕКЦИИ КООРДИНАТ С ИСКЛЮЧЕНИЕМ ДУБЛИКАТОВ
    // =================================================================
    if (intent === "INJECT_GEO_MAP" && ctx) {
        // 1. Намертво выжигаем старые Ghost-координаты в ОЗУ-карте ядра перед обновлением
        if (kernel.calculatedGeoMap) {
            clearDirtyGeometryRegistry(kernel.calculatedGeoMap);
        } else if (kernel.model?.logicalState?.calculatedGeoMap) {
            clearDirtyGeometryRegistry(kernel.model.logicalState.calculatedGeoMap);
        }

        // 2. Накатываем свежую, пересчитанную воркером геометрию сетки
        if (typeof kernel.updateGeometryMap === "function") {
            kernel.updateGeometryMap(ctx);
        }

        // =================================================================
        // РЕАКТИВНОЕ ВЫРАВНИВАНИЕ БУФЕРОВ ОТОБРАЖЕНИЯ ПОСЛЕ ИНЖЕКЦИИ КАРТЫ
        // =================================================================
        // Перенарезаем Int32Array-строки вьюх под живые габариты, исключая Out of Bounds блокировки
        realignAllActiveViewBuffers(kernel);
        
        if (typeof forceInvalidateShadowCanvas === "function") {
            forceInvalidateShadowCanvas();
        }

        if (kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }

        const now = new Date();
        const rootGeo = ctx["root"] || { w: 120, h: 30 };
        
        const geoMetricsLineStr = "[" + String(now.getHours()).padStart(2, "0") + ":" + 
                                  String(now.getMinutes()).padStart(2, "0") + ":" + 
                                  String(now.getSeconds()).padStart(2, "0") + " Msk] [СМО_LAYOUT] Геометрия TUI пересчитана воркером: W=" + 
                                  Math.floor(rootGeo.w) + " знакомест | H=" + Math.floor(rootGeo.h) + " строк\n";
        
        writeCoreLogMessageInline(geoMetricsLineStr);
        generateGpssTransaction("108", "ADD_LOG_ENTRY", geoMetricsLineStr);
        
        generateGpssTransaction("1", "EXECUTE_RENDER", null);
        return true; 
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/resize_unit.js
 * Время изменения: 05.09.2026 21:04:12 MSK
 */
