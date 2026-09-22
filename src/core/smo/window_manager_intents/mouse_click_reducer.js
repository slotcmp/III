/**
 * @file src/core/smo/window_manager_intents/mouse_click_reducer.js
 * @version 2.0.5-RELEASE-SMO-DOD-WM-CLICK-FINAL-FIXED
 * @description Абсолютный инфраструктурный редьюсер кликов мыши Window Manager.
 * ИСПРАВЛЕНО: Убран ложный гвард-блокиратор activeStackIdx из Кейса Слота 200. Восстановлен клик.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */
import { generateGpssTransaction, _gpssEngineState } from "../bus.js";

export function reduceMouseClick(facility, contextPayload) {
    if (!facility || !contextPayload || contextPayload.localY === undefined || contextPayload.localX === undefined) return false;

    const clickX = Math.floor(contextPayload.localX);
    const clickY = Math.floor(contextPayload.localY);
    const targetSlotIdStr = String(facility.slotId || facility.id || "102");
    const kernel = _gpssEngineState.runtime;

    // =================================================================
    // КЕЙС А: ГЛОБАЛЬНАЯ ЛИНИЯ УШЕК (СЛОТ 200 НА Y=0) — 1-ПРОБЕЛЬНАЯ СЕТКА
    // =================================================================
    if (targetSlotIdStr === "200") {
        const tabMenuFacility = _gpssEngineState.facilitiesRegistry.get("12");
        const tabMenuMdl = tabMenuFacility ? tabMenuFacility.mdl : null;
        
        if (tabMenuMdl && tabMenuMdl.tabsVectorArray) {
            const totalTabs = Math.floor(tabMenuMdl.totalRegisteredTabsCount || 0);
            const buf = tabMenuMdl.tabsVectorArray;

            for (let t = 0; t < totalTabs; t++) {
                const offset = (t * 6) | 0; // Наш строгий шаг 6
                const sX = buf[offset + 2];
                const eX = buf[offset + 3];

                // Прецизионное сравнение координаты клика с реальными границами растра
                if (clickX >= sX && clickX <= eX) {
                    const dynamicOwnerSlotIdStr = String(buf[offset + 4]); // Извлекает "104"
                    const targetTabIdx = (buf[offset + 5]) | 0; 

                    // СИНХРОНИЗИРОВАНО: Пишем состояние и под строковым, и под числовым ключом для совместимости
                    if (tabMenuMdl.activeTabRegistry) {
                        const slotIdNum = parseInt(dynamicOwnerSlotIdStr, 10) & 255;
                        tabMenuMdl.activeTabRegistry[slotIdNum] = targetTabIdx;
                        tabMenuMdl.activeTabRegistry["104"] = targetTabIdx;
                        tabMenuMdl.activeTabRegistry["200"] = targetTabIdx;
                        tabMenuMdl._isDirty = true;
                    }

                    // Кодирование по памяти запрещено: принудительно обновляем индекс в самом фасилити 200
                    facility.activeStackIdx = targetTabIdx;

                    // Выстреливаем СМО-транзакт изменения маски модификаторов напрямую на Канал 104
                    generateGpssTransaction("104", "KEYBOARD_MODIFIER_CHANGED", { modifierIdx: targetTabIdx }, "12");

                    if (kernel?.virtualCanvasState) kernel.virtualCanvasState.isDirty = true;
                    generateGpssTransaction("1", "EXECUTE_RENDER", null, "12");
                    return true;
                }
            }
        }
        return false;
    }

    // =================================================================
    // КЕЙС Б: ВНУТРЕННИЕ ВКЛАДКИ ОКOН (TABS_IN НА Y=1)
    // =================================================================
    const isTabsLine = (targetSlotIdStr !== "200" && clickY === 1);

    if (isTabsLine) {
        if (!Array.isArray(facility.viewStack)) return false;
        const tabsCount = facility.viewStack.length;

        for (let idx = 0; idx < tabsCount; idx++) {
            const triad = facility.viewStack[idx];
            if (!triad || !triad.mdl) continue;

            const sX = Math.floor(triad.mdl._tabStartX || 0);
            const eX = Math.floor(triad.mdl._tabEndX || 0);

            if (sX > 0 && eX > 0 && clickX >= sX && clickX < eX) {
                if (idx === Math.floor(facility.activeStackIdx || 0)) return false;

                facility.activeStackIdx = idx;
                
                const tMdl = triad.mdl;
                tMdl._activeSubZone = 1; 
                tMdl._isDirty = true;

                const compType = String(facility.componentType || facility.component || "").trim();
                if (compType === "explorer" && kernel?.workerGateway) {
                    kernel.workerGateway.triggerDirectoryIndexing(targetSlotIdStr, tMdl.currentDirectoryPath, idx);
                }

                const switchPayload = { targetStackIdx: idx, tabIdx: idx };
                Object.preventExtensions(switchPayload);
                generateGpssTransaction(targetSlotIdStr, "SWITCH_SLOT_TAB", switchPayload, "12");

                if (kernel?.virtualCanvasState) kernel.virtualCanvasState.isDirty = true;
                generateGpssTransaction("1", "EXECUTE_RENDER", null, "12");
                return true;
            }
        }
        return false;
    }

    // =================================================================
    // КЕЙС В: ВЫДЕЛЕНИЕ СТРОК КОНТЕНТА В ОКНАХ (Y >= 3)
    // =================================================================
    if (clickY >= 3) {
        const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
        const triad = Array.isArray(facility.viewStack) ? facility.viewStack[activeIdx] : facility.viewStack;
        if (!triad || !triad.mdl) return false;

        const m = triad.mdl;
        const total = m.itemsList ? m.itemsList.length : (m.themesList ? m.themesList.length : Math.max(0, m.totalLogsCount || 0));
        if (total === 0) return false;

        const currentOffset = Math.floor(m.viewportOffset || 0);
        const targetArrayIdx = (clickY - 3) + currentOffset;

        if (targetArrayIdx >= 0 && targetArrayIdx < total) {
            if (m.selectedIndex === targetArrayIdx) return false;

            m.selectedIndex = targetArrayIdx;
            m._isDirty = true;

            if (kernel?.virtualCanvasState) kernel.virtualCanvasState.isDirty = true;
            generateGpssTransaction("1", "EXECUTE_RENDER", null, "12");
            return true;
        }
    }

    return false;
}