/**
 * @file src/system/tab_menu/intents/click_handler.js
 * @version 15.1.0-RELEASE-SMO-FIBER-SUPREME-STRIDE-6-FIXED
 * @description Верховный Fiber-планировщик Канала 12 с каскадным флушем скроллбаров.
 * ИСПРАВЛЕН КРАШ СДВИГА ОЗУ: Буфер переведен на строгий 6-примитивный страйд tab_indexer.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction, _gpssEngineState } from "../../../core/smo/bus.js";
import { forceInvalidateShadowCanvas } from "../../../io/terminal/flusher.js";

/**
 * Вычисляет владельца по вектору паспортов, ротирует его тело и синхронно флуширует инфраструктуру
 */
export function handleTabClickedDynamic(m, kernel, contextPayload) {
    if (!m || !kernel || !contextPayload) return true;

    const clickX = contextPayload.localX !== undefined ? Math.floor(contextPayload.localX) : 
                    (contextPayload.globalX !== undefined ? Math.floor(contextPayload.globalX) : -1);
                    
    let keeperSlotIdNum = Math.floor(contextPayload.slotIdNum || 0) & 255;
    if (keeperSlotIdNum === 105 || keeperSlotIdNum === 0) {
        keeperSlotIdNum = 12; // Фолбэк на безрамочный контейнер ушек
    }
    
    let computedOwnerSlotIdNum = 0;
    let targetTabIdx = -1;

    // 1. ЧЕСТНЫЙ ВЕКТОРНЫЙ ХИТ-ТЕСТ ПО ПАСПОРТАМ ОКOН (СТРОГО ШАГ 6)
    if (clickX !== -1) {
        const totalTabs = Math.floor(m.totalRegisteredTabsCount || 0);
        const buf = m.tabsVectorArray;

        for (let t = 0; t < totalTabs; t++) {
            const offset = (t * 6) | 0; // ИСПРАВЛЕНО: Строго шаг 6!
            
            // offset + 2 = старт X, offset + 3 = конец X (включая крайнюю ячейку растра)
            if (clickX >= buf[offset + 2] && clickX <= buf[offset + 3]) {
                if (buf[offset] === keeperSlotIdNum || keeperSlotIdNum === 12) {
                    computedOwnerSlotIdNum = buf[offset + 4]; // ownerSlotIdNum лежит на индексе 4
                    targetTabIdx = buf[offset + 5];           // Индекс вкладки лежит на индексе 5
                    break; 
                }
            }
        }
    } else if (contextPayload.isRotationRequest === true && kernel.model?.logicalState) {
        computedOwnerSlotIdNum = parseInt(kernel.model.logicalState.focusedSlotId || "104", 10) & 255;
        if (computedOwnerSlotIdNum === 105) computedOwnerSlotIdNum = 104;
    }

    // Если кликнули мимо ушек — пассивно гасим такт, освобождая шину СМО
    if (computedOwnerSlotIdNum === 0 || targetTabIdx === -1) return true;

    const targetSlotIdStr = String(computedOwnerSlotIdNum);
    const targetFacility = _gpssEngineState.facilitiesRegistry.get(targetSlotIdStr);
    if (!targetFacility || !targetFacility.viewStack) return true;

    const currentActiveIdx = Math.max(0, Math.floor(targetFacility.activeStackIdx || 0));

    if (contextPayload.isRotationRequest === true) {
        const totalTabs = Array.isArray(targetFacility.viewStack) ? targetFacility.viewStack.length : 1;
        targetTabIdx = (currentActiveIdx + 1) % totalTabs;
    }

    // =================================================================
    // FIBER-ОРКЕСТРАЦИЯ: КАСКАДНЫЙ СИНХРОННЫЙ ФЛУШ ВСЕЙ ИНФРАСТРУКТУРЫ
    // =================================================================
  if (targetTabIdx !== currentActiveIdx) {
    // ИСПРАВЛЕНО: Пишем СТРОГОВЫЙ ключ вместо примитива int во избежание деоптимизации V8
    const ownerSlotKeyStr = String(computedOwnerSlotIdNum);
    m.activeTabRegistry[ownerSlotKeyStr] = targetTabIdx; 

    // Принудительно порождаем интент получения фокуса
    generateGpssTransaction("0", "SET_SLOT_FOCUS", { targetSlotId: targetSlotIdStr }, "12");

    const scrollbarFacility = _gpssEngineState.facilitiesRegistry.get("14");
    if (scrollbarFacility && typeof scrollbarFacility.advanceFacility === "function") {
        scrollbarFacility.advanceFacility(); 
    }

    generateGpssTransaction(targetSlotIdStr, "SWITCH_SLOT_TAB", { targetStackIdx: targetTabIdx }, targetSlotIdStr);

        if (typeof targetFacility.advanceFacility === "function") {
            targetFacility.advanceFacility(); 
        }

        // Порождаем файбер коммита кадра в очередь Канала 1 (Рендерер)
        generateGpssTransaction("1", "EXECUTE_RENDER", null, targetSlotIdStr);

        if (kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }
        if (typeof forceInvalidateShadowCanvas === "function") {
            forceInvalidateShadowCanvas();
        }
    }

    return true;
}
