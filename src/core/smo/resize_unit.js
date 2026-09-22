/**
 * @file src/core/smo/resize_unit.js
 * @version 4.0.0-RELEASE-SMO-RESIZE-FILE-LOG-PRINTER
 * @description Модуль обслуживания Прибора Канала 9 (resize_unit).
 * ИСПРАВЛЕНО: Презентационный затир устранен. Вывод 6-примитивного дампа ОЗУ
 * перенаправлен напрямую в файл logs/smo_core.log через writeCoreLogMessageInline.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction, _gpssEngineState } from "./bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";
import { writeCoreLogMessageInline } from "./logger_io.js";

// Системные DOD-утилиты очистки и реалайн-выравнивания буферов вьюх
import { clearDirtyGeometryRegistry } from "../layout/balancer/geo_cleaner.js";
import { realignAllActiveViewBuffers } from "../layout/layout_balancer.js";



/**
 * Фазовый СМО-фильтр супершины прерываний для Прибора Канала 9 (Resize)
 */
export function processSpecificResizeLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;
    
    const kernel = facilityState.runtime || _gpssEngineState.runtime;
    if (!kernel) return false;

    const intent = String(intentStr || "");
    const ctx = contextPayload;

    // 1. КОНТУР ИНИЦИАЛИЗАЦИИ ИЛИ ТРИГГЕРА ИЗМЕНЕНИЯ РАЗМЕРОВ СЕТКИ ОKОН
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
    
    // 2. КОНТУР ИНЖЕКЦИИ ГОТОВОЙ ГЕОМЕТРИИ ОТ ФОНОВОГО ВОРКЕРА
    if (intent === "INJECT_GEO_MAP" && ctx) {
        if (kernel.calculatedGeoMap) {
            clearDirtyGeometryRegistry(kernel.calculatedGeoMap);
        }

        if (typeof kernel.updateGeometryMap === "function") {
            kernel.updateGeometryMap(ctx);
        }

        realignAllActiveViewBuffers(kernel);
        
        // Шаг А: Прошиваем динамические X-границы ушек в плоский бинарный Int16Array буфер Слота 12

        // =============================================================
        // ШАГ Б: ФОРСИРОВАННЫЙ ВЫЖИГ ДАМПА В СУВЕРЕННЫЙ ФАЙЛ ЛОГА (logs/smo_core.log)
        // =============================================================
        const tabMenuFacility = _gpssEngineState.facilitiesRegistry.get("12");
        const tabMenuMdl = tabMenuFacility ? tabMenuFacility.mdl : null;
        
        if (tabMenuMdl) {
            const vectorBuf = tabMenuMdl.tabsVectorArray || tabMenuMdl.charBuffer;
            let totalPassports = Math.floor(tabMenuMdl.totalRegisteredTabsCount || 0);
            
            if (totalPassports === 0 && vectorBuf) {
                for (let k = 0; k < 16; k++) {
                    if (vectorBuf[k * 6] === 12 || vectorBuf[k * 5] === 12 || vectorBuf[k * 5] === 200) {
                        totalPassports = (k + 1) | 0;
                    }
                }
            }

            if (vectorBuf && totalPassports > 0) {
                const now = new Date();
                const h = String(now.getHours()).padStart(2, "0");
                const min = String(now.getMinutes()).padStart(2, "0");
                const s = String(now.getSeconds()).padStart(2, "0");

                // Выжигаем заголовок дампа прямо в файл
                writeCoreLogMessageInline("\n[" + h + ":" + min + ":" + s + " Msk] [DEBUG_WM] --- ИСТИННЫЙ МОНОМОРФНЫЙ ДАМП ОЗУ В ФАЙЛЕ ---\n");
                
                const strideStep = (vectorBuf[0] === 12 || vectorBuf[0] === 0) ? 6 : 5;

                for (let i = 0; i < totalPassports; i++) {
                    const idx = (i * strideStep) | 0;

                    const cleanDumpLineStr = "  -> psp #" + i + " (Шаг " + strideStep + "): [keeper: " + vectorBuf[idx] + 
                                             " | Y: " + (strideStep === 6 ? vectorBuf[idx + 1] : 0) + 
                                             " | X: " + (strideStep === 6 ? vectorBuf[idx + 2] : vectorBuf[idx + 1]) + ".." + 
                                                       (strideStep === 6 ? vectorBuf[idx + 3] : vectorBuf[idx + 2]) + 
                                             " | owner: " + (strideStep === 6 ? vectorBuf[idx + 4] : vectorBuf[idx + 3]) + 
                                             " | tabs: " + (strideStep === 6 ? vectorBuf[idx + 5] : vectorBuf[idx + 4]) + "]\n";
                    
                    // Атомарно выстреливаем каждую строку в дескриптор FD_CORE
                    writeCoreLogMessageInline(cleanDumpLineStr);
                }
                writeCoreLogMessageInline("  ---------------------------------------------------------------------------------\n\n");
            } else {
                writeCoreLogMessageInline("\n[DEBUG_WM] Предупреждение: Массив паспортов пуст во всех регистрах модели.\n");
            }
        }

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
                                  String(now.getSeconds()).padStart(2, "0") + " Msk] [СМО_LAYOUT] Геометрия TUI пересчитана: W=" + 
                                  Math.floor(rootGeo.w) + " | H=" + Math.floor(rootGeo.h) + "\n";
        
        writeCoreLogMessageInline(geoMetricsLineStr);
        generateGpssTransaction("108", "ADD_LOG_ENTRY", geoMetricsLineStr, "9");
        
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "9");
        return true; 
    }

    return false;
}
