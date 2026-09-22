/**
 * @file src/core/smo/mouse_worker_unit.js
 * @version 6.1.0-RELEASE-SMO-MOUSE-WORKER-UNIT-SCROLL-PRIORITY-STABLE
 * @description Системный СМО-прибор Слота 10 (Оркестратор очереди Канала 10).
 * ИСПРАВЛЕНО: Инжектирован жесткий безусловный приоритет скролла над табами для защиты Канала 14.
 * Выполнен в строгой парадигме PAC / DOD / IDD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction, _gpssEngineState } from "./bus.js";
import { calculateMouseWindowHit } from "./mouse_intents/mouse_hit_test.js";
import { processFrameOrSingleRowIntent } from "./mouse_intents/mouse_frame_handler.js";

// ИСПРАВЛЕНИЕ ПУТЕЙ ESM: Сбрасываем лишний оффсет папки. 
import { evaluateMouseFocusIntent } from "./mouse_intents/focus_trigger.js";
import { routeMouseScrollIntent } from "./mouse_intents/scrollbar_router.js";
import { routeMouseTabsIntent } from "./mouse_intents/tabsbar_router.js"; 

// Преаллоцированный мономорфный ОЗУ-регистр для результатов хит-теста (0% GC)
const _localHitResultRef = { hitSlotIdStr: "", localX: 0, localY: 0, w: 0, h: 0 };
Object.preventExtensions(_localHitResultRef);

export function assembleMouseUnit(kernelRef) {
    if (!kernelRef) return null;
    const mouseFacility = {
        host: kernelRef, slotId: "10", localQueue: [], _head: 0, isProcessing: false,
        componentType: "mouse_unit", displayIndex: 10, dispatch: null, advanceFacility: null
    };
    mouseFacility.dispatch = (actionTypeStr, gpssTx) => {
        if (!gpssTx) return false;
        mouseFacility.localQueue.push(gpssTx);
        return true;
    };
    mouseFacility.advanceFacility = () => { return advanceMouseQueueFacility(mouseFacility); };
    Object.preventExtensions(mouseFacility);
    return mouseFacility;
}

export function advanceMouseQueueFacility(unitState) {
    if (!unitState || unitState.isProcessing) return false;
    
    const q = unitState.localQueue;
    if (q.length === unitState._head) return false;

    unitState.isProcessing = true;
    let isMutated = false;

    const kernel = unitState.host;
    if (!kernel || !kernel.calculatedGeoMap) {
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

        // Вызов размоноличенного калькулятора координат луча
        calculateMouseWindowHit(globalX, globalY, kernel.calculatedGeoMap, activeFacilitiesKeys, _localHitResultRef);
        
        const hitId = _localHitResultRef.hitSlotIdStr;
        if (hitId.length === 0) continue;

        const lX = _localHitResultRef.localX;
        const lY = _localHitResultRef.localY;
        const sW = _localHitResultRef.w;
        const sH = _localHitResultRef.h;

        const isWheelEvent = (mouseAction === "WHEEL_UP" || mouseAction === "WHEEL_DOWN");

        // ШАГ 1: ВЫЗОВ ВНЕШНЕГО РЕДЬЮСЕРА ФОКУСА (ГЕНЕРАЦИЯ SET_SLOT_FOCUS НА КАНАЛ 0)
        const isFocusTriggered = evaluateMouseFocusIntent(hitId, mouseAction, kernel);
        if (isFocusTriggered === true) {
            isMutated = true;
        }

        // ШАГ 2: Вызов размоноличенного редьюсера рамок верхнего уровня (Слот 200)
        const isInteracted = processFrameOrSingleRowIntent(hitId, mouseAction, lX, lY, sW, sH, kernel);
        if (isInteracted === true) {
            isMutated = true;
            continue; // Сигнал поглощен оверлеем ушек
        }

        // =================================================================
        // ШАГ 3 (ИСПРАВЛЕНО): БЕЗУСЛОВНЫЙ ВЫСШИЙ ПРИОРИТЕТ КОЛЕСИКА (SCROLL)
        // =================================================================
        // Если зафиксировано вращение колесика мыши в любой координате Y
        // (включая линию вкладок lY === 1), мгновенно маршалируем интент на Канал 14,
        // полностью запрещая Каналу 12 перехватывать такт!
        if (isWheelEvent === true) {
            const isScrollInteracted = routeMouseScrollIntent(hitId, mouseAction, lX, lY, sW, sH);
            if (isScrollInteracted === true) {
                isMutated = true;
                continue; // Импульс колесика успешно ушел скроллировать файлы
            }
        }

        // ШАГ 4: ВЫЗОВ ВНЕШНЕГО РЕДЬЮСЕРА ВНУТРЕННИХ ВКЛАДОК ОКНА (LINE Y === 1)
        // Контур вкладок Канала 12 теперь просыпается СТРОГО для кликов левой кнопкой мыши
        if (isWheelEvent === false) {
            // Внутри src/core/smo/mouse_worker_unit.js (Шаг 4):
        const isTabInteracted = routeMouseTabsIntent(hitId, mouseAction, lX, lY, globalY); // ◄── ПРОБРАСЫВАЕМ globalY

            if (isTabInteracted === true) {
                isMutated = true;
                continue; // Сигнал переключения ушек ушел на Канал 12
            }
        }

        // ШАГ 5: ВЫЗОВ ВНЕШНЕГО РЕДЬЮСЕРА СКРОЛЛБАРОВ ДЛЯ КЛИКОВ ПО ЖЕЛОБУ (MOUSE_DOWN НА ПРАВОЙ РАМКЕ)
        if (isWheelEvent === false) {
            const isScrollInteracted = routeMouseScrollIntent(hitId, mouseAction, lX, lY, sW, sH);
            if (isScrollInteracted === true) {
                isMutated = true;
                continue; // Клик по полосе прокрутки ушел на Канал 14
            }
        }

        // ШАГ 6: ПРОБРОС ОБЫЧНОГО КОНТЕНТНОГО КЛИКА В РАБОЧУЮ ЗОНУ ПАНЕЛИ (Y >= 3)
        if (lY >= 3 && isWheelEvent === false) {
            const relativePayload = { globalX: globalX, globalY: globalY, localX: lX, localY: lY, action: mouseAction };
            Object.preventExtensions(relativePayload);
            
            // Направляем транзакт на прикладной Слот-адресат (102, 103, 106, 108)
            generateGpssTransaction(hitId, mouseAction, relativePayload, "10");
            isMutated = true;
        }
    }

    if (unitState._head === q.length) {
        q.length = 0; unitState._head = 0;
    }
    unitState.isProcessing = false;
    return isMutated;
}
