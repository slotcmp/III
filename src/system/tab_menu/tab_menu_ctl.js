/**
 * @file src/system/tab_menu/tab_menu_ctl.js
 * @version 2.0.0-RELEASE-SMO-SYS-TAB-MENU-CTL-DECOUPLED
 * @description Системный WM-контроллер обслуживания Канала 12 (Infrastructure).
 * ИСПРАВЛЕНА СТРУКТУРА: Монолит полностью разбит на файлы в папке intents.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { _gpssEngineState } from "../../core/smo/bus.js";

// Импортируем изолированные DOD-обработчики конкретных интентов
import { handleRegistrationTabSpace } from "./intents/registration_handler.js";
import { handleTabClicked } from "./intents/click_handler.js";
import { handleScrollTabsDown } from "./intents/scroll_down_handler.js";
import { handleScrollTabsUp } from "./intents/scroll_up_handler.js";
import { handleToggleSlotCollapse } from "./intents/toggle_collapse_handler.js";

/**
 * Чистая процедура распределения и редукции прерываний Канала 12
 */
export function processSystemTabLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!contextPayload || !facilityState) return false;

    const m = facilityState.mdl;
    if (!m) return false;

    const intent = String(intentStr || "");
    const kernel = _gpssEngineState.runtime;

    // =================================================================
    // МАРШРУТ 1: КОНФИГУРАЦИЯ СЕТКИ (REGISTRATION_TAB_SPACE)
    // =================================================================
    if (intent === "REGISTRATION_TAB_SPACE") {
        return handleRegistrationTabSpace(m, contextPayload);
    }

    // =================================================================
    // МАРШРУТ 2: ТУМБЛЕР СВOРАЧИВАНИЯ ОКOН С ТАСКБАРА (TOGGLE_SLOT_COLLAPSE)
    // =================================================================
    if (intent === "TOGGLE_SLOT_COLLAPSE") {
        return handleToggleSlotCollapse(kernel, contextPayload);
    }

    // Базовая DOD-инфраструктурная валидация для навигационных интентов
    const targetSlotIdStr = String(contextPayload.targetSlotId || "");
    const slotId = Math.floor(parseInt(targetSlotIdStr, 10) || 0) & 255;
    if (slotId === 0) return false;

    const hostFacility = _gpssEngineState.facilitiesRegistry.get(targetSlotIdStr);
    if (!hostFacility || !Array.isArray(hostFacility.viewStack)) return false;

    const activeIdx = Math.max(0, Math.floor(hostFacility.activeStackIdx || 0));

    // =================================================================
    // МАРШРУТЫ 3-5: НАВИГАЦИОННЫЙ КОНТУР ВКЛАДОК ПАНЕЛЕЙ
    // =================================================================
    if (intent === "TAB_CLICKED") {
        return handleTabClicked(m, kernel, hostFacility, contextPayload, slotId, targetSlotIdStr, activeIdx);
    } 
    
    if (intent === "SCROLL_TABS_DOWN") {
        return handleScrollTabsDown(m, kernel, hostFacility, slotId, targetSlotIdStr, activeIdx);
    } 
    
    if (intent === "SCROLL_TABS_UP") {
        return handleScrollTabsUp(m, kernel, hostFacility, slotId, targetSlotIdStr, activeIdx);
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/system/tab_menu/tab_menu_ctl.js
 * Время изменения: 10.09.2026 18:07:00 MSK
 */
