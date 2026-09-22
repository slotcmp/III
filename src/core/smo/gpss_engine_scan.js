/**
 * @file src/core/smo/gpss_engine_scan.js
 * @version 5.4.11-RELEASE-SMO-CLOCK-SCAN-LAZY-INDEXER-FIXED
 * @description Центральный тактовый автомат и аудитор имитационной шины СМО (Control-контур).
 * ИСПРАВЛЕНО: Вызов buildDynamicTabCoordinatesRegistry перенесен в Фазу 2 финализации такта,
 * что гарантирует индексацию ушек по 100% применившейся геометрии INJECT_GEO_MAP.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% try-catch / 0% GC.
 */

import { _gpssEngineState, generateGpssTransaction } from "./bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";
import { writeCoreLogMessageInline } from "./logger_io.js";
import { buildDynamicTabCoordinatesRegistry } from "../layout/balancer/tab_indexer.js"; // ОФИЦИАЛЬНЫЙ ИМПОРТ ИНДЕКСАТOРА

const _smoAccountingState = {
    totalProcessedTransactions: 0,
    activeBlockedTransactions: 0,
    lastAuditedTxId: -1,
    lastAuditedChannel: "",
    lastAuditedIntent: "",
    lastAuditedOrigin: "0" 
};
Object.preventExtensions(_smoAccountingState);

let _LAST_DIAGNOSED_WM_INDEX = -1;

/**
 * Осуществляет одиночный такт продвижения имитационной модели СМО с прецизионным аудитом транзактов
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 * @returns {boolean} Флаг наличия мутаций данных во всей системе
 */
export function processEngineSingleTick(kernel) {
    if (!kernel || !_gpssEngineState.runtime) return false;

    let hasGlobalMutations = false;
    let isResizeDetected = false;
    
    const activeFacilitiesKeys = _gpssEngineState.facilitiesKeysCached;
    const keysLen = activeFacilitiesKeys.length;

    // ФАЗА 1: ПРЕЦИЗИОННЫЙ УЧЕТ И ВЕКТОРНЫЙ АУДИТ ОЧЕРЕДЕЙ ПРИБОРОВ
    for (let i = 0; i < keysLen; i++) {
        const slotId = activeFacilitiesKeys[i];
        if (slotId === "1") continue;

        const facility = _gpssEngineState.facilitiesRegistry.get(slotId);
        if (!facility || !facility.localQueue) continue;

        const q = facility.localQueue;
        const currentHead = Math.floor(facility._head || 0);
        const currentTail = q.length;

        if (currentHead < currentTail) {
            const currentTx = q[currentHead];
            
            if (currentTx && currentTx.status === "READY") {
                _smoAccountingState.totalProcessedTransactions++;
                _smoAccountingState.lastAuditedTxId = Math.floor(currentTx.id || 0);
                _smoAccountingState.lastAuditedChannel = slotId;
                _smoAccountingState.lastAuditedIntent = String(currentTx.P2 || "");
                _smoAccountingState.lastAuditedOrigin = String(currentTx.O1 || "0");
                _smoAccountingState.activeBlockedTransactions = currentTail - currentHead;

                // СИНХРОННЫЙ ПЕРЕХВАТ ИНВАЛИДАЦИИ КАДРА БЕЗ РАСШИРЕНИЯ ОБЪЕКТОВ
                if (_smoAccountingState.lastAuditedIntent === "INVALIDATE_SLOT_CONTAINER") {
                    if (currentTx.P3 && currentTx.P3.targetSlotId) {
                        const targetIdStr = String(currentTx.P3.targetSlotId);
                        const dirtyFacility = _gpssEngineState.facilitiesRegistry.get(targetIdStr);
                        
                        if (dirtyFacility) {
                            if (dirtyFacility.mdl) { 
                                dirtyFacility.mdl._isDirty = true; 
                            }
                            
                            if (Array.isArray(dirtyFacility.viewStack)) {
                                const activeIdxWM = Math.max(0, Math.floor(dirtyFacility.activeStackIdx || 0)) & 3;
                                const targetTriad = dirtyFacility.viewStack[activeIdxWM];
                                if (targetTriad && targetTriad.mdl) {
                                    targetTriad.mdl._isDirty = true;
                                }
                            }
                        }
                        hasGlobalMutations = true;
                    }
                }

                if (_smoAccountingState.lastAuditedIntent !== "ANIMATION_TICK") {
                    writeCoreLogMessageInline(
                        "[SMO_CLOCK_AUDIT] TX #" + _smoAccountingState.lastAuditedTxId + 
                        " | ORIGIN: " + _smoAccountingState.lastAuditedOrigin + 
                        " -> TARGET: " + slotId + " (" + String(facility.componentType).toUpperCase() + ")" +
                        " | INTENT: " + _smoAccountingState.lastAuditedIntent +
                        " | QUEUE: " + _smoAccountingState.activeBlockedTransactions + " ед.\n"
                    );
                }
            }
        }

        if (facility && typeof facility.advanceFacility === "function") {
            const mutated = facility.advanceFacility();
            if (mutated === true) {
                hasGlobalMutations = true;
                if (slotId === "9") {
                    isResizeDetected = true;
                }
            }
        }
    }

    // ФАЗА 1.5: ПРИНУДИТЕЛЬНЫЙ ТАКТОВЫЙ ИМПУЛЬС ДЛЯ ДАШБОРДА
    const dashboardFacility = _gpssEngineState.facilitiesRegistry.get("101");
    if (dashboardFacility && typeof dashboardFacility.advanceFacility === "function") {
        const dashboardMutated = dashboardFacility.specificAdvanceWorker(dashboardFacility, "UPDATE_ANIMATION_SHAPE", null, null);
        if (dashboardMutated === true) {
            hasGlobalMutations = true;
        }
    }

    // =================================================================
    // ФАЗА 2: РЕАКТИВНАЯ ФИНАЛИЗАЦИЯ И СИНХРОННЫЙ СДВИГ БЛАЙТЕРА
    // =================================================================
    if (hasGlobalMutations || isResizeDetected || (kernel.virtualCanvasState && kernel.virtualCanvasState.isDirty === true)) {
    
    // ИСПРАВЛЕНО: Деструктивный сброс тотально удален отсюда. 
    // Вектор паспортов теперь персистентен на протяжении всей фазы кликов!

    if (isResizeDetected) {
        if (typeof forceInvalidateShadowCanvas === "function") forceInvalidateShadowCanvas();
    }
    if (kernel.virtualCanvasState) kernel.virtualCanvasState.isDirty = true;

    hasGlobalMutations = true; 
    generateGpssTransaction("1", "EXECUTE_RENDER", null, "9");
}
return hasGlobalMutations;
}

