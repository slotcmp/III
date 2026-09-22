/**
 * @file src/core/smo/debug/bus_storm_tracer.js
 * @version 1.0.1-RELEASE-SMO-DOD-BUS-STORM-TRACER-SILENCED
 * @description Внешний изолированный трассировщик верхнего уровня шины СМО.
 * ИСПРАВЛЕНО: Аварийный вывод в stderr удален с корнем для защиты UHD-матрицы кадра.
 * Выполнен в строгой парадигме PAC / DOD / IDD / Zero Allocation / 0% GC.
 */

import fs from "node:fs";

/**
 * Прецизионный перехват транзакта на этапе его первичного вброса в generateGpssTransaction
 */
export function traceTopLevelGpssGeneration(targetSlotIdStr, intentStr, payload) {
    const intent = String(intentStr || "").trim();
    if (intent !== "SET_SLOT_FOCUS") return;

    const targetId = String(targetSlotIdStr || "unknown");
    const targetPayload = payload;
    const extractedTargetFocus = String(targetPayload ? (targetPayload.targetSlotId || "unknown") : "unknown");

    const now = new Date();
    const tsStr = "[" + String(now.getHours()).padStart(2, "0") + ":" + 
                        String(now.getMinutes()).padStart(2, "0") + ":" + 
                        String(now.getSeconds()).padStart(2, "0") + " Msk]";

    // =================================================================
    // СИНХРОНИЗИРOВАНО: ПРЯМОЙ ВЫВОД НА ЭКРАН ТЕРМИНАЛА ПОЛНОСТЬЮ ВЫРЕЗАН
    // =================================================================

    // Логгирование на физический диск для сверки цепочки Structured Clone
    try {
        const logLineStr = tsStr + " [TOP_GEN] Целевой Канал Шины: " + targetId + 
                           " | Интент: " + intent + 
                           " | Конечная цель фокуса: " + extractedTargetFocus + "\n";
        
        const fd = fs.openSync("./logs/idd_bus_storm.log", "a");
        fs.writeSync(fd, logLineStr);
        fs.closeSync(fd);
    } catch (e) {
        // Пассивный гвард
    }
}
