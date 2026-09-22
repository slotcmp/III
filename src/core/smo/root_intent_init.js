/**
 * @file src/core/smo/root_intent_init.js
 * @version 7.0.1-RELEASE-SMO-ROOT-INTENT-INIT-ROOT-INIT-PATH-FIXED
 * @description Вспомогательный процедурный блок инициализации и отложенного монтажа Канала 0.
 * ИСПРАВЛЕНО: Пути импорта синхронизированы с новой изолированной папкой intents/root_init/.
 * Выполнен в строгой парадигме PAC / DOD / IDD / 0% OOP.
 */

import { executeDeferredSynchronization } from "../slot_maker.js";
import { generateGpssTransaction } from "./bus.js";

// ИМПОРТ ИЗ ИЗОЛИРОВАННОЙ ДИРЕКТОРИИ ROOT_INIT
import { reduceInitIntent } from "./intents/root_init/init_pulse_handler.js";
import { reduceLoadSequenceCompleted } from "./intents/root_init/load_complete_handler.js";


/**
 * Проводник первичного такта холодного пуска хоста
 */
export function processInitIntent(unitState, r) {
    return reduceInitIntent(unitState, r);
}

/**
 * Центральный распределитель отложенной IoC-синхронизации триад
 */
export function processDeferredSyncIntent(unitState, payload) {
    if (!unitState || !unitState.hub || !payload) return false;
    const kernel = unitState.hub;
    
    const intentStr = String(payload.intent || "");

    // 1. ПЕРЕХВАТ ИНТЕНТА ГОТОВНОСТИ ТОПОЛОГИИ ВЕРХНЕГО УРОВНЯ
    if (intentStr === "LOAD_SEQUENCE_COMPLETED") {
        return reduceLoadSequenceCompleted(kernel);
    }

    // 2. ДЕЛИКАТНЫЙ МОНТАЖ СТРУКТУР ПАНЕЛЕЙ В РЕЕСТР ЯДРА
    const success = executeDeferredSynchronization(kernel, payload);
    
    if (success) {
        const slotIdStr = String(payload.slotId || "");
        const compTypeStr = String(payload.cleanDomain || "");
        
        // Автономный VFS-контур инициализации Проводников каталогов
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

        // Пинаем финальный рендер-барьер после монтажа каждого прибора отдельно
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "0");
    }
    return success;
}
