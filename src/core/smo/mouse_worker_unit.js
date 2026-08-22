/**
 * @file src/core/smo/mouse_worker_unit.js
 * @version 3.6.7-RELEASE-SMO-SYSTEM-MOUSE-ALLOCATION-SAFE
 * @description Инфраструктурный системный СМО-прибор Слота 10 (Control-контур).
 * ИСПРАВЛЕН ИНТЕНТ: Адаптирован под прием канонического сигнала MOUSE_INTERRUPT от парсера.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { generateGpssTransaction, _gpssEngineState } from "./bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";

/**
 * Фабрика сборки мономорфной структуры системного прибора мыши Слота 10
 * @param {Object} kernelRef Ссылка на ОЗУ-рантайм ядра хоста
 * @returns {Object} Запечатанное состояние прибора
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

        // Посимвольный обход исключительно активных интерактивных слотов (100+)
        for (let i = 0; i < activeFacilitiesKeys.length; i++) {
            const slotId = activeFacilitiesKeys[i];
            
            const slotIdNum = parseInt(slotId, 10);
            if (isNaN(slotIdNum) || slotIdNum < 100) {
                continue;
            }
            
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
            const currentFocusedId = String(kernel.model.logicalState.focusedSlotId || "");

            if (hitSlotIdStr !== currentFocusedId) {
                kernel.model.logicalState.focusedSlotId = hitSlotIdStr;
                
                if (typeof forceInvalidateShadowCanvas === "function") {
                    forceInvalidateShadowCanvas();
                }

                if (kernel.virtualCanvasState) {
                    kernel.virtualCanvasState.isDirty = true;
                }
                
                generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_MOUSE] Клик перевел фокус ввода на Слот: " + hitSlotIdStr + "\n");
                generateGpssTransaction("1", "EXECUTE_RENDER", null);
                isMutated = true;
            }

            const relativePayload = {
                globalX: globalX,
                globalY: globalY,
                localX: localClickX,
                localY: localClickY,
                action: mouseAction
            };
            Object.preventExtensions(relativePayload);

            generateGpssTransaction(hitSlotIdStr, mouseAction, relativePayload);
            isMutated = true;
        }
    }

    if (unitState._head === q.length) {
        q.length = 0;
        unitState._head = 0;
    }

    unitState.isProcessing = false;
    return isMutated;
}
