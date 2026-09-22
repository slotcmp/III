/**
 * @file src/modules/fnbar/fnbar_ctl.js
 * @version 7.4.1-RELEASE-SMO-FNBAR-INTEGRATED-DECOUPLED
 * @description Контроллер Функциональной линейки (Канал 104).
 * ИСПРАВЛЕНО: Интегрирован каскадный фолбэк инфраструктурных Ui-интентов в window_manager.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { _gpssEngineState, generateGpssTransaction } from "../../core/smo/bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";
import { processGenericUiKinematics } from "../../core/smo/window_manager.js";

import { reduceKeyboardModifierChanged } from "./intents/modifier_reducer.js";
import { reduceFnKeyClicked } from "./intents/fkey_reducer.js";

// Высокоскоростной мономорфный ОЗУ-реестр JIT-ссылок на изолированные специфические редьюсеры
const _FNBAR_INTENTS_REGISTRY = new Map([
    ["KEYBOARD_MODIFIER_CHANGED", reduceKeyboardModifierChanged],
    ["FN_KEY_CLICKED", reduceFnKeyClicked]
]);

export function processIntent(triad, intentStr, contextPayload, hostFacility) {
    if (!triad || !intentStr) return false;

    const m = triad.mdl ? triad.mdl : (hostFacility?.mdl ? hostFacility.mdl : triad);
    const intent = String(intentStr || "");

    // 1. АТОМАРНЫЙ DOD-РОУТИНГ ПО СПЕЦИФИЧЕСКИМ БИЗНЕС-ИНТЕНТАМ ПАНЕЛИ ЗА O(1)
    const targetReducerFn = _FNBAR_INTENTS_REGISTRY.get(intent);
    
    if (targetReducerFn !== undefined) {
        const isMutated = targetReducerFn(m, contextPayload, hostFacility);
        
        if (isMutated === true) {
            const kernel = _gpssEngineState.runtime;
            if (kernel && kernel.virtualCanvasState) {
                kernel.virtualCanvasState.isDirty = true;
            }
            if (typeof forceInvalidateShadowCanvas === "function") {
                forceInvalidateShadowCanvas();
            }
            generateGpssTransaction("1", "EXECUTE_RENDER", null, "104");
            return true;
        }
        return false;
    }

    // =================================================================
    // 2. КАСКАДНЫЙ ФОЛБЭК НЕСПЕЦИФИЧЕСКИХ ИНТЕНТОВ В WINDOW_MANAGER
    // =================================================================
    // Если интент не доменный (например, UPDATE_THEME_MASK) — отдаем его супер-прибору
    const facility = hostFacility || _gpssEngineState.facilitiesRegistry.get("104");
    return processGenericUiKinematics(facility, intentStr, contextPayload);
}

/**
 * Адаптер IoC-загрузчика для веерного проброса интентов шины GPSS в Слот 104
 */
export function processSpecificFnbarLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;
    
    const intent = String(intentStr || "");

    // Реактивный перехват фокуса Window Manager
    if (intent === "FN_KEY_CLICKED" || intent === "KEYBOARD_MODIFIER_CHANGED") {
        const kernel = _gpssEngineState.runtime;
        if (kernel && kernel.model && kernel.model.logicalState) {
            const currentFocusedId = String(kernel.model.logicalState.focusedSlotId || "");
            if (currentFocusedId !== "104") {
                kernel.model.logicalState.focusedSlotId = "104";
                if (kernel.virtualCanvasState) kernel.virtualCanvasState.isDirty = true;
                generateGpssTransaction("108", "ADD_LOG_ENTRY", "[FOCUS_WM] Прерывание форсировало фокус на Слот 104\n", "104");
            }
        }
    }

    const payload = contextPayload ? contextPayload : (currentTx ? currentTx.P3 : {});
    return processIntent(facilityState, intentStr, payload, facilityState);
}
