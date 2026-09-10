/**
 * @file src/core/smo/tick_sniffer.js
 * @version 1.4.1-RELEASE-SMO-PARAMETRIC-TICK-SNIFFER-FIXED
 * @description Автономный изолированный DOD-аудитор тактовых импульсов платформы.
 * ИСПРАВЛЕН КРАШ ИМПОРТА: Ликвидирована круговая зависимость за счет ленивого проброса состояния шины через аргументы.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% GC.
 */

import fs from "node:fs";
import path from "node:path";
import { loadAppSettings } from "../app_config.js";

const _LOCAL_AUDIT_FILE_PATH = path.join(process.cwd(), "./smo_ticks.audit");
let _staticCharAccumulator = "";

function _isAuditBypassActive() {
    try {
        const config = loadAppSettings();
        return config ? (config.bAuditTicksBypass === true) : false;
    } catch (e) {
        return false;
    }
}

export function purgeAuditFileAtStartup() {
    if (_isAuditBypassActive() === true) return;
    try {
        fs.writeFileSync(_LOCAL_AUDIT_FILE_PATH, "", "utf8");
    } catch (e) {
        if (process.stderr) process.stderr.write("[SNIFFER_FATAL] Сбой очистки файла аудита\n");
    }
}

/**
 * Пассивный DOD-регистратор тактов, защищенный от циклических зависимостей
 */
export function auditHardwareTickPassive(interceptPhaseStr, gpssEngineStateRef, busClockMetricsRef) {
    if (_isAuditBypassActive() === true) return;
    
    // Ленивые гварды на входящие контексты шины
    if (!gpssEngineStateRef || !busClockMetricsRef) return;

    const keys = gpssEngineStateRef.facilitiesKeysCached;
    const len = keys.length;
    let totalPendingTransactionsInQueues = 0;
    
    for (let i = 0; i < len; i++) {
        const facility = gpssEngineStateRef.facilitiesRegistry.get(keys[i]);
        if (facility && facility.localQueue) {
            const head = Math.floor(facility._head || 0);
            const tail = facility.localQueue.length;
            if (tail > head) {
                totalPendingTransactionsInQueues += (tail - head);
            }
        }
    }

    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");

    _staticCharAccumulator = "[" + h + ":" + m + ":" + s + "." + ms + " Msk] " +
                             "[PHASE: " + String(interceptPhaseStr).padEnd(14, " ") + "] " +
                             "| Физический Тик #" + String(busClockMetricsRef.hardwareTicksCount).padEnd(5, " ") +
                             "| Всего транзактов: " + String(busClockMetricsRef.generatedTransactsCount).padEnd(5, " ") +
                             "| Последний интент: '" + String(busClockMetricsRef.lastExecutedIntent).padEnd(26, " ") + "' " +
                             "| Блокировано в FIFO: " + totalPendingTransactionsInQueues + " ед.\n";

    try {
        fs.appendFileSync(_LOCAL_AUDIT_FILE_PATH, _staticCharAccumulator, "utf8");
    } catch (err) {
        if (process.stderr) process.stderr.write("[SNIFFER_IO_FATAL] Ошибка записи в корень\n");
    }
}
