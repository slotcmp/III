/**
 * @file src/io/terminal/mouse/mouse_router.js
 * @version 1.0.1-RELEASE-SMO-DOD-MOUSE-ROUTER-FNBAR-HIT-READY
 * @description Изолированный процедурный распределитель прерываний SGR-мыши.
 * ИСПРАВЛЕН ХИТ-ТЕСТ 104: Добавлен прецизионный расчет клика по 10 функциональным кнопкам Far-меню.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction, _gpssEngineState } from "../../../core/smo/bus.js";

let _LAST_WHEEL_TIMESTAMP = 0;
const WHEEL_DEBOUNCE_MS = 35;

/**
 * Распределяет очищенные TUI-прерывания мыши по системным и прикладным каналам
 */
export function routeMouseIntent(targetSlotIdStr, rawMouseAction, isWheelEvent, geo, localX, localY, checkX, checkY) {
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

    // =================================================================
    // МАРШРУТ В: СТАНДАРТНЫЙ ПРИКЛАДНОЙ КЛИК ВНУТРИ ТЕЛА ОКНА
    // =================================================================
    // ИСПРАВЛЕНИЕ: Прецизионный расчет клика Far-кнопок, если мы попали в Слот 104
    if (targetSlotIdStr === "104" && rawMouseAction === "MOUSE_CLICK") {
        const w = Math.max(40, Math.floor(geo.w || 120));
        const availableWidth = w - 2;
        const singleKeyWidth = Math.floor(availableWidth / 10);
        
        // Вычисляем индекс нажатой клавиши от 0 до 9
        const keyIdx = Math.floor((localX - 1) / singleKeyWidth);
        
        if (keyIdx >= 0 && keyIdx < 10 && localY === 1) {
            const fnPayload = { keyNumber: keyIdx + 1, localX: localX, localY: localY };
            Object.preventExtensions(fnPayload);
            
            // Транслируем очищенный клик кнопки Far-меню в его родной контроллер 104
            generateGpssTransaction("104", "FN_KEY_CLICKED", fnPayload, "10");
            return;
        }
    }

    const mouseContextTxPayload = { 
        x: checkX, y: checkY, localX: localX, localY: localY, action: rawMouseAction 
    };
    Object.preventExtensions(mouseContextTxPayload);

    generateGpssTransaction(targetSlotIdStr, rawMouseAction, mouseContextTxPayload, "10");
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/mouse/mouse_router.js
 * Время изменения: 06.09.2026 21:18:00 MSK
 */
