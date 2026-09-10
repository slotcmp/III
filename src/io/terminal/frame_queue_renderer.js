/**
 * @file src/io/terminal/frame_queue_renderer.js
 * @version 4.2.0-RELEASE-SMO-FRAME-QUEUE-LEFT-PERFECT
 * @description Фрейм-рендерер паспорта вью-стека (Presentation-контур).
 * ИСПРАВЛЕНО СМЕЩЕНИЕ: Паспорт ротации жестко закреплен слева от заголовка (начиная с sX + 1).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { packCellBits } from "./sprite_blit.js";

export function drawFrameQueueIndicator(row, sX, slotIdStr, displayIndexNum, viewStackPack, currentW, facilityRef) {
    if (!row) return;

    let totalTabs = 1;
    let activeTab = 1;

    if (viewStackPack) {
        if (Array.isArray(viewStackPack)) {
            totalTabs = viewStackPack.length; 
        } else if (viewStackPack._subTabsNames && Array.isArray(viewStackPack._subTabsNames)) {
            totalTabs = viewStackPack._subTabsNames.length; 
        }
    }

    if (facilityRef) {
        activeTab = Math.max(0, Math.floor(facilityRef.activeStackIdx || 0)) + 1;
    }

    // Собираем канонический левый штамп со стыком рамы "==" один в один по скриншоту
    const stackPassportStr = "[" + displayIndexNum + ": " + slotIdStr + " " + activeTab + "/" + totalTabs + "]==";
    const pLen = stackPassportStr.length;

    if (currentW > pLen + 5) {
        // Выжигаем строго в начале верхней рамы, сразу после углового символа ╔
        const startX = sX + 1;
        const colorAnsi = "\x1b[38;5;244m";
        const bgColor = "\x1b[40m";

        for (let i = 0; i < pLen; i++) {
            row[startX + i] = packCellBits(stackPassportStr.charAt(i), colorAnsi, bgColor);
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/frame_queue_renderer.js
 * Время изменения: 04.09.2026 23:14:10 MSK
 */
