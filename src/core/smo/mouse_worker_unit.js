/**
 * @file src/core/smo/mouse_worker_unit.js
 * @version 4.0.1-RELEASE-SMO-SYSTEM-MOUSE-ADMIN-OBVES-FIXED
 * @description Системный СМО-прибор Слота 10 (Control-контур).
 * ИСПРАВЛЕНЫ КРАШИ И СКРОЛЛ: Вызов инвалидации переведен на контекст ядра, добавлен перехват Канала 14.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction, _gpssEngineState } from "./bus.js";

/**
 * Фабрика сборки мономорфной структуры системного прибора мыши Слота 10
 */
export function assembleMouseUnit(kernelRef) {
    if (!kernelRef) return null;

    const mouseFacility = {
        host: kernelRef,
        slotId: "10",
        localQueue: [],
        _head: 0,
        isProcessing: false,
        
        componentType: "mouse_unit",
        displayIndex: 10,
        
        dispatch: null,
        advanceFacility: null
    };

    mouseFacility.dispatch = (actionTypeStr, gpssTx) => {
        if (!gpssTx) return false;
        mouseFacility.localQueue.push(gpssTx);
        return true;
    };

    mouseFacility.advanceFacility = () => {
        return advanceMouseQueueFacility(mouseFacility);
    };

    Object.preventExtensions(mouseFacility);
    return mouseFacility;
}

/**
 * Конвейер продвижения и хит-теста тактовой очереди прерываний мыши
 */
