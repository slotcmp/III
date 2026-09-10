/**
 * @file src/io/terminal/tty_mouse_parser.js
 * @version 4.9.5-RELEASE-SMO-MOUSE-PARSER-LOCAL-X-CALIBRATED
 * @description Центральный WM-диспетчер SGR-мыши.
 * ИСПРАВЛЕН КЛИК ПРОВОДНИКОВ: Математический хит-тест вкладок откалиброван по локальной оси localX.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction, _gpssEngineState } from "../../core/smo/bus.js";

let _LAST_WHEEL_TIMESTAMP = 0;
const WHEEL_DEBOUNCE_MS = 65;

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
        if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9" || slotId === "10" || slotId === "11") continue;

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

    if (localY === 0 || localY === geo.h - 1 || localX === 0 || localX === geo.w - 1) {
        subZonesRegistry[targetSlotIdStr] = 2; 
    }
    else if (localY === 1 && geo.h >= 5) {
        subZonesRegistry[targetSlotIdStr] = 0; // Вкладки (Канал 12)
    } 
    else if (localY >= 3 && localY < geo.h - 1 && geo.h >= 5) {
        subZonesRegistry[targetSlotIdStr] = 1; 
    }
    else {
        subZonesRegistry[targetSlotIdStr] = 1; 
    }

    if (rawMouseAction === "MOUSE_CLICK") {
        if (targetSlotIdStr !== "108" && kernel.model?.logicalState) {
            if (kernel.model.logicalState.focusedSlotId !== targetSlotIdStr) {
                kernel.model.logicalState.focusedSlotId = targetSlotIdStr;
                kernel.virtualCanvasState.isDirty = true;
            }
        }

        if (subZonesRegistry[targetSlotIdStr] === 2) {
            const resizePayload = { slotId: targetSlotIdStr, localX: localX, localY: localY };
            generateGpssTransaction("9", "RESIZE_SLOT_GEOMETRY", resizePayload, "10");
            return;
        }
    }

    const currentActiveZone = Math.floor(subZonesRegistry[targetSlotIdStr] ?? 1);

    // =================================================================
    // ВЫВЕРЕННЫЙ МАТЕМАТИЧЕСКИЙ ХИТ-ТЕСТ ПО СТРОКАМ .tabTitle
    // =================================================================
    if (currentActiveZone === 0) {
        let triadIntentStr = "TAB_CLICKED";
        if (isWheelEvent === true) {
            const now = Date.now();
            if (now - _LAST_WHEEL_TIMESTAMP < WHEEL_DEBOUNCE_MS) return;
            _LAST_WHEEL_TIMESTAMP = now;
            triadIntentStr = (rawMouseAction === "WHEEL_UP") ? "SCROLL_TABS_UP" : "SCROLL_TABS_DOWN";
        }

        const facility = _gpssEngineState.facilitiesRegistry.get(targetSlotIdStr);
        const stack = facility?.viewStack;
        
        let calculatedTargetTabIdx = 0;

        if (Array.isArray(stack) && stack.length > 0) {
            const stackLen = stack.length;
            let currentTabX = 2; // Начальный TUI-отступ строки Y=1 равен 2 знакоместам
            let found = false;

            for (let t = 0; t < stackLen; t++) {
                const tabPack = stack[t];
                // Надежно извлекаем имя плашки из инфраструктурного регистра
                const titleStr = String(tabPack && tabPack.tabTitle ? tabPack.tabTitle : "TAB");
                const len = titleStr.length + 2; // Ширина плашки " " + name + " "
                
                // Сверяем локальный клик мыши с границами знакомест конкретной вкладки
                if (localX >= currentTabX && localX < currentTabX + len) {
                    calculatedTargetTabIdx = t;
                    found = true;
                    break;
                }
                currentTabX += len + 1; // Сдвиг каретки на ширину вкладки плюс межвкладочный интервал
            }
            
            if (!found && isWheelEvent) {
                calculatedTargetTabIdx = Math.floor(facility.activeStackIdx || 0);
            }
        }

        const triadPayload = { 
            targetSlotId: targetSlotIdStr, 
            slotId: targetSlotIdStr, 
            localX: localX, 
            localY: localY,
            targetStackIdx: calculatedTargetTabIdx // Теперь сюда прокидывается реальный вычисленный индекс!
        };
        
        generateGpssTransaction("12", triadIntentStr, triadPayload, "10");
        return; 
    }

    // РОУТИНГ ЗОНЫ ПОЛЕЗНОГО КОНТЕНТА
    let finalIntentStr = rawMouseAction;
    if (isWheelEvent === true) {
        finalIntentStr = (rawMouseAction === "WHEEL_UP") ? "SCROLL_CONTENT_UP" : "SCROLL_CONTENT_DOWN";
    }

    const mouseContextTxPayload = { 
        x: checkX, y: checkY, localX: localX, localY: localY, action: finalIntentStr 
    };
    Object.preventExtensions(mouseContextTxPayload);

    generateGpssTransaction(targetSlotIdStr, finalIntentStr, mouseContextTxPayload, "10");
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_mouse_parser.js
 * Время исправления: 03.09.2026 17:39:15 MSK
 */
