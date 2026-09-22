/**
 * @file src/system/vscrollbar/intents/handleScrollTabsUp.js
 * @version 1.0.9-RELEASE-SMO-VSCROLL-TABS-UP-ABSOLUTE-PURE
 * @description Редьюсер шага колесика вверх с деструктуризацией DOD-пакета полезной нагрузки.
 * ИСПРАВЛЕНО: Полностью удалены любые инлайновые мутации чужих флагов _isDirty и холста.
 * Выполнен в строгой парадигме PAC / DOD / Zero Allocation.
 */
import { generateGpssTransaction, _gpssEngineState } from "../../../core/smo/bus.js";

export function handleScrollTabsUp(facilityState, intentStr, contextPayload) {
    if (!contextPayload) return false;
    
    const targetSlotIdStr = String(contextPayload.targetSlotId || "200");

    // КЕЙС А: ИЗОЛИРОВАННЫЙ СКРОЛЛ ВВЕРХ ВНЕШНИХ УШЕК МАСОК (СЛОТ 200)
    if (targetSlotIdStr === "200" || targetSlotIdStr === "104") {
        const fnbarFacility = _gpssEngineState.facilitiesRegistry.get("104");
        if (!fnbarFacility) return false;

        const currentModIdx = Math.max(0, Math.floor(fnbarFacility.activeStackIdx || 0));
        const nextModIdx = (currentModIdx - 1 + 4) % 4;

        if (nextModIdx !== currentModIdx) {
            fnbarFacility.activeStackIdx = nextModIdx;
            
            const targetFacility200 = _gpssEngineState.facilitiesRegistry.get("200");
            if (targetFacility200) {
                targetFacility200.activeStackIdx = nextModIdx;
            }

            // Отправляем транзакт. Проводники и Таб-менеджер изменят стейты сами внутри своих доменов.
            generateGpssTransaction("104", "KEYBOARD_MODIFIER_CHANGED", { modifierIdx: nextModIdx }, "200");
            return true;
        }
        return false;
    }

    // КЕЙС Б: ИЗОЛИРОВАННЫЙ СКРОЛЛ ВВЕРХ ВНУТРЕННИХ ВКЛАДОК ОКOН (102, 103, 106)
    const hostFacility = _gpssEngineState.facilitiesRegistry.get(targetSlotIdStr);
    if (!hostFacility || !Array.isArray(hostFacility.viewStack)) return false;
    
    const total = hostFacility.viewStack.length;
    if (total <= 1) return false;

    const activeIdx = Math.max(0, Math.floor(hostFacility.activeStackIdx || 0));
    const nextIdx = (activeIdx - 1 + total) % total;

    if (nextIdx !== activeIdx) {
        // Канал 14 меняет только индекс в паспорте, делегируя грязь и рендер в целевой слот
        hostFacility.activeStackIdx = nextIdx;

        // Выстреливаем абстрактный транзакт. Слот 102 поймает его и сам выставит свою грязь!
        generateGpssTransaction(targetSlotIdStr, "SWITCH_SLOT_TAB", { targetStackIdx: nextIdx }, "14");
        return true;
    }
    return false;
}