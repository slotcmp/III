/**
 * @file src/core/smo/bus_intents/tx_generator_vector.js
 * @version 1.0.0-RELEASE-SMO-TX-GENERATOR-VECTOR
 * @description Математический инжектор и генератор СМО-транзакций упорядоченной приоритезации.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { _gpssEngineState, _busClockMetrics, executeReactivePulsePipeline } from "../bus.js";

// Статическая карта приоритетов для O(1) извлечения ранга транзакта
const _INTENTS_PRIORITY_MAP = new Map([
    ["TAB_CLICKED", 3],
    ["SWITCH_SLOT_TAB", 3],
    ["ROTATE_SLOT_STACK", 3],
    ["SWITCH_TAB", 3],
    ["SYNC_SCROLLBAR_METRICS", 2],
    ["INVALIDATE_SLOT_CONTAINER", 2],
    ["REGISTRATION_TAB_SPACE", 2],
    ["INJECT_VFS_DATA", 1],
    ["FN_KEY_CLICKED", 1],
    ["EXECUTE_FAR_COMMAND", 1],
    ["TRIGGER_DIRECTORY_INDEXING", 1],
    ["ADD_LOG_ENTRY", 0],
    ["ANIMATION_TICK", 0]
]);

/**
 * Регистрирует обслуживающий прибор в Map-таблице шины
 */
export function registerGpssFacility(slotIdStr, facilityInstance) {
    if (!slotIdStr || !facilityInstance) return false;
    const key = String(slotIdStr);
    _gpssEngineState.facilitiesRegistry.set(key, facilityInstance);
    _gpssEngineState.facilitiesKeysCached = Array.from(_gpssEngineState.facilitiesRegistry.keys());
    return true;
}

/**
 * Канонический генератор заявок (транзактов) СМО с сортировкой в FIFO-очередях по весу приоритета
 */
export function generateGpssTransaction(targetChannelStr, intentStr, contextPayload, originSlotIdStr = "0") {
    const chanKey = String(targetChannelStr || "").trim();
    const currentIntent = String(intentStr || "").trim();
    
    _gpssEngineState._transactionGlobalCounter++;
    _busClockMetrics.generatedTransactsCount = _gpssEngineState._transactionGlobalCounter;
    _busClockMetrics.lastExecutedIntent = currentIntent;
    
    const priorityRank = _INTENTS_PRIORITY_MAP.get(currentIntent) ?? 1;

    // Сборка анемичной DOD-заявки под strict Hidden Class V8 TurboFan
    const gpssTx = {
        id: _gpssEngineState._transactionGlobalCounter,
        P1: chanKey, 
        P2: currentIntent, 
        P3: contextPayload, 
        status: "READY",
        O1: String(originSlotIdStr),
        priority: priorityRank
    };
    
    Object.preventExtensions(gpssTx);
    
    const targetFacility = _gpssEngineState.facilitiesRegistry.get(chanKey);
    
    if (targetFacility && Array.isArray(targetFacility.localQueue)) {
        const q = targetFacility.localQueue;
        const head = Math.floor(targetFacility._head || 0);

        if (q.length === head) {
            q.push(gpssTx);
        } else {
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
