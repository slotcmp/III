/**
 * @file src/core/smo/facility_pipeline.js
 * @version 3.7.1-RELEASE-SMO-FACILITY-PIPELINE-ORIGIN-COMPLIANT
 * @description Абстрактный конвейер продвижения требований внутри приборов СМО (Control-контур).
 * ИСПРАВЛЕН ORIGIN: Транзакт tx целиком проброшен в конкретный advance-воркер прибора.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Фабрика генерации структуры абстрактного прибора обслуживания СМО
 */
export function createAbstractFacility(hostRef, slotIdStr, workerFn, componentTypeStr, displayIndexNum) {
    const facility = {
        host: hostRef,
        slotId: String(slotIdStr),
        localQueue: [],
        _head: 0,
        isProcessing: false,
        viewStack: null,
        activeStackIdx: 0,
        displayIndex: Math.floor(displayIndexNum || 0),
        componentType: String(componentTypeStr),
        specificAdvanceWorker: workerFn,
        
        advanceFacility: () => {
            if (facility.isProcessing) return false;
            
            const q = facility.localQueue;
            const head = Math.floor(facility._head || 0);
            if (q.length === head) return false;

            facility.isProcessing = true;
            let isStateMutated = false;

            while (facility._head < q.length) {
                const tx = q[facility._head++];
                if (!tx || tx.status !== "READY") continue;

                const intent = String(tx.P2 || "");
                const payload = tx.P3;

                if (facility.specificAdvanceWorker) {
                    // Сквозной проброс tx, содержащего tx.O1 (origin), в ctl-слой прибора
                    const mutated = facility.specificAdvanceWorker(facility, intent, payload, tx);
                    if (mutated === true) {
                        isStateMutated = true;
                    }
                }
            }

            if (facility._head === q.length) {
                q.length = 0;
                facility._head = 0;
            }

            facility.isProcessing = false;
            return isStateMutated;
        }
    };

    // Сам прибор остается extensible, его запечатает Единая Точка в slot_maker.js!
    return facility;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/facility_pipeline.js
 * Время исправления: 03.09.2026 16:11:45 MSK
 */
