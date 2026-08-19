/**
 * @file src/core/smo/facility_pipeline.js
 * @version 3.0.0-RELEASE-DOD-FORK
 * @description Базовый конвейер абстрактного прибора СМО (PAC / Control-контур).
 * Выполняет обработку системных транзактов и тактовое инвалидирование ОЗУ-буферов вкладок.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Фабрика сборки базового мономорфного прибора обслуживания СМО
 * @param {Object} hostRef Ссылка на ОЗУ-рантайм хоста приложения
 * @param {string} slotIdStr Строковый идентификатор прибора СМО
 * @param {Function|null} specificWorkerFn Выделенный фазовый фильтр прибора
 * @returns {Object} Запечатанная структура прибора
 */
export function createAbstractFacility(hostRef, slotIdStr, specificWorkerFn) {
    const facilityState = {
        host: hostRef,
        slotId: String(slotIdStr || ""),
        
        localQueue: [],
        _head: 0,
        isProcessing: false,

        viewStack: null,
        activeStackIdx: 0,   // Выделено под мутации каруселей вкладок
        displayIndex: 0,     
        componentType: "slot", // Выделено под строковые домены

        specificAdvanceWorker: typeof specificWorkerFn === "function" ? specificWorkerFn : null,
        dispatch: null,
        advanceFacility: null
    };

    facilityState.dispatch = (actionStr, gpssTx) => {
        if (!gpssTx) return false;
        facilityState.localQueue.push(gpssTx);
        return true;
    };

    facilityState.advanceFacility = () => {
        return advanceFacilityPipeline(facilityState);
    };

    Object.preventExtensions(facilityState);
    return facilityState;
}

/**
 * Продвижение тактовой очереди транзактов внутри прибора обслуживания
 * @param {Object} facilityState Состояние активного прибора СМО
 * @returns {boolean} Флаг наличия мутаций данных
 */
export function advanceFacilityPipeline(facilityState) {
    if (!facilityState) return false;
    if (facilityState.isProcessing) return false;

    const q = facilityState.localQueue;
    if (q.length === facilityState._head) return false;

    facilityState.isProcessing = true;
    let isStateMutated = false;

    while (facilityState._head < q.length) {
        const tx = q[facilityState._head++];
        if (!tx) continue;

        const currentIntentStr = String(tx.P2 || "");

        if (currentIntentStr === "UPDATE_THEME_MASK") {
            _invalidateFacilityMemory(facilityState);
            isStateMutated = true;
            continue; 
        }

        if (facilityState.specificAdvanceWorker) {
            const hasMutations = facilityState.specificAdvanceWorker(
                facilityState, 
                currentIntentStr, 
                tx.P3, 
                tx
            );
            if (hasMutations === true) isStateMutated = true;
        }
    }

    if (facilityState._head === q.length) {
        q.length = 0;
        facilityState._head = 0;
    }

    facilityState.isProcessing = false;
    return isStateMutated;
}

/**
 * Принудительная инвалидация флагов загрязнения в ОЗУ-регистрах вкладок прибора
 */
function _invalidateFacilityMemory(facilityState) {
    const pack = facilityState.viewStack;
    if (!pack) return;
    if (Array.isArray(pack)) {
        const len = pack.length;
        for (let i = 0; i < len; i++) {
            if (pack[i] && pack[i].mdl) pack[i].mdl._isDirty = true;
        }
    } else if (pack.mdl) {
        pack.mdl._isDirty = true;
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/facility_pipeline.js
 * Время модификации: 18.08.2026 17:50:20 MSK
 */
