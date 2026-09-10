/**
 * @file src/core/smo/root_intent_handler.js
 * @version 4.0.0-RELEASE-SMO-ROOT-INTENT-HANDLER-FULLY-DECOUPLED
 * @description Верховный диспетчер системных интентов Канала 0.
 * ИСПРАВЛЕНО МОНОЛИТИЗИРОВАНИЕ: Логика полностью размоноличена на файлы-редьюсеры на основе транзактов.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { processInitIntent } from "./root_intent_init.js";

// Импортируем узконаправленные процедурные единицы
import { reduceGlobalThemeChange } from "./intents/theme_reducer.js";
import { reduceSystemCommandExecute } from "./intents/cli_reducer.js";

const _rootInitUnitState = { isSystemFullyBooted: false };
Object.preventExtensions(_rootInitUnitState);

// Высокоскоростной мономорфный ОЗУ-реестр JIT-ссылок на функции обработки интентов
const _INTENTS_ROUTING_REGISTRY = new Map([
    ["GLOBAL_THEME_CHANGED", reduceGlobalThemeChange],
    ["SYSTEM_COMMAND_EXECUTE", reduceSystemCommandExecute]
]);

/**
 * Обработка системных прерываний верховного прибора обслуживания Канала 0
 */
export function processSpecificRootLogic(r, actionStr, payloadObj, currentTx) {
    if (!r) return false;
    
    const kernel = r.host ? r.host : r;
    const action = String(actionStr || "");

    // Базовый инфраструктурный интент холодного бута ядра хоста
    if (action === "init") {
        if (typeof processInitIntent === "function") {
            return processInitIntent(_rootInitUnitState, kernel);
        }
        return false;
    }

    if (action === "UPDATE_VIEW") {
        if (kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }
        return true;
    }

    // АТОМАРНЫЙ DOD-РОУТИНГ ПО РАЗМОНОЛИЧЕННЫМ ФАЙЛАМ БЕЗ СВИТЧЕЙ
    // Извлекаем функцию напрямую из Map-индекса компилятора V8 за O(1)
    const targetReducerFn = _INTENTS_ROUTING_REGISTRY.get(action);
    
    if (targetReducerFn !== undefined) {
        return targetReducerFn(kernel, payloadObj, currentTx);
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/root_intent_handler.js
 * Время исправления: 03.09.2026 14:45:00 MSK
 */
