/**
 * @file src/core/smo/keyboard_intents/alt_focus_reducer.js
 * @version 1.1.2-RELEASE-SMO-DOD-ALT-FOCUS-PURE-NUMBERS
 * @description Изолированная DOD-процедура переключения фокуса ввода по числительному displayIndex (0-9).
 * ИСПРАВЛЕНО: Полностью удален диверсионный артефакт proceess.exit(1).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { _gpssEngineState, generateGpssTransaction, _activeThemeState } from "../bus.js";

/**
 * Перехватывает системный интент FOCUS_CHANGED_BY_NUMBER и атомарно мутирует фокус Window Manager
 */
export function reduceAltFocusIntent(kernel, intentStr, contextPayload) {
    if (!kernel || intentStr !== "FOCUS_CHANGED_BY_NUMBER" || contextPayload === undefined) return false;

    // Извлекаем чистый числовой displayIndex (поддерживаем полный цифровой ряд 0-9)
    const targetDisplayIdx = Math.floor(Number(contextPayload) || 0);
    const activeFacilitiesKeys = _gpssEngineState.facilitiesKeysCached;
    const len = activeFacilitiesKeys.length;
    let foundSlotIdStr = "";
    
    // Высокоскоростной плоский DOD-обход реестра шины
    for (let i = 0; i < len; i++) {
        const slotId = activeFacilitiesKeys[i];
        if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9" || slotId === "10" || slotId === "11" || slotId === "14") {
            continue;
        }
        
        const facility = _gpssEngineState.facilitiesRegistry.get(slotId);
        if (facility && Math.floor(facility.displayIndex || 0) === targetDisplayIdx) {
            foundSlotIdStr = slotId;
            break;
        }
    }
    
    if (foundSlotIdStr.length > 0) {
        const currentFocused = String(kernel.model?.logicalState?.focusedSlotId || "");
        
        if (foundSlotIdStr !== currentFocused) {
            // Атомарно перенаправляем указатели Window Manager и синхронизируем слой Z-2 темы оформления
            kernel.model.logicalState.focusedSlotId = foundSlotIdStr;
            _activeThemeState.focusedSlotIdStr = foundSlotIdStr;
            
            if (kernel && typeof kernel.forceInvalidateShadowCanvas === "function") {
                kernel.forceInvalidateShadowCanvas();
            }

            if (kernel.virtualCanvasState) {
                kernel.virtualCanvasState.isDirty = true;
            }
            
            generateGpssTransaction("108", "ADD_LOG_ENTRY", "[SYSTEM_KEYBOARD] Фокус ввода переведен на Слот: " + foundSlotIdStr + " по displayIndex: " + targetDisplayIdx + "\n", "4");
            generateGpssTransaction("1", "EXECUTE_RENDER", null, "4");
            return true;
        }
    }
    
    return false;
}
