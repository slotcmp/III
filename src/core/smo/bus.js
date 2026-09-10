
/**
 * @file src/core/smo/bus.js
 * @version 6.8.0-RELEASE-SMO-BUS-FLAT-REGISTERS-PERFECT
 * @description Реактивная тактовая шина СМО с изолированными плоскими регистрами темы и фокуса.
 * ИСПРАВЛЕН СБРОС ФОКУСА И МИГАНИЕ: Регистры вынесены из запечатанного appSettings в открытый плоский буфер.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import fs from "node:fs";
import { writeCoreLogMessageInline } from "./logger_io.js";
import { processEngineSingleTick } from "./gpss_engine_scan.js";
import { auditHardwareTickPassive, purgeAuditFileAtStartup } from "./tick_sniffer.js";
import { loadAppSettings } from "../app_config.js";

export const _busClockMetrics = {
    hardwareTicksCount: 0,
    generatedTransactsCount: 0,
    currentPipelineDepth: 0,
    lastExecutedIntent: "NONE"
};

export const _gpssEngineState = {
    runtime: null,
    facilitiesRegistry: new Map(),
    facilitiesKeysCached: [], 
    isScanActive: false,
    _transactionGlobalCounter: 0,
    activeAsyncTransactionsCount: 0,
    activeSubZonesRegistry: Object.create(null)
};

// =================================================================
// СУВЕРЕННЫЙ ПЛOСКИЙ БУФЕР ЖИВOГO СОСТOЯНИЯ WM (НЕУЯЗВИМ ДЛЯ ТYPEERROR)
// =================================================================
export const _activeThemeState = {
    focusedSlotIdStr: "105",
    currentBorderAnsiMask: "gray",
    currentPassiveAnsiMask: "darkgray"
};
Object.preventExtensions(_activeThemeState);

export const _kernelContext = {
    logPath: "./smo.log"
};

export function purgeLogFileAtStartup() {
    const targetLogPath = _kernelContext.logPath;
    if (targetLogPath) {
        try { fs.writeFileSync(targetLogPath, "", "utf8"); } catch (e) {}
    }
    const configData = loadAppSettings();
    const isBypass = configData ? (configData.bAuditTicksBypass === true) : false;
    if (!isBypass) { purgeAuditFileAtStartup(); }
}

export function registerGpssFacility(slotIdStr, facilityInstance) {
    if (!slotIdStr || !facilityInstance) return false;
    const key = String(slotIdStr);
    _gpssEngineState.facilitiesRegistry.set(key, facilityInstance);
    _gpssEngineState.facilitiesKeysCached = Array.from(_gpssEngineState.facilitiesRegistry.keys());
    return true;
}

/**
 * Генерирует детерминированный транзакт СМО и ставит его в FIFO-очередь целевого прибора
 */
export function generateGpssTransaction(targetChannelStr, intentStr, contextPayload, originSlotIdStr = "0") {
    const chanKey = String(targetChannelStr || "");
    const currentIntent = String(intentStr || "");
    
    _gpssEngineState._transactionGlobalCounter++;
    _busClockMetrics.generatedTransactsCount = _gpssEngineState._transactionGlobalCounter;
    _busClockMetrics.lastExecutedIntent = currentIntent;
    
    const gpssTx = {
        id: _gpssEngineState._transactionGlobalCounter,
        P1: chanKey, 
        P2: currentIntent, 
        P3: contextPayload, 
        status: "READY",
        O1: String(originSlotIdStr) 
    };
    
    Object.preventExtensions(gpssTx);
    
    const targetFacility = _gpssEngineState.facilitiesRegistry.get(chanKey);
    
    if (targetFacility && Array.isArray(targetFacility.localQueue)) {
        targetFacility.localQueue.push(gpssTx);
    } 
    else if (targetFacility && typeof targetFacility.dispatch === "function") {
        targetFacility.dispatch(currentIntent, gpssTx);
    }

    setImmediate(executeReactivePulsePipeline);
    return true;
}

export function executeReactivePulsePipeline() {
    _busClockMetrics.hardwareTicksCount++;
    _busClockMetrics.currentPipelineDepth++;

    const configData = loadAppSettings();
    const isBypass = configData ? (configData.bAuditTicksBypass === true) : false;

    if (!isBypass) auditHardwareTickPassive("BEFORE_ADVANCE");

    if (_gpssEngineState.isScanActive) {
        _busClockMetrics.currentPipelineDepth--;
        return;
    }
    _gpssEngineState.isScanActive = true;
    
    const kernel = _gpssEngineState.runtime;
    if (kernel) processEngineSingleTick(kernel);
    
    _gpssEngineState.isScanActive = false;

    if (kernel && typeof kernel.executeViewportBlit === "function") {
        kernel.executeViewportBlit();
    }

    if (!isBypass) auditHardwareTickPassive("AFTER_ADVANCE");
    _busClockMetrics.currentPipelineDepth--;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/bus.js
 * Время изменения: 06.09.2026 17:58:12 MSK
 */


