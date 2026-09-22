/**
 * @file src/core/smo/mouse_intents/scrollbar_router.js
 * @version 1.0.7-RELEASE-SMO-IDD-SCROLLBAR-ROUTER-RAW-UNIFICATION
 * @description Маршалер прокрутки. Ликвидирована спам-синхронизация интентов от колесика мыши.
 * Выдает строго ОДИН целевой транзакт (или в контент, или во вкладки) на основе геометрии луча.
 * Выполнен в строгой парадигме PAC / DOD / IDD / Zero Allocation / 0% GC.
 */
import { generateGpssTransaction, _gpssEngineState } from "../bus.js";

export function routeMouseScrollIntent(hitId, mouseAction, lX, lY, sW, sH) {
    // Нормализуем входящие аппаратные прерывания колесика мыши
    const isWheelUp = (mouseAction === "WHEEL_UP" || mouseAction === "RAW_WHEEL_UP");
    const isWheelDown = (mouseAction === "WHEEL_DOWN" || mouseAction === "RAW_WHEEL_DOWN");
    const isWheel = (isWheelUp === true || isWheelDown === true);
    
    const isScrollClick = mouseAction === "MOUSE_DOWN" && lX === ((sW - 2) | 0);

    if (isWheel === true || isScrollClick === true) {
        const targetSlotIdStr = String(hitId || "102");
        const tabMenuMdl = _gpssEngineState.facilitiesRegistry.get("12")?.mdl;
        const clickY = Math.floor(lY);

        // ЖЕСТКОЕ ГЕОМЕТРИЧЕСКОЕ РАЗДЕЛЕНИЕ ЗOН (0% СЕМАНТИЧЕСКОГО СПАМА)
        const isTabsScrollZone = (targetSlotIdStr === "200") || (targetSlotIdStr !== "200" && clickY === 1);

        // =================================================================
        // ВЕКТОР А: СНАЙПЕРСКИЙ МАРШАЛИНГ СКРОЛЛА УШЕК ВКЛАДОК (СТРОГО clickY === 1)
        // =================================================================
        if (isTabsScrollZone === true && isWheel === true && tabMenuMdl && tabMenuMdl.tabsVectorArray) {
            let resolvedOwnerSlotStr = (targetSlotIdStr === "200") ? "104" : targetSlotIdStr;
            const totalTabs = Math.floor(tabMenuMdl.totalRegisteredTabsCount || 0);
            const buf = tabMenuMdl.tabsVectorArray;
            const clickX = Math.floor(lX);

            const currentHitSlotIdNum = parseInt(targetSlotIdStr, 10) & 255;
            const expectedKeeperIdNum = (targetSlotIdStr === "200") ? 12 : currentHitSlotIdNum;

            for (let t = 0; t < totalTabs; t++) {
                const offset = (t * 6) | 0;
                
                if (buf[offset + 0] === expectedKeeperIdNum) {
                    const sX = buf[offset + 2];
                    const eX = buf[offset + 3];

                    if (clickX >= sX && clickX <= eX) {
                        resolvedOwnerSlotStr = String(buf[offset + 4]); 
                        break;
                    }
                }
            }

            // Генерируем строго ОДИН изолированный интент для вкладок
            const tabsScrollIntentStr = isWheelUp ? "SCROLL_TABS_UP" : "SCROLL_TABS_DOWN";

            const tabsPayload = {
                targetSlotId: resolvedOwnerSlotStr,
                localX: Math.floor(lX),
                localY: clickY
            };
            Object.preventExtensions(tabsPayload);

            generateGpssTransaction("14", tabsScrollIntentStr, tabsPayload, "10");
            return true; // Тактовый импульс поглощен, Вектор Б никогда не вызовется!
        }

        // =================================================================
        // ВЕКТОР Б: СНАЙПЕРСКИЙ МАРШАЛИНГ СКРОЛЛИНГА ФАЙЛОВ (СТРОГО clickY >= 3)
        // =================================================================
        if (clickY >= 3 || isScrollClick === true) {
            let scrollIntentStr = "SCROLL_CONTENT_DOWN";
            if (isWheel === true) {
                scrollIntentStr = isWheelUp ? "SCROLL_CONTENT_UP" : "SCROLL_CONTENT_DOWN";
            } else {
                scrollIntentStr = (clickY < Math.floor(sH / 2)) ? "SCROLL_CONTENT_UP" : "SCROLL_CONTENT_DOWN";
            }

            const targetFacility = _gpssEngineState.facilitiesRegistry.get(targetSlotIdStr);
            let currentOffset = 0;
            if (targetFacility && targetFacility.viewStack) {
                const activeIdx = Math.max(0, Math.floor(targetFacility.activeStackIdx || 0));
                const triad = Array.isArray(targetFacility.viewStack) ? targetFacility.viewStack[activeIdx] : targetFacility.viewStack;
                if (triad && triad.mdl) {
                    currentOffset = Math.floor(triad.mdl.viewportOffset || 0);
                }
            }

            let nextPredictedOffset = currentOffset;
            if (scrollIntentStr === "SCROLL_CONTENT_UP") {
                if (currentOffset > 0) nextPredictedOffset = (currentOffset - 1) | 0;
            } else {
                nextPredictedOffset = (currentOffset + 1) | 0;
            }

            const scrollPayload = {
                targetSlotId: targetSlotIdStr,
                localX: Math.floor(lX),
                localY: clickY,
                viewportOffset: nextPredictedOffset
            };
            Object.preventExtensions(scrollPayload);

            // Генерируем строго ОДИН изолированный интент для строк контента
            generateGpssTransaction("14", scrollIntentStr, scrollPayload, "10");
            return true;
        }
    }

    return false;
}