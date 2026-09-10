/**
 * @file src/io/terminal/mouse/mouse_router.js
 * @version 1.2.0-RELEASE-SMO-DOD-MOUSE-ROUTER-PURE-PAC-TRIAD
 * @description Изолированный процедурный распределитель прерываний SGR-мыши.
 * ИСПРАВЛЕНО: Прикладные клики переведены на прямой сквозной вызов triad.ctl.processIntent.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { generateGpssTransaction, _gpssEngineState } from "../../../core/smo/bus.js";

let _LAST_WHEEL_TIMESTAMP = 0;
const WHEEL_DEBOUNCE_MS = 35;

/**
 * Распределяет очищенные TUI-прерывания мыши по системным и прикладным каналам
 */
export function routeMouseIntent(targetSlotIdStr, rawMouseAction, isWheelEvent, geo, localX, localY, checkX, checkY) {
    if (!targetSlotIdStr || !geo) return;

    const subZonesRegistry = _gpssEngineState.activeSubZonesRegistry;
    const currentActiveZone = Math.floor(subZonesRegistry[targetSlotIdStr] ?? 1);

    // =================================================================
    // МАРШРУТ А: СТРОКА ВКЛАДОК (Y = 1) -> НА КАНАЛ 12
    // =================================================================
    if (currentActiveZone === 0) {
        let triadIntentStr = "TAB_CLICKED";
        if (isWheelEvent === true) {
            const now = Date.now();
            if (now - _LAST_WHEEL_TIMESTAMP < WHEEL_DEBOUNCE_MS) return;
            _LAST_WHEEL_TIMESTAMP = now;
            triadIntentStr = (rawMouseAction === "WHEEL_UP") ? "SCROLL_TABS_UP" : "SCROLL_TABS_DOWN";
        }

        const triadPayload = { targetSlotId: targetSlotIdStr, localX: localX, localY: localY };
        generateGpssTransaction("12", triadIntentStr, triadPayload, "10");
        return; 
    }

    // =================================================================
    // МАРШРУТ Б: КОЛЕСИКО ИЛИ КЛИК ПО ПОЛОСЕ -> НА КАНАЛ 14 (СКРОЛЛБАР)
    // =================================================================
    const isClickOnScrollbar = (rawMouseAction === "MOUSE_CLICK" && localX === geo.w - 2);

    if (isWheelEvent === true || isClickOnScrollbar === true) {
        const now = Date.now();
        if (now - _LAST_WHEEL_TIMESTAMP < WHEEL_DEBOUNCE_MS) return;
        _LAST_WHEEL_TIMESTAMP = now;

        let scrollIntentStr = "SCROLL_CONTENT_DOWN";
        if (isWheelEvent === true) {
            scrollIntentStr = (rawMouseAction === "WHEEL_UP") ? "SCROLL_CONTENT_UP" : "SCROLL_CONTENT_DOWN";
        } else {
            scrollIntentStr = (localY < Math.floor(geo.h / 2)) ? "SCROLL_CONTENT_UP" : "SCROLL_CONTENT_DOWN";
        }

        const scrollPayload = { 
            targetSlotId: String(targetSlotIdStr), 
            localX: Math.floor(localX), 
            localY: Math.floor(localY) 
        };
        Object.preventExtensions(scrollPayload);

        generateGpssTransaction("14", scrollIntentStr, scrollPayload, "10");
        return;
    }

    // Извлекаем прибор и его текущую активную PAC-триаду из ОЗУ ядра
    const facility = _gpssEngineState.facilitiesRegistry.get(targetSlotIdStr);
    const activeIdx = facility ? Math.max(0, Math.floor(facility.activeStackIdx || 0)) : 0;
    const triad = facility && Array.isArray(facility.viewStack) ? facility.viewStack[activeIdx] : null;

    // =================================================================
    // МАРШРУТ В: МОНОМОРФНЫЙ PAC-ВЫЗОВ CONTROL-СЛОТА ТРИАДЫ (0% ШИНЫ / 0% GC)
    // =================================================================
    if (triad && triad.ctl && typeof triad.ctl.processIntent === "function") {
        const mouseContextPayload = { 
            x: checkX, y: checkY, localX: localX, localY: localY, action: rawMouseAction 
        };
        Object.preventExtensions(mouseContextPayload);

        // Клик проваливается напрямую в логику прибора без промежуточных транзактов!
        triad.ctl.processIntent(triad, rawMouseAction, mouseContextPayload);
        return;
    }

    // Фолбэк для инфраструктурных системных вызовов, если триада не уложена
    const fallbackPayload = { 
        x: checkX, y: checkY, localX: localX, localY: localY, action: rawMouseAction 
    };
    Object.preventExtensions(fallbackPayload);
    generateGpssTransaction(targetSlotIdStr, rawMouseAction, fallbackPayload, "10");
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/mouse/mouse_router.js
 * Время изменения: 10.09.2026 19:00:00 MSK
 */
