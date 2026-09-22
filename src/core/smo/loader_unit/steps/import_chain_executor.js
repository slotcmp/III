/**
 * @file src/core/smo/loader_unit/steps/import_chain_executor.js
 * @version 1.0.1-RELEASE-SMO-STEP-IMPORT-CHAIN-PRIORITY-FIXED
 * @description Безаллокационный асинхронный импортер контроллеров с приоритетом системного адаптера.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { generateGpssTransaction } from "../../bus.js";
import { writeCoreLogMessageInline } from "../../logger_io.js";
import { loadAppSettings } from "../../../app_config.js";
import { allocateDomainView } from "../../../slot_maker/steps/view_allocator.js";

/**
 * Заглушка-пустышка (no-op) для слотов без бизнес-логики
 */
function stubNoOpControlIntentProcessor(facilityState, intentStr, payload, currentTx) {
    return false;
}

/**
 * Изолированно импортирует файл контроллера и регистрирует абстрактную PAC-триаду на шине
 */
export async function executeIsolatedImportChain(kernel, id, comp, dIdx, absoluteCtlPath, widthNum, heightNum, tabsData, activeIdxNum) {
    let specWorkerFn = null;

    if (!fs.existsSync(absoluteCtlPath)) {
        specWorkerFn = stubNoOpControlIntentProcessor;
    } else {
        try {
            const controllerUrlStr = pathToFileURL(absoluteCtlPath).href;
            const mod = await import(controllerUrlStr);
            
            // ИСПРАВЛЕНИЕ ПРИОРИТEТА: Сперва ищем старый адаптер processSpecific..., 
            // так как ядро вызывает приборы строго через него, передавая facilityState!
            const modKeys = Object.keys(mod);
            for (let k = 0; k < modKeys.length; k++) {
                if (modKeys[k].startsWith("processSpecific")) { 
                    specWorkerFn = mod[modKeys[k]]; 
                    break; 
                }
            }

            // Фолбэк: если специфичного адаптера нет, берем чистый processIntent
            if (!specWorkerFn && mod && typeof mod.processIntent === "function") {
                specWorkerFn = mod.processIntent;
            }
        } catch (err) {
            const config = loadAppSettings();
            if (!config || config.bAuditTicksBypass !== true) {
                writeCoreLogMessageInline("[IO_IMPORT_CRASH] ФАТАЛЬНЫЙ СБОЙ ИМПОРТА СЛОТА " + id + " | Ошибка: " + err.message + "\n");
            }
            return false;
        }
    }

    if (typeof specWorkerFn === "function") {
        const syncPayload = {
            slotId: id, 
            cleanDomain: comp, 
            displayIndex: dIdx, 
            workerFn: specWorkerFn, 
            createViewFn: allocateDomainView, 
            nodeWidth: widthNum, 
            nodeHeight: heightNum, 
            tabs: tabsData, 
            activeStackIdx: activeIdxNum
        };
        Object.preventExtensions(syncPayload);

        generateGpssTransaction("0", "SYNCHRONIZE_DYNAMIC_SLOT", syncPayload, "11");
        
        const config = loadAppSettings();
        if (!config || config.bAuditTicksBypass !== true) {
            writeCoreLogMessageInline("[PAC_TRIAD_READY] Успешный IoC-монтаж бизнес-панели | Слот: " + id + "\n");
        }
        return true;
    } else {
        const config = loadAppSettings();
        if (!config || config.bAuditTicksBypass !== true) {
            writeCoreLogMessageInline("[IO_IMPORT_FATAL] Не удалось извлечь контроллер для Слота " + id + "\n");
        }
        return false;
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/loader_unit/steps/import_chain_executor.js
 * Время изменения: 10.09.2026 20:03:00 MSK
 */
