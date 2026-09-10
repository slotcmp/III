/**
 * @file src/core/smo/root_intent_init.js
 * @version 6.4.5-RELEASE-SMO-ROOT-LAZY-VFS-FORCE-DIRTY-LIVE
 * @description Вспомогательный процедурный блок инициализации и отложенного монтажа Канала 0.
 * ИСПРАВЛЕНО ОТСУТСТВИЕ СЕТКИ: Добавлен принудительный стартовый импульс EXECUTE_RENDER при финализации загрузки.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { executeDeferredSynchronization } from "../slot_maker.js";
import { generateGpssTransaction } from "./bus.js";

export function processInitIntent(unitState, r) {
    if (!unitState || !r) return false;
    if (unitState.isSystemFullyBooted === true) return false;
    unitState.isSystemFullyBooted = true; 

    // Запускаем расчет флекс-разметки на Канале 9
    generateGpssTransaction("11", "BOOT_LAYOUT_TREE", null, "0");
    unitState.isStageHydratedAndReady = true;
    return true;
}

export function processDeferredSyncIntent(unitState, payload) {
    if (!unitState || !unitState.hub || !payload) return false;
    const kernel = unitState.hub;
    
    // Перехватываем интент завершения IoC-загрузки абсолютно всех панелей разметки
    if (payload.intent === "LOAD_SEQUENCE_COMPLETED") {
        if (kernel.virtualCanvasState) {
            // Принудительно взводим флаг грязи UHD-холста
            kernel.virtualCanvasState.isDirty = true;
        }
        // ВЫСТРЕЛИВАЕМ СТАРТОВЫЙ ИМПУЛЬС ВЫЖИГА СЕТКИ WINDOW MANAGER
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "0");
        return true;
    }

    const success = executeDeferredSynchronization(kernel, payload);
    
    if (success) {
        const slotIdStr = String(payload.slotId || "");
        const compTypeStr = String(payload.cleanDomain || "");
        
        if (compTypeStr === "explorer") {
            const configData = kernel.model?.logicalState?.appSettings;
            const pathKey = "s" + slotIdStr + "_paths";
            
            const facility = kernel.model?.logicalState?.panelRegistry[slotIdStr];
            const activeIdx = Math.max(0, Math.floor(facility?.activeStackIdx || 0));

            let startPath = "C:/";
            
            if (configData && Array.isArray(configData[pathKey])) {
                const pathsArray = configData[pathKey];
                startPath = String(pathsArray[activeIdx] || "C:/");
            } else if (configData && typeof configData[pathKey] === "string") {
                startPath = configData[pathKey];
            }
            
            const targetActiveTabMdl = facility?.viewStack?.[activeIdx]?.mdl;
            if (targetActiveTabMdl) {
                targetActiveTabMdl._isDirty = true;
            }

            if (kernel.workerGateway && typeof kernel.workerGateway.triggerDirectoryIndexing === "function") {
                kernel.workerGateway.triggerDirectoryIndexing(slotIdStr, startPath, activeIdx);
            }
        }
        
        if (kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }

        // Пинаем рендер-барьер после монтажа каждого отдельного прибора
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "0");
    }
    return success;
}
