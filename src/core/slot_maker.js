/**
 * @file src/core/slot_maker.js
 * @version 9.2.0-RELEASE-SMO-IOC-MONOMORPHIC-FIXED
 * @description Синхронный IoC-монтажник PAC-триад приборов на шину СМО (Control-контур).
 * ИСПРАВЛЕНЫ СЛОТЫ 101/106: Массив вкладок выделяется строго для explorer, dashboard изолирован.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { registerGpssFacility } from "./smo/bus.js";
import { createAbstractFacility } from "./smo/facility_pipeline.js";

/**
 * Вспомогательный DOD-генератор мономорфных структур моделей данных
 */
function allocateDomainMdl(componentTypeStr, initialPathStr = "C:/") {
    const type = String(componentTypeStr || "").trim();
    const baseMdl = {
        _isDirty: true, itemsList: [], lines: [], buffer: "", cursor: 0, textLength: 0, cursorX: 0,
        currentDirectoryPath: String(initialPathStr),
        _cpuPercent: 35, _ramPercent: 48, _ramUsedMb: 7864, _ramTotalMb: 16384, _cpuCores: 8, totalTransactions: 0,
        themesList: [
            { id: 0, name: "1. CLASSIC STEEL", borderColorMsk: "gray" },
            { id: 1, name: "2. COBALT OCEAN",  borderColorMsk: "blue" },
            { id: 2, name: "3. AMETHYST NEON", borderColorMsk: "purple" },
            { id: 3, name: "4. MATRIX OLIVE",  borderColorMsk: "olive" },
            { id: 4, name: "5. DEEP CRIMSON",  borderColorMsk: "maroon" },
            { id: 5, name: "6. MIDNIGHT NAVY", borderColorMsk: "navy" }
        ],
        totalThemes: 6, selectedIndex: 0, maxLines: 128, logsArray: [], totalLogsCount: 0, viewportOffset: 0,
        charBuffer: new Array(256)
    };
    for (let k = 0; k < 256; k++) baseMdl.charBuffer[k] = " ";
    if (type === "logger") { for (let i = 0; i < 128; i++) baseMdl.logsArray.push(""); }
    const lenT = baseMdl.themesList.length;
    for (let i = 0; i < lenT; i++) Object.preventExtensions(baseMdl.themesList[i]);
    Object.preventExtensions(baseMdl);
    return baseMdl;
}

/**
 * ФАЗА 2: Синхронная финализация и атомарный монтаж вью-стека на шину СМО
 */
export function executeDeferredSynchronization(kernel, payload) {
    if (!kernel || !payload || !payload.slotId || !payload.cleanDomain) return false;

    const slotId = payload.slotId;
    const comp = payload.cleanDomain;
    const specificWorkerFn = payload.workerFn;
    const createViewFn = payload.createViewFn;

    const registry = kernel.model?.logicalState?.panelRegistry;
    const targetSlotBlank = registry ? registry[slotId] : null;

    // Сборка канонического абстрактного прибора СМО
    const abstractFacility = createAbstractFacility(kernel, slotId, specificWorkerFn, comp, payload.displayIndex);
    abstractFacility.activeStackIdx = Math.max(0, Math.floor(payload.activeStackIdx || 0));

    // ПРЕЦИЗИОННАЯ АЛЛОКАЦИЯ: Массив вкладок генерируется СТРОГО для файлового менеджера explorer
    if (comp === "explorer" && payload.tabs && Array.isArray(payload.tabs)) {
        const tabsCount = payload.tabs.length;
        const dynamicTabsStack = new Array(tabsCount);
        
        for (let idx = 0; idx < tabsCount; idx++) {
            const tabConfig = payload.tabs[idx];
            const tabPath = String(tabConfig?.path || "C:/");
            
            const tabViewInstance = createViewFn(slotId);
            const tabMdlInstance = allocateDomainMdl(comp, tabPath);
            
            dynamicTabsStack[idx] = { 
                mdl: tabMdlInstance, 
                view: tabViewInstance,
                tabTitle: String(tabConfig?.title || "TAB")
            };
            Object.preventExtensions(dynamicTabsStack[idx]);
        }
        abstractFacility.viewStack = dynamicTabsStack;
    } else {
        // ДЛЯ ВСЕХ ОСТАЛЬНЫХ (Dashboard, CLI, Theme, Logger) — честный плоский struct-конверт
        const singleViewInstance = createViewFn(slotId);
        
        abstractFacility.viewStack = { 
            mdl: allocateDomainMdl(comp, "C:/"), 
            view: singleViewInstance 
        };
        Object.preventExtensions(abstractFacility.viewStack);
    }

    // Накатываем физическую геометрию из IPC-пакета
    if (Array.isArray(abstractFacility.viewStack)) {
        for (let t = 0; t < abstractFacility.viewStack.length; t++) {
            const vObj = abstractFacility.viewStack[t].view;
            if (vObj) { 
                vObj.width = Math.floor(payload.nodeWidth); 
                vObj.height = Math.floor(payload.nodeHeight); 
            }
        }
    } else if (abstractFacility.viewStack.view) {
        abstractFacility.viewStack.view.width = Math.floor(payload.nodeWidth);
        abstractFacility.viewStack.view.height = Math.floor(payload.nodeHeight);
    }

    // Легитимная DOD подмена открытых полей запечатанного бланка
    if (targetSlotBlank) {
        targetSlotBlank.viewStack = abstractFacility.viewStack;
        targetSlotBlank.advanceFacility = abstractFacility.advanceFacility;
        targetSlotBlank.activeStackIdx = abstractFacility.activeStackIdx;
    }

    // Монтируем прибор на шину СМО
    registerGpssFacility(slotId, abstractFacility);
    return true;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker.js
 * Время модификации: 21.08.2026 20:22:15 MSK
 */
    