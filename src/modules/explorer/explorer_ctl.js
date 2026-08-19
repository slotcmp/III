/**
 * @file src/modules/explorer/explorer_ctl.js
 * @version 3.1.5-RELEASE-SMO-EXPLORER-CTL-PURE-DOD
 * @description Контроллер и фазовый фильтр СМО-приборов обслуживания Каналов 102/103 (Explorer).
 * Реализует прямой маршалинг VFS-данных в ОЗУ-модели и навигацию по стрелочкам.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { createExplorerMdlInstance } from "./explorer_mdl.js";
import { createExplorerViewInstance, renderExplorerContent } from "./explorer_view.js";
import { generateGpssTransaction } from "../../core/smo/bus.js";
import path from "node:path";

/**
 * Фабрика сборки мономорфного состояния PAC-контроллера проводника со стеком вкладок
 * @param {Object} appHostRef Ссылка на ядро хоста приложения
 * @param {string} slotIdStr Идентификатор целевого слота (102 или 103)
 * @returns {Object} Запечатанная структура контроллера
 */
export function createExplorerController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "102");
    const tabsStack = new Array(4);
    for (let idx = 0; idx < 4; idx++) {
        tabsStack[idx] = { mdl: createExplorerMdlInstance(), view: createExplorerViewInstance(id) };
        tabsStack[idx].view._activeTabIdx = idx;
        Object.preventExtensions(tabsStack[idx]);
    }
    const ctlState = { viewStack: tabsStack, host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

/**
 * Фазовый СМО-фильтр супершины прерываний для Приборов Каналов 102/103
 * @param {Object} facilityState Состояние активного прибора СМО
 * @param {string} intentStr Идентификатор прерывания
 * @param {Object} contextPayload Контекст транзакта
 * @param {Object} currentTx Полный паспорт транзакта СМО
 * @returns {boolean} Флаг наличия мутаций
 */
export function processSpecificExplorerLogic(facilityState, intentStr, contextPayload, currentTx) {
    const tabs = facilityState.viewStack;
    if (!tabs) return false;

    const activeIdx = Math.max(0, Math.min(3, Math.floor(Number(facilityState.activeStackIdx) || 0)));
    const currentTabPack = tabs[activeIdx];
    if (!currentTabPack || !currentTabPack.mdl || !currentTabPack.view) return false;

    const mdl = currentTabPack.mdl;
    const view = currentTabPack.view;
    const intent = String(intentStr || "");
    let isMutated = false;

    // СМО-ФАЗА ОТРЕСОВКИ: Полностью СИНХРОННЫЙ вызов отрисовщика из статического импорта
    if (intent === "SMO_PHASE_CONTENT") {
        renderExplorerContent(view, mdl, activeIdx);
        return true;
    }

    const maxVisibleRows = Math.max(1, view.height - 4);

    switch (intent) {
        // ПРЯМОЙ МАРШАЛИНГ VFS ДАННЫХ
        case "INJECT_VFS_DATA":
            if (contextPayload) {
                mdl.currentPath = String(contextPayload.currentPath || "C:\\\\");
                mdl.itemsList = Array.isArray(contextPayload.items) ? contextPayload.items : [];
                mdl.selectedIndex = 0; 
                mdl.viewportOffset = 0; 
                mdl._isDirty = true;
                isMutated = true; // Будим тактовый автомат для блайтинга сетки файлов!
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
                const clickedRowIdx = Math.floor(contextPayload.localY) - 3 + mdl.viewportOffset;
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
                    let nextPath = mdl.currentPath;
                    if (currentItem.name === "..") {
                        nextPath = path.dirname(mdl.currentPath);
                        if (!nextPath.endsWith(path.sep)) {
                            nextPath += path.sep;
                        }
                    } else {
                        nextPath = path.join(mdl.currentPath, currentItem.name);
                    }
                    if (facilityState.host?.workerGateway?.triggerDirectoryIndexing) {
                        facilityState.host.workerGateway.triggerDirectoryIndexing(facilityState.slotId, nextPath, activeIdx);
                    }
                    isMutated = true;
                }
            }
            break;

        case "ROTATE_SLOT_STACK":
            const nextTabIdx = (activeIdx + 1) % 4;
            facilityState.activeStackIdx = nextTabIdx;
            if (facilityState.host?.workerGateway?.triggerDirectoryIndexing) {
                facilityState.host.workerGateway.triggerDirectoryIndexing(facilityState.slotId, mdl.currentPath, nextTabIdx);
            }
            mdl._isDirty = true; 
            isMutated = true;
            break;
    }
    return isMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/explorer_ctl.js
 * Время модификации: 18.08.2026 19:36:45 MSK
 */
