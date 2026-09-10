/**
 * @file src/modules/explorer/explorer_ctl.js
 * @version 3.9.5-RELEASE-SMO-EXPLORER-CTL-STATIC-REGISTERS-PERFECT
 * @description Контроллер и фазовый фильтр СМО-приборов Проводников (Каналы 102 и 103).
 * ИСПРАВЛЕН КРАШ EXTENSIONS: Метки двойного клика перенесены в статический ОЗУ-массив _clicksRegistry.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import path from "node:path";
import { generateGpssTransaction } from "../../core/smo/bus.js";

// Стерильный статический ОЗУ-реестр кликов под Каналы 102 и 103 (0% OOP)
// Смещение: [slotIdNum * 2] = lastClickTime, [slotIdNum * 2 + 1] = lastClickIdx
const _clicksRegistry = new Float64Array(256);

export function createExplorerController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "102");
    const ctlState = { mdl: null, view: null, host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

export function processSpecificExplorerLogic(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack) return false;

    const activeIdx = Math.max(0, Math.floor(facilityState.activeStackIdx || 0));
    const currentTabNode = pack[activeIdx];
    if (!currentTabNode || !currentTabNode.mdl || !currentTabNode.view) return false;

    const m = currentTabNode.mdl;
    const v = currentTabNode.view;
    const intent = String(intentStr || "");
    const slotIdStr = facilityState.slotId;
    let isMutated = false;

    switch (intent) {
        case "INJECT_VFS_DATA":
            if (contextPayload && contextPayload.items) {
                const srcItemsArray = contextPayload.items;
                const srcLen = srcItemsArray.length;
                const stackLen = pack.length;

                for (let i = 0; i < stackLen; i++) {
                    const node = pack[i];
                    if (node && node.mdl && node.mdl.itemsList) {
                        const targetArr = node.mdl.itemsList;
                        
                        targetArr.length = 0; 
                        for (let j = 0; j < srcLen; j++) {
                            targetArr[j] = srcItemsArray[j]; 
                        }

                        if (node.mdl.selectedIndex >= targetArr.length) {
                            node.mdl.selectedIndex = Math.max(0, targetArr.length - 1);
                        }
                        node.mdl._isDirty = true;
                    }
                }

                const maxVisibleRows = Math.max(1, Math.floor((v.height || 15) - 4));
                generateGpssTransaction("14", "SYNC_SCROLLBAR_METRICS", {
                    targetSlotId: slotIdStr,
                    totalItems: srcLen + 1, 
                    maxVisibleRows: maxVisibleRows
                }, slotIdStr);

                isMutated = true;
            }
            break;

        case "NOTIFY_SCROLL_MUTATED":
            if (contextPayload) {
                m.viewportOffset = Math.max(0, Math.floor(contextPayload.viewportOffset || 0));
                m.selectedIndex  = Math.max(0, Math.floor(contextPayload.selectedIndex || 0));
                m._isDirty = true;
                isMutated = true;
            }
            break;

        case "SWITCH_SLOT_TAB":
        case "TAB_CLICKED":
            if (contextPayload) {
                const rawIdx = contextPayload.targetStackIdx !== undefined ? contextPayload.targetStackIdx :
                               (contextPayload.tabIdx !== undefined ? contextPayload.tabIdx : undefined);

                if (rawIdx !== undefined) {
                    const targetTabIdxNum = Math.max(0, Math.floor(rawIdx || 0));
                    if (targetTabIdxNum < pack.length) {
                        facilityState.activeStackIdx = targetTabIdxNum;
                        const nextActiveNode = pack[targetTabIdxNum];
                        if (nextActiveNode && nextActiveNode.mdl) {
                            nextActiveNode.mdl._isDirty = true;
                            if (facilityState.host?.workerGateway) {
                                const currentPath = String(nextActiveNode.mdl.currentDirectoryPath || "C:/");
                                facilityState.host.workerGateway.triggerDirectoryIndexing(slotIdStr, currentPath, targetTabIdxNum);
                            }
                            isMutated = true;
                        }
                    }
                }
            }
            break;

        // =================================================================
        // НЕУЯЗВИМЫЙ ВЫЧИСЛИТЕЛЬНЫЙ КЛИК ПО СТАТИЧЕСКИМ РЕГИСТРАМ ОЗУ
        // =================================================================
        case "MOUSE_CLICK":
            if (contextPayload && contextPayload.localY !== undefined) {
                const localY = Math.floor(contextPayload.localY);
                
                if (localY >= 3) {
                    const totalItems = m.itemsList ? m.itemsList.length : 0;
                    const targetItemIdx = Math.floor((m.viewportOffset || 0) + (localY - 3));
                    
                    if (targetItemIdx >= 0 && targetItemIdx < totalItems) {
                        const targetItemObj = m.itemsList[targetItemIdx];
                        
                        if (targetItemObj) {
                            const nowTimeNum = Date.now();
                            const slotIdNum = parseInt(slotIdStr, 10) & 127;
                            
                            // Извлекаем метки времени из быстрого бинарного Float64Array
                            const timeRegistryIdx = slotIdNum * 2;
                            const idxRegistryIdx = slotIdNum * 2 + 1;

                            const lastClickTimeNum = _clicksRegistry[timeRegistryIdx];
                            const lastClickIdxNum = _clicksRegistry[idxRegistryIdx] - 1; // Корректируем смещение

                            // ПРОВЕРКА НА ДВОЙНОЙ КЛИК (< 300мс на той же строке)
                            if (targetItemIdx === lastClickIdxNum && (nowTimeNum - lastClickTimeNum) < 300) {
                                const isDir = targetItemObj.isDir === true || targetItemObj.isDirectory === true;
                                const itemNameStr = String(targetItemObj.name || "");

                                if (isDir === true) {
                                    let nextDirectoryPath = "";

                                    if (itemNameStr === "..") {
                                        nextDirectoryPath = path.dirname(String(m.currentDirectoryPath || "C:/"));
                                    } else {
                                        nextDirectoryPath = path.resolve(String(m.currentDirectoryPath || "C:/"), itemNameStr);
                                    }

                                    m.currentDirectoryPath = nextDirectoryPath;
                                    m.selectedIndex = 0; 
                                    
                                    // Обнуляем метки времени в Float64Array
                                    _clicksRegistry[timeRegistryIdx] = 0;
                                    _clicksRegistry[idxRegistryIdx] = 0;

                                    if (facilityState.host?.workerGateway) {
                                        facilityState.host.workerGateway.triggerDirectoryIndexing(slotIdStr, nextDirectoryPath, activeIdx);
                                    }
                                }
                            } else {
                                // ОДИНОЧНЫЙ КЛИК: Перемещаем курсор выделения
                                m.selectedIndex = targetItemIdx;
                                
                                // Сохраняем метки в Float64Array без расширения объектов JS
                                _clicksRegistry[timeRegistryIdx] = nowTimeNum;
                                _clicksRegistry[idxRegistryIdx] = targetItemIdx + 1; // +1 для защиты от дефолтного 0
                            }

                            m._isDirty = true;
                            isMutated = true;
                        }
                    }
                }
            }
            break;

        case "ROTATE_SLOT_STACK":
        case "UPDATE_THEME_MASK":
            m._isDirty = true;
            isMutated = true;
            break;
    }

    if (isMutated && facilityState.host?.virtualCanvasState) {
        facilityState.host.virtualCanvasState.isDirty = true;
    }

    return isMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/explorer/explorer_ctl.js
 * Время изменения: 05.09.2026 13:30:15 MSK
 */
