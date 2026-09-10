/**
 * @file src/core/smo/loader_unit.js
 * @version 4.5.0-RELEASE-SMO-LOADER-ABSTRACT-VIEWS-FINAL
 * @description IoC-прибор Канала 11.
 * ИСПРАВЛЕНА СВЯЗЬ ВЬЮХ: Извлечение локальных createViewFn вырезано. Лоадер полностью переведен на абстрактный view_allocator.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateGpssTransaction, _gpssEngineState } from "./bus.js";
import { writeCoreLogMessageInline } from "./logger_io.js";
import { loadAppSettings } from "../app_config.js";

// Импортируем наш единый абстрактный аллокатор вьюх для подстраховки линковки
import { allocateDomainView } from "../slot_maker/view_allocator.js";

let _totalSlotsToLoadCount = 0;

const _CURRENT_FILE_PATH = fileURLToPath(import.meta.url);
const _MODULES_ROOT_DIR = path.resolve(path.dirname(_CURRENT_FILE_PATH), "../../modules");

export function processSpecificLoaderLogic(facilityState, intentStr, payload, currentTx) {
    if (!facilityState) return false;
    const kernel = facilityState.host;
    if (!kernel) return false;

    const intent = String(intentStr);

    if (intent === "BOOT_LAYOUT_TREE" || intent === "RELOAD_LAYOUT") {
        const freshTopologyTree = kernel.layoutTopologyTree;
        if (!freshTopologyTree) return false;

        _totalSlotsToLoadCount = 0;

        const children = freshTopologyTree.children || [];
        _recursiveCountNodes(children);
        
        const config = loadAppSettings();
        if (!config || config.bAuditTicksBypass !== true) {
            writeCoreLogMessageInline("[LOAD_SEQUENCE] Найдено прикладных slots для гидратации: " + _totalSlotsToLoadCount + "\n");
        }
        
        if (_totalSlotsToLoadCount === 0) {
            generateGpssTransaction("0", "LOAD_SEQUENCE_COMPLETED", null, "11");
            return true;
        }

        const tasksCollectorArray = [];
        _recursiveScanAndLoadLayoutNodes(kernel, children, tasksCollectorArray);
        
        Promise.all(tasksCollectorArray).then(() => {
            if (!config || config.bAuditTicksBypass !== true) {
                writeCoreLogMessageInline("[LOAD_SEQUENCE] Все бизнес-слоты успешно гидратированы в шину.\n");
            }
            generateGpssTransaction("0", "LOAD_SEQUENCE_COMPLETED", null, "11");
        });

        return true;
    }

    return false;
}

function _recursiveCountNodes(childrenArr) {
    if (!childrenArr || !Array.isArray(childrenArr)) return;
    const len = childrenArr.length;
    for (let i = 0; i < len; i++) {
        const node = childrenArr[i];
        if (!node) continue;
        
        if (node.type === "slot" && node.id) {
            _totalSlotsToLoadCount++;
        }
        if (node.children && node.children.length > 0) {
            _recursiveCountNodes(node.children);
        }
    }
}

function _recursiveScanAndLoadLayoutNodes(kernel, childrenArr, tasksCollectorArray) {
    if (!childrenArr || !Array.isArray(childrenArr)) return;
    const len = childrenArr.length;

    for (let i = 0; i < len; i++) {
        const node = childrenArr[i];
        if (!node) continue;

        if (node.type === "slot" && node.id) {
            const id = String(node.id);
            _gpssEngineState.activeSubZonesRegistry[id] = 1;

            const comp = String(node.component || "text_panel").trim();
            const dIdx = Math.floor(node.displayIndex || 0);
            const ctlFilenameStr = comp + "_ctl.js";
            const viewFilenameStr = comp + "_view.js";

            const calculatedW = Math.floor(parseInt(node.width, 10) || 40);
            const calculatedH = Math.max(1, Math.floor(parseInt(node.height, 10) || 10));
            const initialActiveIdx = Math.max(0, Math.floor(node.activeStackIdx || 0));
            const tabsData = node.tabs || null;

            const registry = kernel.model?.logicalState?.panelRegistry;
            if (registry && !registry[id]) {
                const blankStruct = {
                    slotId: id, 
                    componentType: comp, 
                    displayIndex: dIdx, 
                    activeStackIdx: initialActiveIdx, 
                    viewStack: null, 
                    advanceFacility: null,
                    view: null,
                    mdl: null
                };
                Object.preventExtensions(blankStruct);
                registry[id] = blankStruct;
            }

            const loadPromise = _executeIsolatedImportChain(
                kernel, id, comp, dIdx, ctlFilenameStr, viewFilenameStr, 
                calculatedW, calculatedH, tabsData, initialActiveIdx
            );
            tasksCollectorArray.push(loadPromise);
        }

        if (node.children && node.children.length > 0) {
            _recursiveScanAndLoadLayoutNodes(kernel, node.children, tasksCollectorArray);
        }
    }
}

async function _executeIsolatedImportChain(kernel, id, comp, dIdx, ctlFile, viewFile, widthNum, heightNum, tabsData, activeIdxNum) {
    const absoluteCtlPath = path.join(_MODULES_ROOT_DIR, comp, ctlFile);
    
    const controllerUrlStr = pathToFileURL(absoluteCtlPath).href;

    try {
        const mod = await import(controllerUrlStr);
        let specWorkerFn = null;
        const modKeys = Object.keys(mod);
        for (let k = 0; k < modKeys.length; k++) {
            if (modKeys[k].startsWith("processSpecific")) { specWorkerFn = mod[modKeys[k]]; break; }
        }

        if (typeof specWorkerFn === "function") {
            // ИСПРАВЛЕНИЕ: Вместо ленивого импорта локальной вьюхи, пробрасываем ссылку на абстрактный allocateDomainView
            const syncPayload = {
                slotId: id, 
                cleanDomain: comp, 
                displayIndex: dIdx, 
                workerFn: specWorkerFn, 
                createViewFn: allocateDomainView, // ЖЕСТКО ГАРАНТИРУЕМ АБСТРАКТНУЮ ФАБРИКУ ЯДРА
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
        } else {
            const config = loadAppSettings();
            if (!config || config.bAuditTicksBypass !== true) {
                writeCoreLogMessageInline("[IO_IMPORT_FATAL] Не удалось извлечь контроллер для Слота " + id + "\n");
            }
        }
    } catch (err) {
        const config = loadAppSettings();
        if (!config || config.bAuditTicksBypass !== true) {
            writeCoreLogMessageInline("[IO_IMPORT_CRASH] ФАТАЛЬНЫЙ СБОЙ ЗАГРУЗКИ СЛОТА " + id + " | Ошибка: " + err.message + "\n");
        }
    }
}
