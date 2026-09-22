/**
 * @file src/modules/command/command_ctl.js
 * @version 5.5.2-RELEASE-SMO-COMMAND-CTL-STRICT-ROOT-EXTRACTOR
 * @description Стерильный роутер и фазовый фильтр СМО-прибора Канала 105 (Control-контур).
 * ИСПРАВЛЕНО: Экстрактор переведен на жесткий DOD-приоритет извлечения mdl/view напрямую из корня фасилити.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

// Импортируем изолированные шаги сборщика
import { commandHistory } from "./command_steps/commandHistory.js";
import { commandFocus } from "./command_steps/commandFocus.js";
import { commandRouter } from "./command_steps/commandRouter.js";

export function createCommandController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "105");
    const ctlState = { mdl: null, view: null, host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

export function processSpecificCommandLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;

    // =================================================================
    // СИНХРОНИЗИРOВAНO: ПРЯМOЙ DOD-СБOР МOДЕЛИ И ВЬЮХИ ИЗ КOРНЯ ПAСПOРТA
    // =================================================================
    // Так как для плоского Слота 105 фабрика ядра кладет триаду напрямую в корень фасилити
    let m = facilityState.mdl;
    let v = facilityState.view;

    // Фолбэк на случай, если в вашей ревизии структуры упакованы во viewStack
    if (!m || !v) {
        const pack = facilityState.viewStack;
        if (Array.isArray(pack) && pack[0]) {
            m = pack[0].mdl;
            v = pack[0].view;
        } else if (pack && !Array.isArray(pack)) {
            m = pack.mdl;
            v = pack.view;
        }
    }

    // Если структуры по-прежнему не найдены — пассивно гасим такт шины СМО
    if (!m || !v) return false;

    const kernel = facilityState.host;
    const intent = String(intentStr || "");

    // Шаг 1: Ленивая линковка буферов истории
    commandHistory(m, kernel);

    // Шаг 2: Синхронизация флагов фокуса в модель и вьюху
    commandFocus(m, v, kernel);

    if (intent !== "TAB_COMPLETION_REQUEST" && m._tabCompletionActive === true) {
        m._tabCompletionActive = false;
        m._matchCount = 0;
    }

    // Шаг 3: Проброс в изолированный вычислительный роутер интентов
    const isMutated = commandRouter(m, intentStr, contextPayload, currentTx, kernel, facilityState);

    if (isMutated && kernel?.virtualCanvasState) {
        kernel.virtualCanvasState.isDirty = true;
    }

    return isMutated;
}
