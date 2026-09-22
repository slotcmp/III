/**
 * @file src/core/smo/keyboard_intents/fkey_pulse_reducer.js
 * @version 1.0.0-RELEASE-SMO-DOD-FKEY-PULSE-REDUCER
 * @description Вынесенный редьюсер ленивого перехвата и стягивания фокуса Window Manager на Слот 104.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { generateGpssTransaction } from "../bus.js";

/**
 * Проверяет F-интенты и принудительно стягивает фокус ввода на функциональную линейку FnBar
 */
export function reduceFKeyPulseIntent(kernel, intentStr) {
    if (!kernel) return false;

    if (intentStr === "FN_KEY_CLICKED" || intentStr === "KEYBOARD_MODIFIER_CHANGED") {
        if (kernel.model && kernel.model.logicalState) {
            const currentFocusedId = String(kernel.model.logicalState.focusedSlotId || "");
            
            // Если фокус удерживает другое окно — принудительно стягиваем его на Слот 104
            if (currentFocusedId !== "104") {
                kernel.model.logicalState.focusedSlotId = "104";
                
                if (kernel.virtualCanvasState) {
                    kernel.virtualCanvasState.isDirty = true;
                }
                
                generateGpssTransaction("108", "ADD_LOG_ENTRY", "[FOCUS_WM] Клавиатурное прерывание форсировало фокус на Слот 104\n", "104");
                return true;
            }
        }
    }

    return false;
}
