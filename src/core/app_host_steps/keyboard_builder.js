/**
 * @file src/core/app_host_steps/keyboard_builder.js
 * @version 1.0.1-RELEASE-SMO-KEYBOARD-BUILDER-STRICT-DOD
 * @description Вынос инлайн-структуры KBD-Прибора 4 в процедурный изолят.
 * ИСПРАВЛЕНО: Интегрирован атомарный коммит статуса транзакта "PROCESSED" для защиты каретки FIFO.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

export function keyboardBuilder(hostState) {
    const strictKeyboardFacility = {
        host: hostState,
        slotId: "4",
        localQueue: [],
        _head: 0,
        isProcessing: false,
        viewStack: null,
        activeStackIdx: 0,
        displayIndex: 4,
        componentType: "keyboard_unit",
        specificAdvanceWorker: null,
        
        dispatch: (actionStr, gpssTx) => {
            if (!gpssTx) return false;
            strictKeyboardFacility.localQueue.push(gpssTx);
            return true;
        },
        
        advanceFacility: () => {
            if (strictKeyboardFacility.isProcessing) return false;
            const q = strictKeyboardFacility.localQueue;
            let headPtr = Math.floor(strictKeyboardFacility._head || 0);
            if (q.length === headPtr) return false;

            strictKeyboardFacility.isProcessing = true;
            let isStateMutated = false;

            while (strictKeyboardFacility._head < q.length) {
                const tx = q[strictKeyboardFacility._head++];
                if (!tx || tx.status !== "READY") continue;

                const currentIntentStr = String(tx.P2 || "");
                const payload = tx.P3;
                const targetSlotIdStr = String(tx.P1 || "105");

                let resolvedIntent = currentIntentStr;
                let resolvedPayload = payload;
                
                if (currentIntentStr === "EXECUTE_RESOLVED_KEY" && payload) {
                    resolvedIntent = String(payload.action || "");
                    resolvedPayload = payload.payload;
                }

                if (strictKeyboardFacility.specificAdvanceWorker) {
                    const hasMutations = strictKeyboardFacility.specificAdvanceWorker(
                        strictKeyboardFacility.host, 
                        resolvedIntent, 
                        resolvedPayload, 
                        targetSlotIdStr
                    );
                    
                    if (hasMutations === true) {
                        isStateMutated = true;
                        tx.status = "PROCESSED"; // Атомарно гасим транзакт в ОЗУ, освобождая шину
                    }
                }
            }

            if (strictKeyboardFacility._head === q.length) {
                q.length = 0;
                strictKeyboardFacility._head = 0;
            }

            strictKeyboardFacility.isProcessing = false;
            return isStateMutated;
        }
    };

    Object.preventExtensions(strictKeyboardFacility);
    return strictKeyboardFacility;
}