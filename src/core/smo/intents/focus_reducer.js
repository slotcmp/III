/**
 * @file src/core/smo/intents/focus_reducer.js
 * @version 1.0.0-RELEASE-SMO-IDD-FOCUS-REDUCER-STRICT
 * @description Системный DOD-редьюсер обработки интента SET_SLOT_FOCUS (Канал 0).
 * Выполнен в строгой парадигме PAC / DOD / IDD / 0% OOP / Zero Allocation / 0% GC.
 */

import { _activeThemeState, generateGpssTransaction } from "../bus.js";

/**
 * Атомарно переключает глобальные и локальные регистры фокуса ввода в ОЗУ
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 * @param {Object} payloadObj Полезная нагрузка транзакта (содержит targetSlotId)
 * @returns {boolean} Флаг успешности выполнения мутации
 */
export function reduceSlotFocusChange(kernel, payloadObj) {
    if (!kernel || !payloadObj || !kernel.model?.logicalState?.panelRegistry) return false;

    const targetSlotIdStr = String(payloadObj.targetSlotId || "");
    if (targetSlotIdStr === "") return false;

    const registry = kernel.model.logicalState.panelRegistry;
    const currentFocusedIdStr = String(kernel.model.logicalState.focusedSlotId || "");

    // Если фокус не изменился — пассивно гасим такт, защищая шину от избыточных циклов
    if (targetSlotIdStr === currentFocusedIdStr) return false;

    // ШАГ 1: Запись нового фокусного слота в персистентное состояние рантайма
    kernel.model.logicalState.focusedSlotId = targetSlotIdStr;

    // ШАГ 2: ЛИКВИДАЦИЯ СЛЕПОЙ ЗОНЫ — синхронный выжиг ID напрямую в регистр шины для блайтера Z-2
    _activeThemeState.focusedSlotIdStr = targetSlotIdStr;

    // ШАГ 3: Инлейн-мутация Fast Properties флагов _isFocused на вьюхах новой активной триады
    const targetFacility = registry[targetSlotIdStr];
    if (targetFacility && Array.isArray(targetFacility.viewStack)) {
        const len = targetFacility.viewStack.length;
        for (let t = 0; t < len; t++) {
            const viewObj = targetFacility.viewStack[t]?.view;
            if (viewObj) viewObj._isFocused = true;
        }
    }

    // ШАГ 4: Сброс фокусных маркеров на вьюхах старого деактивированного прибора
    const oldFacility = registry[currentFocusedIdStr];
    if (oldFacility && Array.isArray(oldFacility.viewStack)) {
        const len = oldFacility.viewStack.length;
        for (let t = 0; t < len; t++) {
            const viewObj = oldFacility.viewStack[t]?.view;
            if (viewObj) viewObj._isFocused = false;
        }
    }

    // ШАГ 5: Взводим флаг грязи UHD-холста и генерируем ОДИН легитимный такт рендеринга на Канал 1
    if (kernel.virtualCanvasState) {
        kernel.virtualCanvasState.isDirty = true;
    }

    generateGpssTransaction("1", "EXECUTE_RENDER", null, "0");
    return true;
}
