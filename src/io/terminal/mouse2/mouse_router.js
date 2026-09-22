/**
 * @file src/io/terminal/mouse/mouse_router.js
 * @version 2.0.1-RELEASE-SMO-WM-ANTI-STORM-PROXIED-STRICT-CLICK
 * @description Системный процедурный распределитель прерываний SGR-мыши.
 * ИСПРАВЛЕНО: Условие перехвата адаптировано под физические фазы MOUSE_DOWN / MOUSE_UP.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction, _gpssEngineState } from "../../../core/smo/bus.js";

let _LAST_WHEEL_TIMESTAMP = 0;
const WHEEL_DEBOUNCE_MS = 35;

export function routeMouseIntent(targetSlotIdStr, rawMouseAction, isWheelEvent, geo, localX, localY, checkX, checkY) {
    let cleanTargetId = String(targetSlotIdStr || "");
    const action = String(rawMouseAction || "");

    // =================================================================
    // ИСПРАВЛЕНИЕ АЛГОРИТМА: ИЗОЛИРОВАННЫЙ КОНТУР ИНФРАСТРУКТУРЫ СЛОТА 12
    // =================================================================
    if (cleanTargetId === "200") {
        const kernel = _gpssEngineState.runtime;
        const currentFocusedId = String(kernel?.model?.logicalState?.focusedSlotId || "");

        // 1. ЛЕНИВЫЙ перевод фокуса Window Manager на Слот 104 без тактового спама
        if (currentFocusedId !== "104" && kernel?.model?.logicalState) {
            kernel.model.logicalState.focusedSlotId = "104";
            if (kernel.virtualCanvasState) {
                kernel.virtualCanvasState.isDirty = true;
            }
            generateGpssTransaction("108", "ADD_LOG_ENTRY", "[TABSBAR_200] Активный фокус переведен на Слот-Собственник: 104\n", "10");
        }

        // 2. МАРШАЛИНГ ОБЫЧНОГО КЛИКА -> На Канал 12 по физическим фазам DOWN/UP/CLICK
        if (isWheelEvent === false && (action === "MOUSE_DOWN" || action === "MOUSE_UP" || action === "MOUSE_CLICK")) {
            // Принудительно передаем "12" как маркер Хранителя и пробрасываем localY (globalY)
            generateGpssTransaction("12", "TAB_CLICKED", { 
                targetSlotId: "12", 
                localX: Math.floor(localX),
                localY: Math.floor(localY), // Передаем Y для 6-примитивного хит-теста
                mousePhase: action
            }, "10");
            return;
        }

        // 3. Маршалинг СКРОЛЛА по Слоту 200 -> На Канал 14 для ротации Far-клавиш
        if (isWheelEvent === true) {
            const now = Date.now();
            if (now - _LAST_WHEEL_TIMESTAMP < WHEEL_DEBOUNCE_MS) return;
            _LAST_WHEEL_TIMESTAMP = now;

            const triadIntentStr = (action === "WHEEL_UP") ? "SCROLL_TABS_UP" : "SCROLL_TABS_DOWN";
            const triadPayload = { targetSlotId: "104", localX: localX, localY: localY, fromOrigin200: true };
            Object.preventExtensions(triadPayload);

            generateGpssTransaction("14", triadIntentStr, triadPayload, "10");
            return;
        }
        return;
    }

    // Возвращаем штатные гварды для файловых панелей каталогов
    if (cleanTargetId === "" || !geo) return;

    const subZonesRegistry = _gpssEngineState.activeSubZonesRegistry;

    // =================================================================
    // МАРШРУТ Б: КОЛЕСИКО ИЛИ КЛИК ПО ПОЛОСЕ В КАТАЛОГАХ -> НА КАНАЛ 14
    // =================================================================
    const isClickOnScrollbar = ((action === "MOUSE_CLICK" || action === "MOUSE_DOWN") && localX === geo.w - 2);

    if (isWheelEvent === true || isClickOnScrollbar === true) {
        const now = Date.now();
        if (now - _LAST_WHEEL_TIMESTAMP < WHEEL_DEBOUNCE_MS) return;
        _LAST_WHEEL_TIMESTAMP = now;

        let scrollIntentStr = "SCROLL_CONTENT_DOWN";
        if (isWheelEvent === true) {
            scrollIntentStr = (action === "WHEEL_UP") ? "SCROLL_CONTENT_UP" : "SCROLL_CONTENT_DOWN";
        } else {
            scrollIntentStr = (localY < Math.floor(geo.h / 2)) ? "SCROLL_CONTENT_UP" : "SCROLL_CONTENT_DOWN";
        }

        const scrollPayload = { 
            targetSlotId: String(cleanTargetId), 
            localX: Math.floor(localX), 
            localY: Math.floor(localY)  
        };
        Object.preventExtensions(scrollPayload);

        generateGpssTransaction("14", scrollIntentStr, scrollPayload, "10");
        return;
    }

    // Мономорфный PAC-вызов Control-слота триады при клике мыши
    const facility = _gpssEngineState.facilitiesRegistry.get(cleanTargetId);
    const activeIdx = facility ? Math.max(0, Math.floor(facility.activeStackIdx || 0)) : 0;
    const triad = facility && Array.isArray(facility.viewStack) ? facility.viewStack[activeIdx] : null;

    if (triad && triad.ctl && typeof triad.ctl.processIntent === "function") {
        const mouseContextPayload = { 
            x: checkX, y: checkY, localX: localX, localY: localY, action: action  
        };
        Object.preventExtensions(mouseContextPayload);

        triad.ctl.processIntent(triad, action, mouseContextPayload);
        return;
    }

    const fallbackPayload = { x: checkX, y: checkY, localX: localX, localY: localY, action: action };
    Object.preventExtensions(fallbackPayload);
    generateGpssTransaction(cleanTargetId, action, fallbackPayload, "10");
}
