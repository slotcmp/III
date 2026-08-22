/**
 * @file src/core/smo/loader_unit.js
 * @version 3.7.1-RELEASE-SMO-LOADER-ATOMIC-BARRIER
 * @description IoC-прибор Канала 11 (Control-контур).
 * СИНХРОНИЗАЦИЯ ФАЗ: Атомарный счетчик и генерация сигнала LOAD_SEQUENCE_COMPLETED без try/catch.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { generateGpssTransaction } from "./bus.js";

// Глобальные счетчики Канала 11 для контроля фазы загрузки внутри изолята
let _totalSlotsToLoadCount = 0;
let _currentLoadedSlotsCount = 0;

/**
 * Чистая процедура редукции Канала 11
 */
export function processSpecificLoaderLogic(facilityState, intentStr, payload, currentTx) {
    if (!facilityState) return false;
    const kernel = facilityState.host;
    if (!kernel) return false;

    const intent = String(intentStr);

    if (intent === "BOOT_LAYOUT_TREE" || intent === "RELOAD_LAYOUT") {
        const freshTopologyTree = kernel.layoutTopologyTree;
        if (!freshTopologyTree) return false;

        // Сбрасываем тактовые счетчики перед сканированием дерева
        _totalSlotsToLoadCount = 0;
        _currentLoadedSlotsCount = 0;

        const children = freshTopologyTree.children || [];
        
        // Пасс 1: Считаем общее количество физических слотов в дереве топологии
        _recursiveCountNodes(children);

        // Пасс 2: Запускаем импорт триад
        _recursiveScanAndLoadLayoutNodes(kernel, children);
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

function _recursiveScanAndLoadLayoutNodes(kernel, childrenArr) {
    if (!childrenArr || !Array.isArray(childrenArr)) return;
    const len = childrenArr.length;

    for (let i = 0; i < len; i++) {
        const node = childrenArr[i];
        if (!node) continue;

        if (node.type === "slot" && node.id) {
            const id = String(node.id);
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
                    slotId: id, componentType: comp, displayIndex: dIdx, activeStackIdx: initialActiveIdx,
                    viewStack: null, advanceFacility: null
                };
                Object.preventExtensions(blankStruct);
                registry[id] = blankStruct;
            }

            _executeIsolatedImportChain(kernel, id, comp, dIdx, ctlFilenameStr, viewFilenameStr, calculatedW, calculatedH, tabsData, initialActiveIdx);
        }

        if (node.children && node.children.length > 0) {
            _recursiveScanAndLoadLayoutNodes(kernel, node.children);
        }
    }
}

async function _executeIsolatedImportChain(kernel, id, comp, dIdx, ctlFile, viewFile, widthNum, heightNum, tabsData, activeIdxNum) {
    const controllerUrlStr = new URL("../../modules/" + comp + "/" + ctlFile, import.meta.url).href;
    const mod = await import(controllerUrlStr);
    
    let specWorkerFn = null;
    const modKeys = Object.keys(mod);
    for (let k = 0; k < modKeys.length; k++) {
        if (modKeys[k].startsWith("processSpecific")) { specWorkerFn = mod[modKeys[k]]; break; }
    }

    const viewUrlStr = new URL("../../modules/" + comp + "/" + viewFile, import.meta.url).href;
    const viewMod = await import(viewUrlStr);
    
    let createViewFn = null;
    const viewModKeys = Object.keys(viewMod);
    for (let v = 0; v < viewModKeys.length; v++) {
        if (viewModKeys[v].startsWith("create")) { createViewFn = viewMod[viewModKeys[v]]; break; }
    }

    if (typeof specWorkerFn === "function" && typeof createViewFn === "function") {
        const syncPayload = {
            slotId: id, cleanDomain: comp, displayIndex: dIdx, workerFn: specWorkerFn, createViewFn: createViewFn,
            nodeWidth: widthNum, nodeHeight: heightNum,
            tabs: tabsData, activeStackIdx: activeIdxNum
        };
        Object.preventExtensions(syncPayload);

        generateGpssTransaction("0", "SYNCHRONIZE_DYNAMIC_SLOT", syncPayload);
        
        _currentLoadedSlotsCount++;
        
        if (_currentLoadedSlotsCount === _totalSlotsToLoadCount) {
            generateGpssTransaction("0", "LOAD_SEQUENCE_COMPLETED", null);
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/loader_unit.js
 * Time-stamp: 22.08.2026 08:07:00 MSK
 */
