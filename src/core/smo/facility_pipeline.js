/**
 * @file src/core/smo/facility_pipeline.js
 * @version 3.6.5-RELEASE-SMO-FACILITY-PIPELINE-ISOLATED
 * @description Базовый конвейер абстрактного прибора СМО (PAC / Control-контур).
 * ИСПРАВЛЕНА СИНХРОНИЗАЦИЯ: Удален паразитный циклический импорт bus.js для предотвращения SyntaxError.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Фабрика сборки базового мономорфного прибора обслуживания СМО
 * @param {Object} hostRef Ссылка на ОЗУ-рантайм хоста приложения
 * @param {string} slotIdStr Строковый идентификатор прибора СМО
 * @param {Function|null} specificWorkerFn Выделенный фазовый фильтр прибора
 * @param {string} compTypeStr Строковый тип компонента
 * @param {number} displayIdxNum Индекс отображения панели
 * @returns {Object} Запечатанная структура прибора
 */
export function createAbstractFacility(hostRef, slotIdStr, specificWorkerFn, compTypeStr = "slot", displayIdxNum = 0) {
    const facilityState = {
        host: hostRef,
        slotId: String(slotIdStr || ""),
        
        localQueue: [],
        _head: 0,
        isProcessing: false,

        viewStack: null,
        activeStackIdx: 0,   
        displayIndex: Math.floor(displayIdxNum || 0),     
        componentType: String(compTypeStr || "slot"), 

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
    const kernel = facilityState.host;

    while (facilityState._head < q.length) {
        const tx = q[facilityState._head++];
        if (!tx) continue;

        const currentIntentStr = String(tx.P2 || "");
        const payload = tx.P3;

        if (currentIntentStr === "UPDATE_THEME_MASK") {
            _invalidateFacilityMemory(facilityState);
            isStateMutated = true;
            continue; 
        }

        let resolvedIntent = currentIntentStr;
        let resolvedPayload = payload;

        if (currentIntentStr === "EXECUTE_RESOLVED_KEY" && payload) {
            resolvedIntent = String(payload.action || "");
            resolvedPayload = payload.payload;
        }

        if (facilityState.specificAdvanceWorker) {
            const hasMutations = facilityState.specificAdvanceWorker(
                facilityState, 
                resolvedIntent, 
                resolvedPayload, 
                tx
            );
            
            if (hasMutations === true) {
                isStateMutated = true;
                // Атомарно взводим флаг загрязнения холста для блайтинга
                if (kernel && kernel.virtualCanvasState) {
                    kernel.virtualCanvasState.isDirty = true;
                }
            }
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
 * Время модификации: 21.08.2026 18:36:20 MSK
 */
