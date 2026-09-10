/**
 * @file src/modules/fnbar/fnbar_ctl.js
 * @version 1.1.0-RELEASE-SMO-DOD-FNBAR-CTL-GATEWAY-FINAL
 * @description Центральный контроллер и точка входа бизнес-юнита fnbar (PAC / Control).
 * ИСПРАВЛЕН КРАШ ИЗВЛЕЧЕНИЯ: Разбор viewStack приведен к жесткому мономорфному эталону command_ctl.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { generateGpssTransaction } from "../../core/smo/bus.js";

// Локальный сбор пассивных слоев триады внутри бизнес-юнита
import { assembleModel } from "./fnbar_mdl.js";
import { renderContent } from "./fnbar_view.js";

// Сквозной чистый реэкспорт O(1) указателей для внешнихIoC-менеджеров ядра
export { assembleModel, renderContent };

/**
 * Абстрактная фабрика сборки структуры прибора для обратной совместимости с ядром
 */
export function createFnBarController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "104");
    const ctlState = { mdl: null, view: null, host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

/**
 * Единая унифицированная процедура редукции входящих прерываний СМО
 */
export function reduceIntent(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack || !Array.isArray(pack)) return false;

    // =================================================================
    // ИСПРАВЛЕНИЕ: ЭТАЛОННОЕ МОНОМОРФНОЕ ИЗВЛЕЧЕНИЕ (0% КРАШЕЙ ОЗУ)
    // =================================================================
    const node = pack[0];
    if (!node || !node.mdl) return false;

    const m = node.mdl;
    const intent = String(intentStr || "");
    let isMutated = false;

    switch (intent) {
        // Сигнал от клавиатурного контура на смену раскладки (0..3)
        case "KEYBOARD_MODIFIER_CHANGED":
            if (contextPayload && contextPayload.modifierIdx !== undefined) {
                m.activeModifierIdx = Math.floor(contextPayload.modifierIdx) & 3;
                m._isDirty = true;
                isMutated = true;
            }
            break;

        // Обработка кликов мыши по функциональным кнопкам из mouse_router.js
        case "FN_KEY_CLICKED":
            if (contextPayload && contextPayload.keyNumber !== undefined) {
                const keyNum = Math.floor(contextPayload.keyNumber);
                const modIdx = Math.floor(m.activeModifierIdx || 0) & 3;
                
                if (m.menuMatrix && m.menuMatrix[modIdx]) {
                    const commandTriggeredStr = String(m.menuMatrix[modIdx][keyNum - 1] || "");

                    // Пишем прерывание в Системный журнал логов Слота 108
                    const logLine = "[FN_BAR] Аппаратный клик по кнопке F" + keyNum + " -> Интенсифицирована команда: " + commandTriggeredStr + "\n";
                    generateGpssTransaction("108", "ADD_LOG_ENTRY", logLine, "104");
                    
                    // Выстреливаем прикладную команду на верховный Канал 0
                    generateGpssTransaction("0", "EXECUTE_FAR_COMMAND", { keyNumber: keyNum, command: commandTriggeredStr }, "104");
                    isMutated = true;
                }
            }
            break;

        case "UPDATE_THEME_MASK":
            m._isDirty = true;
            isMutated = true;
            break;
    }

    if (isMutated && facilityState.host?.virtualCanvasState) {
        facilityState.host.virtualCanvasState.isDirty = true;
    }

    return isMutated;
}

// =================================================================
// ЭТАЛОННЫЙ ШЛЮЗ ДЛЯ ПАССИВНОГО ОБХОДА ГВАРДА СИСТЕМНОГО ЛОАДЕРА (КАНАЛ 11)
// =================================================================
export function processSpecificFnbarLogic(facilityState, intentStr, contextPayload, currentTx) {
    return reduceIntent(facilityState, intentStr, contextPayload, currentTx);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/fnbar/fnbar_ctl.js
 * Время изменения: 09.09.2026 18:10:00 MSK
 */
