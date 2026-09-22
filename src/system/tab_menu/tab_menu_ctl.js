/**
 * @file src/system/tab_menu/tab_menu_ctl.js
 * @version 11.6.5-RELEASE-SMO-TAB-MENU-TOTAL-IDD
 * @description Системный контроллер Канала 12. Реализован суверенный IDD-перехват SWITCH_SLOT_TAB.
 * Выполнен в строгой парадигме PAC / DOD / Zero Allocation / 0% GC.
 */
import { _gpssEngineState } from "../../core/smo/bus.js";
import { reduceMouseClick } from "../../core/smo/window_manager_intents/mouse_click_reducer.js";

export function processSystemTabLogic(facilityState, intentStr, contextPayload, currentTx) {
    const intent = String(intentStr || "");
    const payload = contextPayload || (currentTx ? currentTx.P3 : null);
    const m12 = facilityState?.mdl;

    if (!m12 || !m12.activeTabRegistry) return false;

    // =================================================================
    // 1. СУВЕРЕННЫЙ ПЕРЕХВАТ МОДИФИКАТОРОВ (СЛОТ 200 / 104)
    // =================================================================
    if (intent === "KEYBOARD_MODIFIER_CHANGED" && payload) {
        const targetModifierIdx = (payload.modifierIdx || 0) | 0;
        m12.activeTabRegistry[104] = targetModifierIdx;
        m12.activeTabRegistry[200] = targetModifierIdx;
        m12._isDirty = true;
        return true;
    }

    // =================================================================
    // 2. ИСПРАВЛЕНО: СУВЕРЕННЫЙ ПЕРЕХВАТ ПРОКРУТКИ ВКЛАДОК ОКOН (102, 103, 106)
    // =================================================================
    if (intent === "SWITCH_SLOT_TAB" && payload) {
        // Извлекаем, какому именно прибору предназначался свитч (по умолчанию 102)
        const targetSlotIdStr = String(currentTx?.P1 || payload.targetSlotId || "102");
        
        if (targetSlotIdStr !== "104" && targetSlotIdStr !== "200") {
            const slotNum = parseInt(targetSlotIdStr, 10) & 255;
            const targetTabIdx = (payload.targetStackIdx || 0) | 0;

            // Канал 12 САМ фиксирует индекс в своем Uint8Array и объявляет себя грязным!
            m12.activeTabRegistry[slotNum] = targetTabIdx;
            m12._isDirty = true;
            return true;
        }
    }

    // =================================================================
    // 3. КОНТУР ФИЗИЧЕСКИХ КЛИКОВ МЫШИ (TAB_CLICKED)
    // =================================================================
    if (intent === "TAB_CLICKED" && payload) {
        const localY = Math.floor(payload.localY || 0);

        if (localY === 0) {
            const targetFacility200 = _gpssEngineState.facilitiesRegistry.get("200");
            if (targetFacility200) {
                m12.activeTabRegistry[200] = (targetFacility200.activeStackIdx || 0) | 0;
                return reduceMouseClick(targetFacility200, payload);
            }
        } 
        else {
            const targetSlotIdStr = String(payload.targetSlotId || "102");
            const targetFacility = _gpssEngineState.facilitiesRegistry.get(targetSlotIdStr);
            if (targetFacility) {
                const slotNum = parseInt(targetSlotIdStr, 10) & 255;
                m12.activeTabRegistry[slotNum] = (targetFacility.activeStackIdx || 0) | 0;
                return reduceMouseClick(targetFacility, payload);
            }
        }
    }

    return false;
}