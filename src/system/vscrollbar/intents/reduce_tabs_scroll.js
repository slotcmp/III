/**
 * @file src/system/vscrollbar/intents/reduce_tabs_scroll.js
 * @version 1.0.0-RELEASE-SMO-VSCROLL-TABS-MONOMORPHIC
 * @description Единый мономорфный редьюсер прокрутки вкладок Канала 14.
 * ИСПРАВЛЕНО: Логика UP/DOWN объединена через универсальный математический шаг directionStep.
 * Выполнен в строгой парадигме PAC / DOD / Zero Allocation / 0% GC.
 */
import { generateGpssTransaction, _gpssEngineState } from "../../../core/smo/bus.js";

/**
 * Осуществляет детерминированный циклический сдвиг вкладок во всех контекстах
 */
export function reduceTabsScroll(facilityState, intentStr, contextPayload) {
    if (!contextPayload || !intentStr) return false;
    
    const intent = String(intentStr);
    const targetSlotIdStr = String(contextPayload.targetSlotId || "200");

    // Вычисляем знак математического шага: вверх = -1, вниз = +1
    const isUp = (intent === "SCROLL_TABS_UP" || intent === "ROTATE_STACK_UP");
    const directionStep = isUp ? -1 : 1;

    // =================================================================
    // КЕЙС А: ИЗОЛИРОВАННЫЙ СКРОЛЛ ВНЕШНИХ УШЕК МАСОК (СЛОТ 200 / 104)
    // =================================================================
    if (targetSlotIdStr === "200" || targetSlotIdStr === "104") {
        const fnbarFacility = _gpssEngineState.facilitiesRegistry.get("104");
        if (!fnbarFacility) return false;

        const currentModIdx = Math.max(0, Math.floor(fnbarFacility.activeStackIdx || 0));
        
        // Универсальная кольцевая формула для 4 масок модификаторов
        const nextModIdx = (currentModIdx + directionStep + 4) % 4;

        if (nextModIdx !== currentModIdx) {
            fnbarFacility.activeStackIdx = nextModIdx;
            
            const targetFacility200 = _gpssEngineState.facilitiesRegistry.get("200");
            if (targetFacility200) {
                targetFacility200.activeStackIdx = nextModIdx;
            }

            // 0% ручных мутаций чужой памяти. Системный Таб-Менеджер и ФнБар заберут транзакт сами.
            generateGpssTransaction("104", "KEYBOARD_MODIFIER_CHANGED", { modifierIdx: nextModIdx }, "200");
            return true;
        }
        return false;
    }

    // =================================================================
    // КЕЙС Б: ИЗОЛИРОВАННЫЙ СКРОЛЛ ВНУТРЕННИХ ВКЛАДОК ОКOН (102, 103, 106)
    // =================================================================
    const hostFacility = _gpssEngineState.facilitiesRegistry.get(targetSlotIdStr);
    if (!hostFacility || !Array.isArray(hostFacility.viewStack)) return false;
    
    const total = hostFacility.viewStack.length;
    if (total <= 1) return false;

    const activeIdx = Math.max(0, Math.floor(hostFacility.activeStackIdx || 0));
    
    // Универсальная кольцевая формула для n вкладок с защитой от отрицательного сдвига
    const nextIdx = (activeIdx + directionStep + total) % total;

    if (nextIdx !== activeIdx) {
        // Канал 14 мутирует только индекс прибора Window Manager, полностью исключая чужую грязь
        hostFacility.activeStackIdx = nextIdx;

        // Выстреливаем чистый абстрактный транзакт. Доменные слоты сами зажгут свои флаги!
        generateGpssTransaction(targetSlotIdStr, "SWITCH_SLOT_TAB", { targetStackIdx: nextIdx }, "14");
        return true;
    }
    return false;
}