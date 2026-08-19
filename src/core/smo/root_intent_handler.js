/**
 * @file src/core/smo/root_intent_handler.js
 * @version 3.0.2-RELEASE-SMO-ROOT-INTENT-HANDLER-DOD
 * @description Главный диспетчер прерываний и системных интентов Канала 0.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { processInitIntent } from "./root_intent_init.js";
import { generateGpssTransaction, _gpssEngineState } from "./bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";

const _rootInitUnitState = {
    isSystemFullyBooted: false
};
Object.preventExtensions(_rootInitUnitState);

/**
 * Обработка системных прерываний верховного прибора обслуживания
 * @param {Object} r Ссылка на рантайм ядра хоста приложения
 * @param {string} actionStr Идентификатор прерывания (интент)
 * @param {Object} payloadObj Контекст данных транзакта
 * @param {Object} currentTx Полный паспорт транзакта СМО
 * @returns {boolean} Флаг наличия мутаций рантайма
 */
export function processSpecificRootLogic(r, actionStr, payloadObj, currentTx) {
    if (!r) return false;

    const action = String(actionStr || "");
    let isMutated = false;

    switch (action) {
        case "init":
            if (typeof processInitIntent === "function") {
                isMutated = processInitIntent(_rootInitUnitState, r);
            }
            break;

        case "GLOBAL_THEME_CHANGED":
            if (payloadObj && payloadObj.colorMask) {
                const configObj = r.model?.logicalState?.appSettings;
                if (configObj) {
                    configObj.currentBorderAnsiMask = String(payloadObj.colorMask);
                    if (typeof forceInvalidateShadowCanvas === "function") forceInvalidateShadowCanvas();
                    isMutated = true;

                    if (typeof generateGpssTransaction === "function") {
                        const allRegisteredKeys = Array.from(_gpssEngineState.facilitiesRegistry.keys());
                        for (let i = 0; i < allRegisteredKeys.length; i++) {
                            const slotId = allRegisteredKeys[i];
                            if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9") continue;
                            generateGpssTransaction(slotId, "UPDATE_THEME_MASK", null);
                        }
                    }
                }
            }
            break;

        case "UPDATE_VIEW":
            isMutated = true;
            break;
    }

    return isMutated;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/root_intent_handler.js
 * Время modification: 18.08.2026 19:29:45 MSK
 */
