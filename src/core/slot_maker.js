/**
 * @file src/core/slot_maker.js
 * @version 14.2.0-RELEASE-SMO-IOC-MONTAGER-LAZY-FIXED-CASCADE
 * @description Централизованный upper-level оркестратор сборки и монтажа PAC-триад.
 * ИСПРАВЛЕН КРАШ EXTENSIONS: Удален преждевременный preventExtensions над глобальным кэшем в шаге.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { registerGpssFacility } from "./smo/bus.js";
import { createAbstractFacility } from "./smo/facility_pipeline.js";
import { allocateDomainMdl } from "./slot_maker/mdl_allocator.js";
import { allocateDomainView } from "./slot_maker/view_allocator.js";
import { sealDisplayMatrixShape } from "./slot_maker/shape_sealer.js";

// Экспортируем канонический разделяемый реестр для асинхронного роутера кадра
export const _globalDynamicImportsCache = Object.create(null);

export function executeDeferredSynchronization(kernel, payload) {
    if (!kernel || !payload || !payload.slotId || !payload.cleanDomain) return false;

    const slotId = payload.slotId;
    const slotIdNum = parseInt(slotId, 10);
    if (!isNaN(slotIdNum) && slotIdNum < 100) return false;

    const comp = payload.cleanDomain;
    const specificWorkerFn = payload.workerFn;

    // =================================================================
    // ПРЕАЛЛОКАЦИЯ КЛЮЧЕЙ ИМПОРТА (РАЗРЕШЕНО, ОБЪЕКТ ЕЩЕ НЕ ЗАПЕЧАТАН)
    // =================================================================
    if (_globalDynamicImportsCache[comp] === undefined) {
        _globalDynamicImportsCache[comp] = undefined;
    }

    const registry = kernel.model?.logicalState?.panelRegistry;
    const targetSlotBlank = registry ? registry[slotId] : null;

    const abstractFacility = createAbstractFacility(kernel, slotId, specificWorkerFn, comp, payload.displayIndex);
    abstractFacility.activeStackIdx = Math.max(0, Math.floor(payload.activeStackIdx || 0));

    const rootLayoutNode = kernel.layoutTopologyTree;
    let currentLayoutNodeRef = null;
    
    const findNode = (node) => {
        if (!node || currentLayoutNodeRef) return;
        if (String(node.id || "") === String(slotId)) {
            currentLayoutNodeRef = node;
            return;
        }
        if (node.children && node.children.length > 0) {
            const cLen = node.children.length;
            for (let k = 0; k < cLen; k++) findNode(node.children[k]);
        }
    };
    findNode(rootLayoutNode);

    const fallbackNodeMock = currentLayoutNodeRef || { id: slotId, _computedMinW: payload.nodeWidth, _computedMinH: payload.nodeHeight };

    if (payload.tabs && Array.isArray(payload.tabs) && payload.tabs.length > 0) {
        const tabsCount = payload.tabs.length;
        const dynamicTabsStack = new Array(tabsCount);
        const namesCacheArr = new Array(tabsCount);
        
        for (let idx = 0; idx < tabsCount; idx++) {
            const tCfg = payload.tabs[idx];
            let titleStr = String(tCfg && typeof tCfg === "object" ? (tCfg.title || tCfg.name || "") : "");
            if (titleStr.length === 0) titleStr = "T" + String(idx + 1);
            namesCacheArr[idx] = titleStr;
        }

        for (let idx = 0; idx < tabsCount; idx++) {
            const tabConfig = payload.tabs[idx];
            const tabPath = String(tabConfig && typeof tabConfig === "object" ? (tabConfig.path || "C:/") : "C:/");
            
            const tabViewInstance = allocateDomainView(comp, fallbackNodeMock);
            const tabMdlInstance = allocateDomainMdl(comp, tabPath);
            
            tabMdlInstance._localTabTitle = namesCacheArr[idx];
            tabMdlInstance._globalTabsNamesCached = namesCacheArr;

            if (tabViewInstance && tabViewInstance.localBuffer && tabViewInstance.localBuffer.matrix) {
                sealDisplayMatrixShape(tabViewInstance.localBuffer.matrix);
            }

            dynamicTabsStack[idx] = { 
                mdl: tabMdlInstance, 
                view: tabViewInstance,
                tabTitle: namesCacheArr[idx]
            };
        }
        abstractFacility.viewStack = dynamicTabsStack;
    } else {
        const singleTabsStack = []; 
        const singleViewInstance = allocateDomainView(comp, fallbackNodeMock);
        const singleMdlInstance = allocateDomainMdl(comp, "C:/");
        const singleNameStr = String(comp).toUpperCase();
        
        const singleCache = [singleNameStr];
        singleMdlInstance._localTabTitle = singleNameStr;
        singleMdlInstance._globalTabsNamesCached = singleCache;

        if (singleViewInstance && singleViewInstance.localBuffer && singleViewInstance.localBuffer.matrix) {
            sealDisplayMatrixShape(singleViewInstance.localBuffer.matrix);
        }

        singleTabsStack.push({
            mdl: singleMdlInstance,
            view: singleViewInstance,
            tabTitle: singleNameStr
        });
        abstractFacility.viewStack = singleTabsStack;
    }

    for (let t = 0; t < abstractFacility.viewStack.length; t++) {
        const vObj = abstractFacility.viewStack[t].view;
        if (vObj) { 
            vObj.width = Math.floor(fallbackNodeMock._computedMinW); 
            vObj.height = Math.floor(fallbackNodeMock._computedMinH); 
        }
    }

    if (targetSlotBlank) {
        targetSlotBlank.viewStack = abstractFacility.viewStack;
        targetSlotBlank.advanceFacility = abstractFacility.advanceFacility;
        targetSlotBlank.activeStackIdx = abstractFacility.activeStackIdx;

        const activeIdxNum = Math.floor(abstractFacility.activeStackIdx || 0);
        const currentActivePack = abstractFacility.viewStack[activeIdxNum];
        
        if (currentActivePack) {
            targetSlotBlank.view = currentActivePack.view;
            targetSlotBlank.mdl = currentActivePack.mdl;
            abstractFacility.view = currentActivePack.view;
            abstractFacility.mdl = currentActivePack.mdl;
        }
    }

    _deepSealFacilityStructure(abstractFacility);
    registerGpssFacility(slotId, abstractFacility);
    return true;
}

function _deepSealFacilityStructure(facility) {
    if (!facility) return;
    const stack = facility.viewStack;
    if (Array.isArray(stack)) {
        const len = stack.length;
        for (let i = 0; i < len; i++) {
            const pack = stack[i];
            if (!pack) continue;
            if (pack.mdl) {
                if (Array.isArray(pack.mdl._globalTabsNamesCached) && Object.isExtensible(pack.mdl._globalTabsNamesCached)) {
                    Object.preventExtensions(pack.mdl._globalTabsNamesCached);
                }
                Object.preventExtensions(pack.mdl);
            }
            if (pack.view) {
                if (pack.view.localBuffer) Object.preventExtensions(pack.view.localBuffer);
                Object.preventExtensions(pack.view);
            }
            Object.preventExtensions(pack);
        }
        Object.preventExtensions(stack);
    }
    Object.preventExtensions(facility);
}

/**
 * ИСПРАВЛЕНИЕ: Вынесенная суверенная процедура окончательной заморозки кэша импортов.
 * Должна вызываться один раз из src/main.js или bootstrap.js ПОСЛЕ завершения LOAD_SEQUENCE_COMPLETED.
 */
export function finalSealingOfDynamicImportsRegistry() {
    if (Object.isExtensible(_globalDynamicImportsCache)) {
        Object.preventExtensions(_globalDynamicImportsCache);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker.js
 * Время модификации: 09.09.2026 13:49:12 MSK
 */
