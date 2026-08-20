/**
 * @file src/core/smo/mouse_worker_unit.js
 * @version 1.0.0-RELEASE-SMO-SYSTEM-MOUSE-FACILITY-DOD
 * @description Инфраструктурный системный СМО-прибор Слота 10 (Control-контур).
 * Выполняет прецизионный хит-тест кликов мыши по флекс-координатам для смены фокуса.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { generateGpssTransaction } from "./bus.js";
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
 * @param {Object} unitState Состояние системного прибора 10
 * @returns {boolean} Флаг наличия мутаций рантайма
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

    const allRegisteredKeys = Object.keys(kernel.model?.logicalState?.panelRegistry || Object.create(null));

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

        // СКВОЗНОЙ DOD ХИТ-ТЕСТ: Сверяем координаты клика с флекс-геометрией всех бизнес-панелей
        for (let i = 0; i < allRegisteredKeys.length; i++) {
            const slotId = allRegisteredKeys[i];
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
                break; // Точка найдена, останавливаем проход по картам
            }
        }

        // Если клик пришелся на валидную панель интерфейса
        if (hitSlotIdStr.length > 0) {
            const currentFocusedId = String(kernel.model.logicalState.focusedSlotId || "");

            // 1. СМЕНА ФОКУСА: Если кликнули на неактивное окно — переключаем глобальный фокус ввода
            if (hitSlotIdStr !== currentFocusedId) {
                kernel.model.logicalState.focusedSlotId = hitSlotIdStr;
                
                // Сбрасываем теневое зеркало холста для гарантированной перерисовки рамок окон
                if (typeof forceInvalidateShadowCanvas === "function") {
                    forceInvalidateShadowCanvas();
                }
                
                // Фиксируем факт смены фокуса мыши в системном логгере
                generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_MOUSE] Фокус ввода переведен на Слот: " + hitSlotIdStr);
                generateGpssTransaction("1", "EXECUTE_RENDER", null);
                isMutated = true;
            }

            // 2. ТРАНСЛЯЦИЯ СОБЫТИЯ: Прокидываем СМО-транзакт клика с локальными координатами внутрь целевой панели
            const relativePayload = {
                globalX: globalX,
                globalY: globalY,
                localX: localClickX,
                localY: localClickY,
                action: mouseAction
            };
            Object.preventExtensions(relativePayload);

            // Перенаправляем интент (например, MOUSE_CLICK или MOVE_CURSOR_DOWN при скролле) в бизнес-слот
            generateGpssTransaction(hitSlotIdStr, mouseAction, relativePayload);
            isMutated = true;
        }
    }

    // Сбрасываем указатели буфера прерываний
    if (unitState._head === q.length) {
        q.length = 0;
        unitState._head = 0;
    }

    unitState.isProcessing = false;
    return isMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/mouse_worker_unit.js
 * Время модификации: 20.08.2026 18:34:10 MSK
 */
