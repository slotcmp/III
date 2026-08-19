/**
 * @file src/core/smo/bus.js
 * @version 3.5.1-RELEASE-SMO-REACTIVE-PRIORITY-BUS
 * @description Реактивная тактовая шина и диспетчер прерываний абстрактных приборов (Control-контур).
 * Исправлен баг гонки ресайза: внедрен детерминированный приоритет замыкающей фазы рендеринга кадра.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import fs from "node:fs";

export const _gpssEngineState = {
    runtime: null,
    facilitiesRegistry: new Map(),
    isScanActive: false,
    _transactionGlobalCounter: 0,
    activeAsyncTransactionsCount: 0
};
Object.preventExtensions(_gpssEngineState);

export const _kernelContext = {
    logPath: null
};
Object.preventExtensions(_kernelContext);

/**
 * Превентивный гвард для безопасной записи в динамический лог-файл
 */
function appendToLogGuard(messageStr) {
    const targetLogPath = _kernelContext.logPath;
    if (!targetLogPath) return;
    fs.appendFileSync(targetLogPath, messageStr, "utf8");
}

export function purgeLogFileAtStartup() {
    const targetLogPath = _kernelContext.logPath;
    if (!targetLogPath) return;
    fs.writeFileSync(targetLogPath, "", "utf8");
}

/**
 * Регистрация абстрактных приборов на шине СМО
 */
export function registerGpssFacility(slotIdStr, facilityInstance) {
    if (!slotIdStr || !facilityInstance) return false;
    const key = String(slotIdStr);
    _gpssEngineState.facilitiesRegistry.set(key, facilityInstance);
    
    const config = _gpssEngineState.runtime?.model?.logicalState?.appSettings;
    if (config?.ttni && config.ttni.bSlotLogBypass === true) {
        return true; 
    }
    
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    
    const strictRegLineStr = "[" + h + ":" + m + ":" + s + " Msk] Прибор " + key + " зарегистрирован в СМО\n";
    appendToLogGuard(strictRegLineStr);
    return true;
}

/**
 * РЕАКТИВНЫЙ ИМПУЛЬСНЫЙ ТРИГГЕР ШИНЫ СМО: 
 * Генерирует транзакт прерывания и мгновенно проталкивает его по конвейеру
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
    
    if (currentIntent === "TRIGGER_RESIZE" || currentIntent === "INJECT_GEO_MAP") {
        const now = new Date();
        const tStr = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + ":" + String(now.getSeconds()).padStart(2, "0");
        
        if (currentIntent === "TRIGGER_RESIZE") {
            const logResStr = "[" + tStr + " Msk] [СМО_RESIZE_TRIGGERED] Интент: TRIGGER_RESIZE | Канал #" + chanKey + " | Ожидание калькуляции...\n";
            appendToLogGuard(logResStr);
        } else {
            const logMapStr = "[" + tStr + " Msk] [СМО_GEOMETRY_COMPUTED] Интент: INJECT_GEO_MAP | Новая флекс-сетка впечена в ОЗУ хоста\n";
            appendToLogGuard(logMapStr);
        }
    }
    
    // Пушим транзакт в накопитель очереди целевого абстрактного прибора
    const targetFacility = _gpssEngineState.facilitiesRegistry.get(chanKey);
    if (targetFacility && typeof targetFacility.dispatch === "function") {
        targetFacility.dispatch(currentIntent, gpssTx);
    }

    // Пробуждаем реактивный конвейер продвижения
    executeReactivePulsePipeline();

    return true;
}

/**
 * Автомат сквозного реактивного продвижения активных прерываний с приоритетом рендеринга
 */
function executeReactivePulsePipeline() {
    if (_gpssEngineState.isScanActive) return;
    _gpssEngineState.isScanActive = true;
    
    let screenNeedsUpdate = false;
    const activeFacilitiesKeys = Array.from(_gpssEngineState.facilitiesRegistry.keys());
    
    // ПРОХОД 1: Опрашиваем строго координатные и бизнес-приборы (Каналы 0, 9, 101+), исключая Канал 1 и 4
    for (let i = 0; i < activeFacilitiesKeys.length; i++) {
        const slotKey = activeFacilitiesKeys[i];
        if (slotKey === "1" || slotKey === "4") {
            continue; 
        }
        
        const facility = _gpssEngineState.facilitiesRegistry.get(slotKey);
        if (facility && typeof facility.advanceFacility === "function") {
            const isMutated = facility.advanceFacility();
            if (isMutated === true) {
                screenNeedsUpdate = true;
            }
        }
    }
    
    // ПРОХОД 2: ФИНАЛЬНЫЙ СМО-БАРЬЕР — продвигаем Прибор Отрисовки (Канал 1) гарантированно последним,
    // когда все транзакты инжекции геометрии от воркеров уже полностью разгребли кучу ОЗУ!
    const renderUnit = _gpssEngineState.facilitiesRegistry.get("1");
    if (renderUnit && typeof renderUnit.advanceFacility === "function") {
        const isRenderMutated = renderUnit.advanceFacility();
        if (isRenderMutated === true) {
            screenNeedsUpdate = true;
        }
    }
    
    _gpssEngineState.isScanActive = false;

    // ФИНАЛИЗАЦИЯ ИМПУЛЬСА: Выталкиваем полностью сформированный растр кадра в ConPTY дескриптор
    if (screenNeedsUpdate === true && _gpssEngineState.runtime) {
        const kernel = _gpssEngineState.runtime;
        if (typeof kernel.executeViewportBlit === "function") {
            kernel.executeViewportBlit();
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/bus.js
 * Время модификации: 18.08.2026 23:34:10 MSK
 */
