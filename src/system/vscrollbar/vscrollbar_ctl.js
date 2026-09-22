/**
 * @file src/system/vscrollbar/vscrollbar_ctl.js
 * @version 4.3.1-RELEASE-SMO-VSCROLL-ROUTER-CONNECTED
 * @description Системный WM-контроллер обслуживания Канала 14 (Infrastructure).
 * ИСПРАВЛЕНО: Все четыре интента прокрутки вкладок переведены на единый мономорфный редьюсер reduceTabsScroll.
 * Выполнен в строгой парадигме PAC / DOD / IDD / Zero Allocation.
 */

import { generateGpssTransaction, _gpssEngineState } from "../../core/smo/bus.js";

// ЛИНКОВКА РЕВИЗИИ 1.0.0-RELEASE: Импортируем объединенный мономорфный редьюсер прокрутки ушек
import { reduceTabsScroll } from "./intents/reduce_tabs_scroll.js";

export function processSystemVScrollbarLogic(facilityState, intentStr, contextPayload) {
    if (!facilityState || !contextPayload) return false;

    const intent = String(intentStr || "");
    const ctx = contextPayload;

    if (intent === "SYNC_SCROLLBAR_METRICS") {
        return false;
    }

    const targetSlotIdStr = String(ctx.targetSlotId || "102");
    const targetFacility = _gpssEngineState.facilitiesRegistry.get(targetSlotIdStr);
    if (!targetFacility) return false;

    // =================================================================
    // ВЕКТОР А: ЕДИНЫЙ МОНОМОРФНЫЙ РОУТИНГ СКРОЛЛА УШЕК ВКЛАДОК (0% ХАРДКОДА)
    // =================================================================
    if (intent === "SCROLL_TABS_UP" || intent === "SCROLL_TABS_DOWN" || intent === "ROTATE_STACK_UP" || intent === "ROTATE_STACK_DOWN") {
        return reduceTabsScroll(facilityState, intent, ctx);
    }

    // =================================================================
    // ВЕКТОР Б: ИЗОЛИРОВАННАЯ ОБРАБОТКА МУТАЦИИ ОФФСЕТА СТРОК КОНТЕНТА
    // =================================================================
    if (intent === "NOTIFY_SCROLL_MUTATED" || intent === "SCROLL_CONTENT_UP" || intent === "SCROLL_CONTENT_DOWN") {
        const kernel = _gpssEngineState.runtime;
        const activeIdx = Math.max(0, Math.floor(targetFacility.activeStackIdx || 0));
        const triad = Array.isArray(targetFacility.viewStack) ? targetFacility.viewStack[activeIdx] : targetFacility.viewStack;
        
        if (triad && triad.mdl) {
            let nextOffset = Math.max(0, Math.floor(ctx.viewportOffset || 0));
            
            if (intent === "SCROLL_CONTENT_UP") {
                nextOffset = Math.max(0, Math.floor(triad.mdl.viewportOffset || 0) - 1);
            } else if (intent === "SCROLL_CONTENT_DOWN") {
                nextOffset = Math.floor(triad.mdl.viewportOffset || 0) + 1;
            }

            if (triad.mdl.viewportOffset !== nextOffset) {
                triad.mdl.viewportOffset = nextOffset;
                triad.mdl._isDirty = true;

                if (kernel?.virtualCanvasState) {
                    kernel.virtualCanvasState.isDirty = true;
                }
                generateGpssTransaction("1", "EXECUTE_RENDER", null, "14");
                return true;
            }
        }
        return false;
    }

    return false;
}