/**
 * @file: src/io/terminal/frame_queue_renderer.js
 * @path: C:\slotcmd_3\src\io\terminal\frame_queue_renderer.js
 * @version: 3.0.0-RELEASE-DOD-FORK
 * @description: Эталoнный frameRenderer паспорта вью-стека из slotcmd_2 (0% Class).
 * @revision: #0818-FRAME-QUEUE-STRICT-SMO-INDEX
 */

export function drawFrameQueueIndicator(row, slotIdStr, displayIndexNum, viewStackPack, currentW, facilityRef) {
    if (!row) return;

    let totalTabs = 1;
    let activeTab = 1;

    // Считываем общее число доступных вкладок из структуры ОЗУ-стека
    if (viewStackPack) {
        if (Array.isArray(viewStackPack)) {
            totalTabs = viewStackPack.length; 
        } else if (viewStackPack._subTabsNames && Array.isArray(viewStackPack._subTabsNames)) {
            totalTabs = viewStackPack._subTabsNames.length; 
        }
    }

    // ИСПРАВЛЕНО: Считываем 1-based индекс активной вкладки напрямую из СМО-прибора
    if (facilityRef) {
        activeTab = Math.max(0, Math.floor(facilityRef.activeStackIdx || 0)) + 1;
    }

    // Строго формируем исторический паттерн: [1: 101 1/2]
    const stackPassportStr = "[" + displayIndexNum + ": " + slotIdStr + " " + activeTab + "/" + totalTabs + "]";
    const pLen = stackPassportStr.length;

    if (currentW > pLen + 4) {
        const startX = currentW - pLen - 2;
        for (let i = 0; i < pLen; i++) {
            const cell = row[startX + i];
            if (cell) {
                cell.char = stackPassportStr.charAt(i);
                cell.fg = "\x1b[38;5;244m"; 
            }
        }
    }
}
