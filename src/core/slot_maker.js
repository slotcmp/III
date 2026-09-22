/**
 * @file src/core/slot_maker.js
 * @version 15.4.0-RELEASE-SMO-IOC-CONVEYOR-STRICT-MONOMORPHIC-ARRAYS-FIXED
 * @description Централизованный upper-level оркестратор сборки и монтажа абстрактных PAC-триад.
 * ИСПРАВЛЕН КРАШ ИНДЕКСА: Одиночная триада в ветке else жестко укладывается в ячейку [0] массива.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { registerGpssFacility } from "./smo/bus.js";
import { createAbstractFacility } from "./smo/facility_pipeline.js";

// Импортируем изолированные шаги конвейера сборки триад (пути выровнены пользователем)
import { findTopologyNodeOrFallback } from "./slot_maker/steps/topology_finder.js";
import { buildTabNamesCache } from "./slot_maker/steps/tab_passport_builder.js";
import { assembleSingleTriadUnit } from "./slot_maker/steps/triad_assembler.js";
import { deepSealFacilityStructure } from "./slot_maker/steps/structure_sealer.js";

// Экспортируем канонический разделяемый реестр для асинхронного роутера кадра
export const _globalDynamicImportsCache = Object.create(null);

/**
 * Отложенная синхронизация и сборка PAC-агента на основе прерывания шины
 */
export function executeDeferredSynchronization(kernel, payload) {
    if (!kernel || !payload || !payload.slotId || !payload.cleanDomain) return false;

    const slotId = payload.slotId;
    const slotIdNum = parseInt(slotId, 10);
    if (!isNaN(slotIdNum) && slotIdNum < 100) return false;

    const comp = payload.cleanDomain;
    const specificWorkerFn = payload.workerFn;

    if (_globalDynamicImportsCache[comp] === undefined) {
        _globalDynamicImportsCache[comp] = undefined;
    }

    const registry = kernel.model?.logicalState?.panelRegistry;
    const targetSlotBlank = registry ? registry[slotId] : null;

    const abstractFacility = createAbstractFacility(kernel, slotId, specificWorkerFn, comp, payload.displayIndex);
    abstractFacility.activeStackIdx = Math.max(0, Math.floor(payload.activeStackIdx || 0));

    // ШАГ 1: Поиск узла топологии на плоском статическом стеке (0% GC)
    const fallbackNodeMock = findTopologyNodeOrFallback(kernel, slotId, payload.nodeWidth, payload.nodeHeight);

    // ШАГ 2: Подготовка и валидация паспортов имен вкладок
    const rawTabsArray = payload.tabs;
    const isMultiTab = !!(rawTabsArray && Array.isArray(rawTabsArray) && rawTabsArray.length > 0);
    const tabsCount = isMultiTab ? rawTabsArray.length : 1;

    const namesCacheArr = new Array(tabsCount);
    buildTabNamesCache(comp, rawTabsArray, namesCacheArr);

    // ШАГ 3: Конвейерный налив PAC-триад во вью-стек прибора
    const dynamicTabsStack = new Array(tabsCount);

    if (isMultiTab === true) {
        for (let idx = 0; idx < tabsCount; idx++) {
            const tabConfig = rawTabsArray[idx];
            const tabPath = String(tabConfig && typeof tabConfig === "object" ? (tabConfig.path || "C:/") : "C:/");
            
            dynamicTabsStack[idx] = assembleSingleTriadUnit(comp, tabPath, fallbackNodeMock, namesCacheArr[idx], namesCacheArr);
        }
    } else {
        const singleNameStr = Array.isArray(namesCacheArr) ? namesCacheArr : (namesCacheArr || String(comp).toUpperCase());
        // ИСПРАВЛЕНИЕ: Одиночную триаду пишем строго в нулевую ячейку выделенного массива dynamicTabsStack
        dynamicTabsStack[0] = assembleSingleTriadUnit(comp, "C:/", fallbackNodeMock, singleNameStr, namesCacheArr);
    }
    abstractFacility.viewStack = dynamicTabsStack;

    // Выравнивание физических метрик ширины и высоты по всем вьюхам стека (массив теперь 100% стабилен)
    for (let t = 0; t < tabsCount; t++) {
        const vObj = abstractFacility.viewStack[t].view;
        if (vObj) { 
            vObj.width = Math.floor(fallbackNodeMock._computedMinW); 
            vObj.height = Math.floor(fallbackNodeMock._computedMinH); 
        }
    }

    // Линковка собранного вью-стека с рантайм-бланком ядра для обратной совместимости
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
            abstractFacility.ctl = currentActivePack.ctl;
        }
    }

    // ШАГ 4: Глубокая послойная фиксация скрытых классов
    deepSealFacilityStructure(abstractFacility);
    
    registerGpssFacility(slotId, abstractFacility);
    return true;
}

export function finalSealingOfDynamicImportsRegistry() {
    if (Object.isExtensible(_globalDynamicImportsCache)) {
        Object.preventExtensions(_globalDynamicImportsCache);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker.js
 * Время изменения: 11.09.2026 19:35:00 MSK
 */
