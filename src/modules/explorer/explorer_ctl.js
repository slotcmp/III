/**
 * @file src/modules/explorer/explorer_ctl.js
 * @version 3.0.3-RELEASE-SMO-EXPLORER-CTL-DOD
 * @description Контроллер и фазовый фильтр СМО-приборов Проводников 102/103.
 * ИСПРАВЛЕНЫ ИМПОРТЫ И РАЗБОР ПУТЕЙ: Изъят path.join, разбор путей векторизован in-place.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% try-catch.
 */

import { renderExplorerContent } from "./explorer_view.js";

/**
 * Старая фабрика сохранена для совместимости автоскана V8, 
 * но рантайм GEN III использует ленивый монтаж через IoC-монтажник slot_maker.js.
 */
export function createExplorerController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "102");
    const ctlState = { viewStack: null, host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

/**
 * Фазовый СМО-фильтр супершины прерываний для Приборов Каналов 102/103
 */
export function processSpecificExplorerLogic(facilityState, intentStr, contextPayload, currentTx) {
    const tabs = facilityState.viewStack;
    if (!tabs || !Array.isArray(tabs)) return false;

    // Прецизионно вычисляем индекс активной вкладки из регистра прибора
    const activeIdx = Math.max(0, Math.min(3, Math.floor(Number(facilityState.activeStackIdx) || 0)));
    const currentTabPack = tabs[activeIdx];
    if (!currentTabPack || !currentTabPack.mdl || !currentTabPack.view) return false;

    const mdl = currentTabPack.mdl;
    const view = currentTabPack.view;
    const intent = String(intentStr || "");
    let isMutated = false;

    const maxVisibleRows = Math.max(1, view.height - 4);

    switch (intent) {
        case "INJECT_VFS_DATA":
            if (contextPayload) {
                // Синхронизируем стейт с каноническим полем currentDirectoryPath из slot_maker.js
                mdl.currentDirectoryPath = String(contextPayload.currentPath || "C:/");
                mdl.itemsList = Array.isArray(contextPayload.items) ? contextPayload.items : [];
                mdl.selectedIndex = 0; 
                mdl.viewportOffset = 0; 
                mdl._isDirty = true;
                isMutated = true;
            }
            break;

        case "MOVE_CURSOR_DOWN":
            if (mdl.itemsList && mdl.selectedIndex < mdl.itemsList.length - 1) {
                mdl.selectedIndex++;
                if (mdl.selectedIndex >= mdl.viewportOffset + maxVisibleRows) {
                    mdl.viewportOffset++;
                }
                mdl._isDirty = true; 
                isMutated = true;
            }
            break;

        case "MOVE_CURSOR_UP":
            if (mdl.selectedIndex > 0) {
                mdl.selectedIndex--;
                if (mdl.selectedIndex < mdl.viewportOffset) {
                    mdl.viewportOffset--;
                }
                mdl._isDirty = true; 
                isMutated = true;
            }
            break;

        case "MOUSE_CLICK":
            if (contextPayload && contextPayload.localY !== undefined) {
                const clickedRowIdx = Math.floor(contextPayload.localY) - 2 + mdl.viewportOffset;
                if (mdl.itemsList && clickedRowIdx >= 0 && clickedRowIdx < mdl.itemsList.length) {
                    mdl.selectedIndex = clickedRowIdx;
                    mdl._isDirty = true; 
                    isMutated = true;
                }
            }
            break;

        case "ENTER_PRESSED":
            if (mdl.itemsList && mdl.itemsList.length > 0) {
                const currentItem = mdl.itemsList[mdl.selectedIndex];
                if (currentItem && currentItem.isDir) {
                    let baseDir = String(mdl.currentDirectoryPath);
                    let nextPath = "";

                    // ПРИНЦИП 0% RegExp: Посимвольная in-place векторизация путей без модуля path
                    if (currentItem.name === "..") {
                        // Отрезаем последний сегмент пути до слэша
                        let lastSlashIdx = -1;
                        const len = baseDir.length;
                        
                        // Ищем предпоследний слэш (минуя завершающий)
                        const searchLimit = baseDir.charAt(len - 1) === "/" ? len - 2 : len - 1;
                        for (let i = searchLimit; i >= 0; i--) {
                            if (baseDir.charAt(i) === "/" || baseDir.charAt(i) === "\\") {
                                lastSlashIdx = i;
                                break;
                            }
                        }
                        
                        if (lastSlashIdx !== -1) {
                            nextPath = baseDir.substring(0, lastSlashIdx + 1);
                        } else {
                            nextPath = "C:/"; // Корневой дефолт-гвард
                        }
                    } else {
                        // Склеиваем путь с гвардом нормализации разделителей
                        if (baseDir.charAt(baseDir.length - 1) !== "/" && baseDir.charAt(baseDir.length - 1) !== "\\") {
                            baseDir += "/";
                        }
                        nextPath = baseDir + currentItem.name;
                    }

                    if (facilityState.host?.workerGateway?.triggerDirectoryIndexing) {
                        facilityState.host.workerGateway.triggerDirectoryIndexing(facilityState.slotId, nextPath, activeIdx);
                    }
                    isMutated = true;
                }
            }
            break;

        case "ROTATE_SLOT_STACK":
            // Рокировка вью-стека вкладок (Карусель 0 -> 1 -> 2 -> 3)
            const nextTabIdx = (activeIdx + 1) % 4;
            facilityState.activeStackIdx = nextTabIdx;
            
            if (facilityState.host?.workerGateway?.triggerDirectoryIndexing) {
                facilityState.host.workerGateway.triggerDirectoryIndexing(facilityState.slotId, mdl.currentDirectoryPath, nextTabIdx);
            }
            mdl._isDirty = true; 
            isMutated = true;
            break;
            
        case "UPDATE_THEME_MASK":
            mdl._isDirty = true;
            isMutated = true;
            break;
    }
    
    // ФАЗА Б МАНИФЕСТА: Вызываем отрисовщик строго в конце такта финализации мутаций
    if (isMutated || intent === "SMO_PHASE_CONTENT") {
        renderExplorerContent(view, mdl, activeIdx);
    }
    
    return isMutated;
}
