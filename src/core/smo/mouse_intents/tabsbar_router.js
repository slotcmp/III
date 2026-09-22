/**
 * @file src/core/smo/mouse_intents/tabsbar_router.js
 * @version 1.0.3-RELEASE-SMO-IDD-TABS-ROUTER-UNIFIED
 * @description Изолированная DOD-процедура перехвата кликов по вкладкам (Канал 10).
 * ИСПРАВЛЕНО: Открыт сквозной проброс строки Y=0 для обслуживания глобального меню Слота 200.
 * Выполнен в строгой парадигме PAC / DOD / IDD / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../bus.js";

/**
 * Перенаправляет клик по линии вкладок на каскадный конвейер Канала 12
 */
export function routeMouseTabsIntent(hitId, mouseAction, lX, lY, globalY) {
    const targetSlotIdStr = String(hitId || "102");
    
    // Клик легитимен, если это строка Y=0 для Слота 200 ИЛИ строка Y=1 для любого другого окна
    const isTabsClick = (targetSlotIdStr === "200" && lY === 0) || (targetSlotIdStr !== "200" && lY === 1);

    if (isTabsClick && (mouseAction === "MOUSE_DOWN" || mouseAction === "MOUSE_CLICK")) {
        
        const tabsPayload = { 
            targetSlotId: targetSlotIdStr, 
            localX: lX, 
            localY: lY, 
            mousePhase: mouseAction 
        };
        Object.preventExtensions(tabsPayload);

        // Стреляем высокоприоритетным транзактом в корутины Канала 12
        generateGpssTransaction("12", "TAB_CLICKED", tabsPayload, "10");
        return true;
    }
    return false;
}
