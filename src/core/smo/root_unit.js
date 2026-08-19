/**
 * @file src/core/smo/root_unit.js
 * @version 3.0.1-RELEASE-SMO-ROOT-UNIT-DOD
 * @description Верховный инфраструктурный прибор обслуживания СМО (Канал 0).
 * Координирует первичный запуск ядра, глобальную смену тем оформления и рефреш экранов.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction } from "./bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";

const _rootSystemState = { isBooted: false };
Object.preventExtensions(_rootSystemState);

/**
 * Фабрика структуры: аллокация и прогрев состояния СМО-прибора Канала 0
 * @param {Object} appGpssBusRef Ссылка на шину СМО
 * @returns {Object} Запечатанное состояние прибора
 */
export function assemble(appGpssBusRef) {
    const unitState = {
        hub: appGpssBusRef,
        localQueue: [],
        isProcessing: false,
        _head: 0,
        componentType: "root_unit",
        displayIndex: 0,
        
        dispatch: null,
        advanceFacility: null
    };

    unitState.dispatch = (actionType, transaction) => {
        if (!transaction) return false;
        unitState.localQueue.push(transaction);
        return true;
    };

    unitState.advanceFacility = () => {
        return advanceQueueFacility(unitState);
    };

    Object.preventExtensions(unitState);
    return unitState;
}

/**
 * Чистая процедура продвижения очереди прерываний верховного Прибора 0
 * @param {Object} unitState Состояние прибора
 * @returns {boolean} Флаг наличия мутаций рантайма
 */
function advanceQueueFacility(unitState) {
    const r = unitState.hub;
    const q = unitState.localQueue;
    if (!r || unitState.isProcessing || q.length === unitState._head) return false;

    unitState.isProcessing = true;
    let hasMutations = false;

    while (unitState._head < q.length) {
        const tx = q[unitState._head];
        unitState._head++;
        if (!tx) continue;

        const intent = String(tx.P2 || "");
        const payloadObj = tx.P3;

        switch (intent) {
            case "init":
                if (!_rootSystemState.isBooted) {
                    _rootSystemState.isBooted = true;
                    hasMutations = true;
                    
                    // СМО-МАРШАЛИНГ: Передаем импульс ресайза на Прибор Канала 9
                    generateGpssTransaction("9", "TRIGGER_RESIZE", {
                        w: Math.max(40, process.stdout.columns || 120),
                        h: Math.max(10, process.stdout.rows || 30)
                    });
                }
                break;

            case "GLOBAL_THEME_CHANGED":
                if (payloadObj && payloadObj.colorMask && r.model?.logicalState?.appSettings) {
                    r.model.logicalState.appSettings.currentBorderAnsiMask = String(payloadObj.colorMask);
                    if (typeof forceInvalidateShadowCanvas === "function") forceInvalidateShadowCanvas();
                    hasMutations = true;
                }
                break;

            case "UPDATE_VIEW":
                hasMutations = true;
                break;
        }
    }

    if (unitState._head === q.length) {
        q.length = 0;
        unitState._head = 0;
    }

    unitState.isProcessing = false;
    return hasMutations;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/root_unit.js
 * Время модификации: 18.08.2026 16:58:30 MSK
 */
