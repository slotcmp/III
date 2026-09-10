/**
 * @file src/core/smo/gpss_engine_scan.js
 * @version 5.4.0-RELEASE-SMO-CLOCK-SCAN-AUDIT-WITH-ORIGIN
 * @description Центральный тактовый автомат и аудитор имитационной шины СМО (Control-контур).
 * ИСПРАВЛЕН ФОРМАТ ЛОГА: В дисковую трассировку прецизионно интегрирован паспорт источника требований ORIGIN (O1).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% GC.
 */

import { _gpssEngineState, generateGpssTransaction } from "./bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";
import { writeCoreLogMessageInline } from "./logger_io.js";

const _smoAccountingState = {
    totalProcessedTransactions: 0,
    activeBlockedTransactions: 0,
    lastAuditedTxId: -1,
    lastAuditedChannel: "",
    lastAuditedIntent: "",
    // Преаллоцируем регистр для сохранения Hidden Class
    lastAuditedOrigin: "0" 
};
Object.preventExtensions(_smoAccountingState);

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
                
                // Извлекаем прецизионный паспорт источника из транзакта шины
                _smoAccountingState.lastAuditedOrigin = String(currentTx.O1 || "0");
                
                _smoAccountingState.activeBlockedTransactions = currentTail - currentHead;

                // Инлайновый масочный гвард блокировки спама логгера для ANIMATION_TICK сохранен
                if (_smoAccountingState.lastAuditedIntent !== "ANIMATION_TICK") {
                    // =================================================================
                    // МОДИФИКАЦИЯ: НОВЫЙ ДЕТЕРМИНИРОВАННЫЙ ФОРМАТ ДИСКОВОГО ЛОГА СМО
                    // =================================================================
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

    // ФАЗА 2: РЕАКТИВНАЯ ФИНАЛИЗАЦИЯ И СИНХРОННЫЙ СДВИГ БЛАЙТЕРА ПРЕЗЕНТАЦИИ
    if (hasGlobalMutations || isResizeDetected || (kernel.virtualCanvasState && kernel.virtualCanvasState.isDirty === true)) {
        
        if (isResizeDetected) {
            if (typeof forceInvalidateShadowCanvas === "function") {
                forceInvalidateShadowCanvas();
            }
        }

        if (kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }

        generateGpssTransaction("1", "EXECUTE_RENDER", null, "9");
    }

    return hasGlobalMutations;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/gpss_engine_scan.js
 * Время исправления: 03.09.2026 16:52:00 MSK
 */
