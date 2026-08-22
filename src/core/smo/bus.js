/**
 * @file src/core/smo/bus.js
 * @version 3.8.9-RELEASE-SMO-DYNAMIC-HOT-SWAP-BUS
 * @description Реактивная тактовая шина и диспетчер прерываний абстрактных приборов (Control-контур).
 * ИСПРАВЛЕН ЭКСПОРТ: Восстановлен экспорт registerGpssFacility для slot_maker.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import fs from "node:fs";

export const _gpssEngineState = {
    runtime: null,
    facilitiesRegistry: new Map(),
    facilitiesKeysCached: [], 
    isScanActive: false,
    _transactionGlobalCounter: 0,
    activeAsyncTransactionsCount: 0
};
Object.preventExtensions(_gpssEngineState);

export const _kernelContext = {
    logPath: "./smo.log"
};
Object.preventExtensions(_kernelContext);

/**
 * Очищает лог-файл при холодном старте платформы (вызывается из index.js)
 */
export function purgeLogFileAtStartup() {
    const targetLogPath = _kernelContext.logPath;
    if (!targetLogPath) return;
    fs.writeFileSync(targetLogPath, "", "utf8");
}

/**
 * Регистрирует прибор обслуживания в суверенном Map-реестре шины СМО
 * ИСПРАВЛЕН ЭКСПОРТ: Ключевая функция IoC-монтажа успешно экспортирована.
 */
export function registerGpssFacility(slotIdStr, facilityInstance) {
    if (!slotIdStr || !facilityInstance) return false;
    const key = String(slotIdStr);
    _gpssEngineState.facilitiesRegistry.set(key, facilityInstance);
    
    // Атомарная инвалидация плоского кэша ключей для тактового обхода
    _gpssEngineState.facilitiesKeysCached = Array.from(_gpssEngineState.facilitiesRegistry.keys());
    return true;
}

/**
 * Генерирует транзакт прерывания и направляет в конвейер прибора обслуживания
 */
export function generateGpssTransaction(targetChannelStr, intentStr, contextPayload) {
    const chanKey = String(targetChannelStr || "");
    const currentIntent = String(intentStr || "");
    _gpssEngineState._transactionGlobalCounter++;
    
    const gpssTx = {
        id: _gpssEngineState._transactionGlobalCounter,
        P1: chanKey, 
        P2: currentIntent, 
        P3: contextPayload,
        status: "READY"
    };
    Object.preventExtensions(gpssTx);
    
    const targetFacility = _gpssEngineState.facilitiesRegistry.get(chanKey);
    if (targetFacility && typeof targetFacility.dispatch === "function") {
        targetFacility.dispatch(currentIntent, gpssTx);
    }

    // Тотальный пробой асинхронности на этапе бутстрапа платформы
    if (currentIntent === "EXECUTE_RENDER" || 
        currentIntent === "BOOT_LAYOUT_TREE" || 
        currentIntent === "SYNCHRONIZE_DYNAMIC_SLOT" ||
        currentIntent === "LOAD_SEQUENCE_COMPLETED") {
        
        if (targetFacility && typeof targetFacility.advanceFacility === "function") {
            targetFacility.advanceFacility();
        }
        
        if (currentIntent === "LOAD_SEQUENCE_COMPLETED") {
            executeReactivePulsePipeline();
        }
    } else {
        process.nextTick(executeReactivePulsePipeline);
    }

    return true;
}

/**
 * Главный конвейер тактового продвижения приборов СМО
 */
export function executeReactivePulsePipeline() {
    if (_gpssEngineState.isScanActive) return;
    _gpssEngineState.isScanActive = true;
    
    const len = _gpssEngineState.facilitiesKeysCached.length;
    for (let i = 0; i < len; i++) {
        const slotKey = _gpssEngineState.facilitiesKeysCached[i];
        if (slotKey === "1") continue; 
        
        const facility = _gpssEngineState.facilitiesRegistry.get(slotKey);
        if (facility && typeof facility.advanceFacility === "function") {
            facility.advanceFacility();
        }
    }
    
    const renderUnit = _gpssEngineState.facilitiesRegistry.get("1");
    if (renderUnit && typeof renderUnit.advanceFacility === "function") {
        renderUnit.advanceFacility();
    }
    
    _gpssEngineState.isScanActive = false;

    if (_gpssEngineState.runtime) {
        const kernel = _gpssEngineState.runtime;
        if (typeof kernel.executeViewportBlit === "function") {
            kernel.executeViewportBlit();
        }
    }
}
