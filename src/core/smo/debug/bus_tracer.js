/**
 * @file src/core/smo/debug/bus_tracer.js
 * @version 1.1.3-RELEASE-SMO-IDAL-TOTAL-TRACER-FIXED
 * @description Тотальный трассировщик. Исправлен фатальный сбой импорта node:degBugSync.
 * Вывод лога переведен в файл ./logs/smo_core.log.
 */
import fs from "node:fs"; // ◄── ИСПРАВЛЕНО: Восстановлен легитимный нативный модуль node:fs
import path from "node:path";

/**
 * Разворачивает кольцевой буфер origins прерываний и выполняет синхронный сброс в лог ядра
 */
export function dumpSlotFocusTransaction(facility, tx) {
    if (!facility || !tx) return;

    const previewIntent = tx.P2 ? String(tx.P2).trim() : "NO_OP";
    const targetIdStr = String(tx.P1 || "0");
    
    let traceStr = "[";
    if (Array.isArray(tx.originsHistory)) {
        const startPtr = Math.floor(tx.originsCursor || 0);
        
        for (let i = 0; i < 8; i++) {
            const physIdx = (startPtr + 1 + i) & 7;
            const historyNode = tx.originsHistory[physIdx];
            
            if (historyNode && historyNode !== "0") {
                if (traceStr.length > 1) traceStr += " -> ";
                traceStr += historyNode;
            }
        }
    }
    traceStr += "]";

    const now = new Date();
    const tsStr = "[" + String(now.getHours()).padStart(2, "0") + ":" + 
                        String(now.getMinutes()).padStart(2, "0") + ":" + 
                        String(now.getSeconds()).padStart(2, "0") + " Msk]";

    try {
        const logLineStr = tsStr + " [TX_" + tx.id + "] Фасилити: " + facility.slotId +
                           " | Интент: " + previewIntent + 
                           " | Назначение (P1): " + targetIdStr + 
                           " | Статус TX: " + tx.status +
                           " | Трасса ORIGINS: " + traceStr + "\n";
        
        // Синхронный безаллокационный выжиг строки трейса на накопитель в обход libuv
        const logFilePath = path.resolve(process.cwd(), "./logs/smo_core.log");
        const fd = fs.openSync(logFilePath, "a");
        fs.writeSync(fd, Buffer.from(logLineStr), 0, logLineStr.length, null);
        fs.closeSync(fd);
    } catch (e) {
        // Пассивный санитарный гвард
    }
}