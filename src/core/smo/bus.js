/**
 * @file src/core/smo/bus.js
 * @version 7.0.0-RELEASE-SMO-BUS-IDD-RECONVERGED-STRIDE-8
 * @description Размоноличенное ядро центральной тактовой шины СМО платформы SLOTCMP III.
 * ИСПРАВЛЕНО: Поле ORIGIN переведено на 8-ячеечный кольцевой буфер истории прерываний.
 * Выполнен в строгой парадигме PAC / DOD / IDD / 0% OOP / Zero Allocation / 0% GC.
 */

import fs from "node:fs";
import path from "node:path";
import { writeCoreLogMessageInline } from "./logger_io.js";
import { processEngineSingleTick } from "./gpss_engine_scan.js";
import { auditHardwareTickPassive, purgeAuditFileAtStartup } from "./tick_sniffer.js";
import { buildDynamicTabCoordinatesRegistry } from "../layout/balancer/tab_indexer.js"; 
import { loadAppSettings } from "../app_config.js";
import { traceTopLevelGpssGeneration } from "./debug/bus_storm_tracer.js";

// РЕЭКСПОРТ РАЗДЕЛЯЕМЫХ ОЗУ-РЕГИСТРОВ ДЛЯ ИСКЛЮЧЕНИЯ ESM-ТУПИКОВ
export { _busClockMetrics, _gpssEngineState, _activeThemeState, _kernelContext } from "./bus/shared_state.js";

import { _busClockMetrics, _gpssEngineState, _activeThemeState, _kernelContext, _INTENTS_PRIORITY_MAP } from "./bus/shared_state.js";
import { initializeTransactionOrigins, pushOriginTrace } from "./bus/origin_tracer.js";

const CORE_LOG_PATH = path.resolve(process.cwd(), "./logs/smo_core.log");
const AUDIT_TICKS_PATH = path.resolve(process.cwd(), "./smo_ticks.audit");

/**
 * Очищает файлы системных логов при холодном старте ядра хоста
 */
export function purgeLogFileAtStartup() {
    try {
        fs.writeFileSync(path.resolve(process.cwd(), "./logs/smo_core.log"), "", "utf8");
        fs.writeFileSync(path.resolve(process.cwd(), "./smo_ticks.audit"), "", "utf8");
    } catch (e) {
        if (process.stderr) process.stderr.write("[BUS_BOOT_FATAL] Сбой очистки дисковых журналов логов\n");
    }

    const targetLogPath = _kernelContext.logPath;
    if (targetLogPath) {
        try { fs.writeFileSync(targetLogPath, "", "utf8"); } catch (e) {}
    }
    const configData = loadAppSettings();
    const isBypass = configData ? (configData.bAuditTicksBypass === true) : false;
    if (!isBypass) { purgeAuditFileAtStartup(); }
}

/**
 * Регистрирует прибор СМО на тактовой шине
 */
export function registerGpssFacility(slotIdStr, facilityInstance) {
    if (!slotIdStr || !facilityInstance) return false;
    const key = String(slotIdStr);
    _gpssEngineState.facilitiesRegistry.set(key, facilityInstance);
    _gpssEngineState.facilitiesKeysCached = Array.from(_gpssEngineState.facilitiesRegistry.keys());
    return true;
}

/**
 * Верховный маршалер тактовых импульсов шины СМО с приоритетной сортировкой
 */
export function generateGpssTransaction(targetChannelStr, intentStr, contextPayload, originSlotIdStr = "0") {
    traceTopLevelGpssGeneration(targetChannelStr, intentStr, contextPayload);
    const chanKey = String(targetChannelStr || "").trim();
    const currentIntent = String(intentStr || "").trim();
    
    _gpssEngineState._transactionGlobalCounter++;
    _busClockMetrics.generatedTransactsCount = _gpssEngineState._transactionGlobalCounter;
    _busClockMetrics.lastExecutedIntent = currentIntent;
    
    const priorityRank = _INTENTS_PRIORITY_MAP.get(currentIntent) ?? 1;

    const gpssTx = {
        id: _gpssEngineState._transactionGlobalCounter,
        P1: chanKey, 
        P2: currentIntent, 
        P3: contextPayload, 
        status: "READY",
        originsHistory: null,
        originsCursor: 0,
        priority: priorityRank
    };
    
    // Аллоцируем 8-ячеистую бинарную карусель истории вместо одиночного O1
    initializeTransactionOrigins(gpssTx);
    pushOriginTrace(gpssTx, originSlotIdStr);
    
    Object.preventExtensions(gpssTx);
    
    const targetFacility = _gpssEngineState.facilitiesRegistry.get(chanKey);
    

if (targetFacility && Array.isArray(targetFacility.localQueue)) {
    const q = targetFacility.localQueue;
    const head = Math.floor(targetFacility._head || 0);

    // ГВАРД ХРОНОЛОГИИ ВВОДА: Если транзакт предназначен для Слота 10 (MOUSE) или 4 (KBD),
    // приоритетная сортировка ПОЛНОСТЬЮ ОТКЛЮЧАЕТСЯ, гарантируя чистый FIFO-конвейер физических событий ОС
    if (chanKey === "10" || chanKey === "4") {
        q.push(gpssTx);
    } else {
        // Для прикладных и фоновых интентов сохраняем весовую сортировку TurboFan
        let insertIdx = q.length;
        for (let i = q.length - 1; i >= head; i--) {
            if (q[i] && q[i].priority < priorityRank) {
                insertIdx = i;
            } else {
                break;
            }
        }
        if (insertIdx === q.length) q.push(gpssTx);
        else q.splice(insertIdx, 0, gpssTx);
    }
} 
    else if (targetFacility && typeof targetFacility.dispatch === "function") {
        targetFacility.dispatch(currentIntent, gpssTx);
    }

    setImmediate(executeReactivePulsePipeline);
    return true;
}

/**
 * Центральный процессор продвижения тактов шины
 */
export function executeReactivePulsePipeline() {
    _busClockMetrics.hardwareTicksCount++;
    _busClockMetrics.currentPipelineDepth++;

    const configData = loadAppSettings();
    const isBypass = configData ? (configData.bAuditTicksBypass === true) : false;

    if (!isBypass) {
        auditHardwareTickPassive("BEFORE_ADVANCE", _gpssEngineState, _busClockMetrics, writeCoreLogMessageInline);
    }

    if (_gpssEngineState.isScanActive) {
        _busClockMetrics.currentPipelineDepth--;
        return;
    }
    _gpssEngineState.isScanActive = true;
    
    const kernel = _gpssEngineState.runtime;
    
    if (kernel) {
        
        processEngineSingleTick(kernel);
    }
    
    _gpssEngineState.isScanActive = false;

    if (kernel && typeof kernel.executeViewportBlit === "function") {
        kernel.executeViewportBlit();
    }

    if (!isBypass) {
        auditHardwareTickPassive("AFTER_ADVANCE", _gpssEngineState, _busClockMetrics, writeCoreLogMessageInline);
    }
    _busClockMetrics.currentPipelineDepth--;
}
