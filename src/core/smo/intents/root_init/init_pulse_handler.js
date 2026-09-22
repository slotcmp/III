/**
 * @file src/core/smo/intents/init/init_pulse_handler.js
 * @version 1.0.0-RELEASE-SMO-IDD-INIT-PULSE-HANDLER
 * @description Изолированная DOD-процедура холодного пуска ядра (Канал 0).
 * Выполнен в строгой парадигме PAC / DOD / IDD / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../../bus.js";

/**
 * Проводит бутстрап флекс-каскада разметки на шине СМО
 * @param {Object} unitState Локальный ОЗУ-регистр защиты от дребезга
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 * @returns {boolean} Флаг успешности совершения мутации
 */
export function reduceInitIntent(unitState, kernel) {
    if (!unitState || !kernel) return false;
    if (unitState.isSystemFullyBooted === true) return false;
    
    unitState.isSystemFullyBooted = true; 

    // Запускаем расчет трехпроходного флекс-калькулятора на Канале 9 через вызов Канала 11
    generateGpssTransaction("11", "BOOT_LAYOUT_TREE", null, "0");
    unitState.isStageHydratedAndReady = true;
    return true;
}
