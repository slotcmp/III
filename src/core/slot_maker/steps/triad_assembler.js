/**
 * @file src/core/slot_maker/steps/triad_assembler.js
 * @version 1.0.1-RELEASE-SMO-STEP-TRIAD-ASSEMBLER-PROXIES-FIXED
 * @description Изолированная DOD-процедура сборки абстрактных PAC-триад с поддержкой плоских окон.
 * ИСПРАВЛЕНО: Прокси-шлюзы научены безопасно обрабатывать как массивы вкладок, так и одиночные окна.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { allocateDomainMdl } from "./mdl_allocator.js";
import { allocateDomainView } from "./view_allocator.js";
import { sealDisplayMatrixShape } from "./shape_sealer.js";
import { _globalDynamicImportsCache } from "../../slot_maker.js";

/**
 * Универсальный высокоскоростной прокси-шлюз ядра для ленивого рендеринга (0% Switch)
 */
function proxyLazyRenderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack) {
    if (!viewStack) return;
    
    // ИСПРАВЛЕНИЕ: Безопасное определение PAC-узла как для массивов вкладок, так и для плоских объектов окон
    const activePack = Array.isArray(viewStack) ? viewStack[activeTabIdx] : viewStack;
    const compNameStr = activePack ? activePack._componentDomainCached : "";
    
    const loadedModule = _globalDynamicImportsCache[compNameStr];
    if (loadedModule && typeof loadedModule.renderContent === "function") {
        loadedModule.renderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack);
    }
}

/**
 * Универсальный высокоскоростной прокси-шлюз ядра для ленивой обработки прерываний
 */
function proxyLazyProcessIntent(triad, intentStr, payload) {
    const compNameStr = triad ? triad._componentDomainCached : "";
    const loadedModule = _globalDynamicImportsCache[compNameStr];
    if (loadedModule && typeof loadedModule.processIntent === "function") {
        return loadedModule.processIntent(triad, intentStr, payload);
    }
    return false;
}

/**
 * Физически собирает и скручивает PAC-триаду для конкретной вкладки (0% OOP)
 */
export function assembleSingleTriadUnit(comp, tabPath, nodeMock, titleStr, fullNamesList) {
    const tabViewInstance = allocateDomainView(comp, nodeMock);
    const tabMdlInstance = allocateDomainMdl(comp, tabPath);
    
    if (tabMdlInstance) {
        tabMdlInstance._localTabTitle = titleStr;
        tabMdlInstance._globalTabsNamesCached = fullNamesList;
    }

    if (tabViewInstance && tabViewInstance.localBuffer && tabViewInstance.localBuffer.matrix) {
        sealDisplayMatrixShape(tabViewInstance.localBuffer.matrix);
    }

    // Собираем мономорфный PAC-паспорт
    const triadUnit = {
        mdl: tabMdlInstance,
        view: tabViewInstance,
        ctl: {
            renderContent: proxyLazyRenderContent,
            processIntent: proxyLazyProcessIntent
        },
        tabTitle: titleStr,
        _componentDomainCached: comp
    };

    Object.preventExtensions(triadUnit.ctl); // Сразу запечатываем VTABLE
    Object.preventExtensions(triadUnit);
    return triadUnit;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker/steps/triad_assembler.js
 * Время изменения: 10.09.2026 21:07:00 MSK
 */