export function advanceMouseQueueFacility(unitState) {
    if (!unitState || unitState.isProcessing) return false;
    
    const q = unitState.localQueue;
    if (q.length === unitState._head) return false;

    unitState.isProcessing = true;
    let isMutated = false;

    const kernel = unitState.host;
    const geoMap = kernel?.calculatedGeoMap;
    if (!kernel || !geoMap) {
        unitState.isProcessing = false;
        return false;
    }

    const activeFacilitiesKeys = _gpssEngineState.facilitiesKeysCached;

    while (unitState._head < q.length) {
        const tx = q[unitState._head++];
        if (!tx || !tx.P3) continue;

        const mousePayload = tx.P3;
        const globalX = Math.floor(mousePayload.x || 0);
        const globalY = Math.floor(mousePayload.y || 0);
        const mouseAction = String(mousePayload.action || "MOUSE_CLICK");

        let hitSlotIdStr = "";
        let localClickX = 0;
        let localClickY = 0;

        for (let i = 0; i < activeFacilitiesKeys.length; i++) {
            const slotId = activeFacilitiesKeys[i];
            const slotIdNum = parseInt(slotId, 10);
            if (isNaN(slotIdNum) || slotIdNum < 100) continue;
            
            const geo = geoMap[slotId];
            if (!geo) continue;

            const xStart = Math.floor(geo.x || 0);
            const yStart = Math.floor(geo.y || 0);
            const wWidth = Math.floor(geo.w || 0);
            const hHeight = Math.floor(geo.h || 0);

            if (globalX >= xStart && globalX < xStart + wWidth &&
                globalY >= yStart && globalY < yStart + hHeight) {
                hitSlotIdStr = slotId;
                localClickX = globalX - xStart;
                localClickY = globalY - yStart;
                break; 
            }
        }

        if (hitSlotIdStr.length > 0) {
            const geo = geoMap[hitSlotIdStr];
            const w = geo ? Math.floor(geo.w || 0) : 0;

            // =================================================================
            // ПРЕЦИЗИОННЫЙ ПЕРЕХВАТ ИНФРАСТРУКТУРНОГО ОБВЕСА НА ЛИНИИ Y = 0
            // =================================================================
            if (localClickY === 0 && w > 0) {
                if (localClickX >= 3 && localClickX <= 16) {
                    generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_WM] Клик по паспорту рамы. Ротация стека Слота: " + hitSlotIdStr + "\n", "10");
                    generateGpssTransaction(hitSlotIdStr, "ROTATE_SLOT_STACK", null, "10");
                    isMutated = true;
                    continue; 
                }

                const xCollapse = w - 10;
                const xMaximize = w - 7;
                const xClose    = w - 4;

                if (localClickX >= xCollapse && localClickX <= xCollapse + 2) {
                    generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_WM] Инициирован интент COLLAPSE_SLOT на Слот: " + hitSlotIdStr + "\n", "10");
                    generateGpssTransaction("9", "COLLAPSE_SLOT_TOGGLE", { targetSlotId: hitSlotIdStr }, "10");
                    isMutated = true;
                    continue;
                }

                if (localClickX >= xMaximize && localClickX <= xMaximize + 2) {
                    generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_WM] Инициирован интент MAXIMIZE_SLOT на Слот: " + hitSlotIdStr + "\n", "10");
                    generateGpssTransaction("9", "MAXIMIZE_SLOT_TOGGLE", { targetSlotId: hitSlotIdStr }, "10");
                    isMutated = true;
                    continue;
                }

                if (localClickX >= xClose && localClickX <= xClose + 2) {
                    generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_WM] Инициирован интент DESTROY_SLOT на Слот: " + hitSlotIdStr + "\n", "10");
                    generateGpssTransaction("0", "DESTROY_SLOT", { targetSlotId: hitSlotIdStr }, "10");
                    isMutated = true;
                    continue;
                }
            }

            // Переключение фокуса ввода через контекстный метод ядра хоста
            const currentFocusedId = String(kernel.model.logicalState.focusedSlotId || "");
            if (hitSlotIdStr !== currentFocusedId) {
                kernel.model.logicalState.focusedSlotId = hitSlotIdStr;
                if (kernel && typeof kernel.forceInvalidateShadowCanvas === "function") {
                    kernel.forceInvalidateShadowCanvas();
                }
                if (kernel.virtualCanvasState) kernel.virtualCanvasState.isDirty = true;
                
                generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_MOUSE] Фокус ввода переведен на Слот: " + hitSlotIdStr + "\n", "10");
                generateGpssTransaction("1", "EXECUTE_RENDER", null, "10");
                isMutated = true;
            }

            // Транслируем клик в прикладной контур только если он опустился ниже линии Y=0
            if (localClickY > 0) {
                const relativePayload = {
                    globalX: globalX, globalY: globalY,
                    localX: localClickX, localY: localClickY,
                    action: mouseAction
                };
                Object.preventExtensions(relativePayload);

                // ИСПРАВЛЕНИЕ: Перехватываем колесико и клики по желобу скроллбара (X === w - 2) на Канал 14
                const isWheel = (mouseAction === "WHEEL_UP" || mouseAction === "WHEEL_DOWN");
                const isScrollClick = (mouseAction === "MOUSE_CLICK" && localClickX === w - 2);

                if (isWheel || isScrollClick) {
                    let scrollIntentStr = "SCROLL_CONTENT_DOWN";
                    if (isWheel) {
                        scrollIntentStr = (mouseAction === "WHEEL_UP") ? "SCROLL_CONTENT_UP" : "SCROLL_CONTENT_DOWN";
                    } else {
                        scrollIntentStr = (localClickY < Math.floor(geo.h / 2)) ? "SCROLL_CONTENT_UP" : "SCROLL_CONTENT_DOWN";
                    }
                    generateGpssTransaction("14", scrollIntentStr, { targetSlotId: hitSlotIdStr, localX: localClickX, localY: localClickY }, "10");
                } else {
                    generateGpssTransaction(hitSlotIdStr, mouseAction, relativePayload, "10");
                }
                isMutated = true;
            }
        }
    }

    if (unitState._head === q.length) {
        q.length = 0;
        unitState._head = 0;
    }

    unitState.isProcessing = false;
    return isMutated;
}
