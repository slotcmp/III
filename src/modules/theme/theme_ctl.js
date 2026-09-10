
/**
 * @file src/modules/theme/theme_ctl.js
 * @version 4.4.1-RELEASE-SMO-THEME-CTL-SCROLL-CONVERGED-FIXED
 * @description Контроллер и фазовый фильтр СМО-прибора обслуживания Канала 106 (Theme Selector).
 * ИСПРАВЛЕНО КОЛЕСИКО: Удален ошибочный гвард targetSlotId из контура нотификаций VScrollbar.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { generateGpssTransaction, _gpssEngineState } from "../../core/smo/bus.js";

export function createThemeController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "106");
    const ctlState = { mdl: null, view: null, host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

export function processSpecificThemeLogic(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack) return false;

    const node = Array.isArray(pack) ? pack[0] : pack;
    if (!node || !node.mdl || !node.view) return false;

    const m = node.mdl;
    const v = node.view;
    
    const intent = String(intentStr || "");
    let isMutated = false;

    const list = m.themesList || [];
    const totalThemesNum = list.length;
    const maxVisibleRows = Math.max(1, Math.floor((v.height || 16) - 5));

    const vScrollMdl = _gpssEngineState.facilitiesRegistry.get("14")?.mdl;
    const currentOffset = vScrollMdl ? Math.max(0, Math.floor(vScrollMdl.viewportOffsetRegistry[106] || 0)) : 0;

    switch (intent) {
        // =================================================================
        // ПРЕЦИЗИОННОЕ ИСПРАВЛЕНИЕ: ПРИЕМ СДВИГА КОЛЕСИКА ОТ КАНАЛА 14
        // =================================================================
        case "NOTIFY_SCROLL_MUTATED":
            if (contextPayload) {
                // Атомарно забираем сдвинутый индекс
                m.selectedIndex = Math.max(0, Math.min(totalThemesNum - 1, Math.floor(contextPayload.selectedIndex || 0)));
                m._isDirty = true;

                // Сразу же выстреливаем команду смены масок рамы для реактивности TUI
                const targetThemeObj = list[m.selectedIndex];
                if (targetThemeObj) {
                    generateGpssTransaction("0", "GLOBAL_THEME_CHANGED", { 
                        colorMask: String(targetThemeObj.borderColorMsk || "gray"),
                        passiveMask: String(targetThemeObj.passiveColorMsk || "darkgray")
                    }, "106");
                }
                isMutated = true;
            }
            break;

        case "MOUSE_CLICK":
            if (contextPayload && contextPayload.localY !== undefined) {
                const clickY = Math.floor(contextPayload.localY);
                
                if (clickY >= 3 && totalThemesNum > 0) {
                    const clickOffset = clickY - 3;
                    const targetThemeIdx = currentOffset + clickOffset;
                    
                    if (targetThemeIdx >= 0 && targetThemeIdx < totalThemesNum) {
                        m.selectedIndex = targetThemeIdx;
                        m._isDirty = true;

                        const targetThemeObj = list[targetThemeIdx];
                        if (targetThemeObj) {
                            generateGpssTransaction("0", "GLOBAL_THEME_CHANGED", { 
                                colorMask: String(targetThemeObj.borderColorMsk || "gray"),
                                passiveMask: String(targetThemeObj.passiveColorMsk || "darkgray")
                            }, "106");
                        }
                        
                        generateGpssTransaction("14", "SYNC_SCROLLBAR_METRICS", {
                            targetSlotId: "106", totalItems: totalThemesNum, maxVisibleRows: maxVisibleRows
                        }, "106");

                        isMutated = true;
                    }
                }
            }
            break;

        case "SCROLL_CONTENT_DOWN":
        case "MOVE_CURSOR_DOWN":
            if (totalThemesNum > 0) {
                m.selectedIndex = (Math.max(0, Math.floor(m.selectedIndex || 0)) + 1) % totalThemesNum;
                m._isDirty = true;
                isMutated = true;
            }
            break;

        case "SCROLL_CONTENT_UP":
        case "MOVE_CURSOR_UP":
            if (totalThemesNum > 0) {
                m.selectedIndex = (Math.max(0, Math.floor(m.selectedIndex || 0)) - 1 + totalThemesNum) % totalThemesNum;
                m._isDirty = true;
                isMutated = true;
            }
            break;
            
        case "UPDATE_THEME_MASK":
            m._isDirty = true;
            isMutated = true;
            break;
    }

    if (isMutated) {
        if (intent === "MOVE_CURSOR_DOWN" || intent === "MOVE_CURSOR_UP") {
            const targetThemeObj = list[m.selectedIndex];
            if (targetThemeObj) {
                generateGpssTransaction("0", "GLOBAL_THEME_CHANGED", { 
                    colorMask: String(targetThemeObj.borderColorMsk || "gray"),
                    passiveMask: String(targetThemeObj.passiveColorMsk || "darkgray")
                }, "106");
            }
        }
        if (facilityState.host?.virtualCanvasState) {
            facilityState.host.virtualCanvasState.isDirty = true;
        }
    }
    
    return isMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/theme_ctl.js
 * Время изменения: 06.09.2026 18:03:12 MSK
 */