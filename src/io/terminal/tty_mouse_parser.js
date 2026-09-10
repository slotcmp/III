/**
 * @file src/io/terminal/tty_mouse_parser.js
 * @version 6.2.0-RELEASE-SMO-MOUSE-PARSER-DECOUPLED
 * @description Центральный WM-диспетчер SGR-мыши платформы SLOTCMP III.
 * ИСПРАВЛЕНО МОНОЛИТИЗИРОВАНИЕ: Логика маршрутизации вынесена в изолированный модуль mouse_router.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction, _gpssEngineState, _activeThemeState } from "../../core/smo/bus.js";
import { routeMouseIntent } from "./mouse/mouse_router.js";

/**
 * Парсит байты ConPTY, выполняет O(1) хит-тест геометрии окон и переключает фокус в шине
 */
export function parseAndDispatchSgr(btn, mX, mY, isReleaseChar, staticSlots, kernel) {
    if (!kernel || !kernel.calculatedGeoMap) return;

    const checkX = Math.max(0, Math.floor(Number(mX) || 1) - 1);
    const checkY = Math.max(0, Math.floor(Number(mY) || 1) - 1);
    const buttonCode = Math.max(0, Math.floor(Number(btn) || 0));

    let rawMouseAction = "";
    let isWheelEvent = false;

    if ((buttonCode & 64) !== 0) {
        const wheelDirectionBit = buttonCode & 3;
        rawMouseAction = (wheelDirectionBit === 0) ? "WHEEL_UP" : "WHEEL_DOWN";
        isWheelEvent = true;
    } else if ((buttonCode & 3) === 0 && !isReleaseChar) {
        rawMouseAction = "MOUSE_CLICK";
    }

    if (rawMouseAction.length === 0) return;

    const activeFacilitiesKeys = _gpssEngineState.facilitiesKeysCached;
    const len = activeFacilitiesKeys.length;
    let targetSlotIdStr = "105";

    for (let i = 0; i < len; i++) {
        const slotId = activeFacilitiesKeys[i];
        if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9" || slotId === "10" || slotId === "11" || slotId === "12" || slotId === "14") {
            continue;
        }

        const geo = kernel.calculatedGeoMap[slotId];
        if (geo) {
            if (checkX >= geo.x && checkX < geo.x + geo.w && checkY >= geo.y && checkY < geo.y + geo.h) {
                targetSlotIdStr = slotId;
                break;
            }
        }
    }

    const geo = kernel.calculatedGeoMap[targetSlotIdStr];
    if (!geo) return;

    const localX = checkX - geo.x;
    const localY = checkY - geo.y;

    const subZonesRegistry = _gpssEngineState.activeSubZonesRegistry;

    // Быстрая попиксельная разметка подзон
    if (localY === 0 || localY === geo.h - 1 || localX === 0 || localX === geo.w - 1) {
        subZonesRegistry[targetSlotIdStr] = 2; // Границы окон WM
    } else if (localY === 1 && geo.h >= 5) {
        subZonesRegistry[targetSlotIdStr] = 0; // Строка Вкладок (Канал 12)
    } else {
        subZonesRegistry[targetSlotIdStr] = 1; // Контентная рабочая зона
    }

    if (rawMouseAction === "MOUSE_CLICK") {
        if (targetSlotIdStr !== "108") {
            _activeThemeState.focusedSlotIdStr = targetSlotIdStr;
            if (kernel.model?.logicalState) {
                kernel.model.logicalState.focusedSlotId = targetSlotIdStr;
            }
            kernel.virtualCanvasState.isDirty = true;
        }

        if (subZonesRegistry[targetSlotIdStr] === 2) {
            const resizePayload = { slotId: targetSlotIdStr, localX: localX, localY: localY };
            generateGpssTransaction("9", "RESIZE_SLOT_GEOMETRY", resizePayload, "10");
            return;
        }
    }

    // Делегируем тяжелую семантическую маршрутизацию размоноличенному ядру
    routeMouseIntent(targetSlotIdStr, rawMouseAction, isWheelEvent, geo, localX, localY, checkX, checkY);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_mouse_parser.js
 * Время изменения: 06.09.2026 18:55:15 MSK
 */
