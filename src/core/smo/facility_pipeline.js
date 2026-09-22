/**
 * @file src/core/smo/facility_pipeline.js
 * @version 4.7.3-RELEASE-SMO-FACILITY-PIPELINE-EXTENSIBILITY-GUARDED
 * @description Инфраструктурный конвейер приборов СМО с вытесняющей приоритетной сортировкой.
 * ИСПРАВЛЕНО: Внедрены строгие гварды на Object.isExtensible для защиты от TypeError на строке 58.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { generateGpssTransaction } from "./bus.js";
import { dumpSlotFocusTransaction } from "./debug/bus_tracer.js";
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
            const q = facility.localQueue;
            let head = Math.floor(facility._head || 0);
            if (q.length === head) return false;

            // Считываем интент на самой вершине честной FIFO-очереди
            const tx = q[head];
            const previewIntent = tx ? String(tx.P2 || "").trim() : "";
            let isStateMutated = false;

// =================================================================
            // ВЫЗОВ ВНЕШНЕГО ИЗОЛИРОВАННОГО МОДУЛЯ ТРАССИРОВКИ ИНТЕНТОВ (IDD)
            // =================================================================
            dumpSlotFocusTransaction(facility, tx); 
            // =================================================================
            // КОНТУР АБСОЛЮТНОГО ЗАМЕЩЕНИЯ №1: РОТАЦИЯ ТЕЛ ОКOН (SWITCH_SLOT_TAB)
            // =================================================================
            if (previewIntent === "SWITCH_SLOT_TAB") {
                facility.isProcessing = true; // Силовое инфраструктурное замещение роли
                
                facility._head++; // АТОМАРНО СДВИГАЕМ КАРЕТКУ FIFO-ОЧЕРЕДИ СМО
                const payload = tx.P3;

                if (payload) {
                    const nextIdx = Math.max(0, Math.floor(payload.targetStackIdx || payload.tabIdx || 0)) & 15;
                    
                    // Запечатываем вычисленный индекс в единственный корневой регистр фасилити
                    facility.activeStackIdx = nextIdx;

                    // ИСПРАВЛЕНИЕ СТРОКИ 58: Безопасный выжиг в корневую модель с гвардом расширяемости
                    const fMdl = facility.mdl;
                    if (fMdl) {
                        if (Object.isExtensible(fMdl) && fMdl.activeModifierIdx !== undefined) {
                            fMdl.activeModifierIdx = nextIdx;
                        }
                        fMdl._activeSubZone = nextIdx;
                        fMdl._isDirty = true;
                    }

                    // Зеркально обновляем внутреннюю модель триады для совместимости со старыми ctl-контурами
                    const pack = facility.viewStack;
                    if (Array.isArray(pack) && pack[nextIdx]) {
                        const activeNode = pack[nextIdx];
                        const activeMdl = activeNode?.mdl;

                        if (activeMdl) {
                            activeMdl._isDirty = true;
                            if (Object.isExtensible(activeMdl) && activeMdl.activeModifierIdx !== undefined) {
                                activeMdl.activeModifierIdx = nextIdx;
                            }
                            activeMdl._activeSubZone = nextIdx;
                        }
                    }

                    tx.status = "INFRA_PROCESSED";

                    if (facility.host?.virtualCanvasState) {
                        facility.host.virtualCanvasState.isDirty = true;
                    }
                }

                facility.isProcessing = false;
                return true;
            }

            // =================================================================
            // КОНТУР АБСОЛЮТНОГО ЗАМЕЩЕНИЯ №2: МЕТРИКИ СКРОЛЛБАРА (SYNC_SCROLLBAR_METRICS)
            // =================================================================
            if (previewIntent === "SYNC_SCROLLBAR_METRICS") {
                facility.isProcessing = true;
                
                facility._head++;
                const payload = tx.P3;
                const m = facility.mdl;

                if (payload && m) {
                    const srcSlotIdNum = Math.floor(payload.slotIdNum || payload.slotId || 0) & 255;
                    
                    if (m.totalItemsRegistry && srcSlotIdNum > 0) {
                        m.totalItemsRegistry[srcSlotIdNum] = Math.max(1, Math.floor(payload.totalItems || 1));
                    }
                    if (m.viewportOffsetRegistry && srcSlotIdNum > 0) {
                        m.viewportOffsetRegistry[srcSlotIdNum] = Math.max(0, Math.floor(payload.viewportOffset || 0));
                    }

                    tx.status = "INFRA_PROCESSED";

                    if (facility.host?.virtualCanvasState) {
                        facility.host.virtualCanvasState.isDirty = true;
                    }
                }

                facility.isProcessing = false;
                return true; 
            }

            // =================================================================
            // ПРИКЛАДНОЙ БИЗНЕС-КОНТУР (Вступает в силу строго для прикладных интентов)
            // =================================================================
            if (facility.isProcessing) return false;

            facility.isProcessing = true;

            while (facility._head < q.length) {
                const liveTx = q[facility._head++];
                if (!liveTx || liveTx.status !== "READY") continue;

                const intent = String(liveTx.P2 || "").trim();
                const payload = liveTx.P3;

                if (facility.specificAdvanceWorker) {
                    const mutated = facility.specificAdvanceWorker(facility, intent, payload, liveTx);
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

    return facility;
}
