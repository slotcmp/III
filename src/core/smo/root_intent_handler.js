/**
 * @file src/core/smo/root_intent_handler.js
 * @version 4.1.0-RELEASE-SMO-ROOT-INTENT-HANDLER-IDD-FOCUS-FIXED
 * @description Верховный диспетчер системных интентов Канала 0.
 * ИСПРАВЛЕНО: Интегрирован импорт и O(1) маршрутизация интента SET_SLOT_FOCUS
 * через мономорфный ОЗУ-реестр без разрушения скрытых классов V8 TurboFan.
 * Выполнен в строгой парадигме PAC / DOD / IDD / 0% OOP / 0% RegExp.
 */

import { processInitIntent } from "./root_intent_init.js";

// Импортируем узконаправленные процедурные единицы
import { reduceGlobalThemeChange } from "./intents/theme_reducer.js";
import { reduceSystemCommandExecute } from "./intents/cli_reducer.js";
import { reduceFarCommandExecute } from "./intents/far_command_reducer.js"; 
import { reduceSlotFocusChange } from "./intents/focus_reducer.js"; // ◄── ИНЖЕКЦИЯ IDD-РЕДЬЮСЕРА ФOКУСА

const _rootInitUnitState = { isSystemFullyBooted: false };
Object.preventExtensions(_rootInitUnitState);

// Высокоскоростной мономорфный ОЗУ-реестр JIT-ссылок на функции обработки интентов
const _INTENTS_ROUTING_REGISTRY = new Map([
    ["GLOBAL_THEME_CHANGED",   reduceGlobalThemeChange],
    ["SYSTEM_COMMAND_EXECUTE", reduceSystemCommandExecute],
    ["EXECUTE_FAR_COMMAND",    reduceFarCommandExecute],
    ["SET_SLOT_FOCUS",         reduceSlotFocusChange] // ◄── ЛЕГИТИМИЗИРУЕМ ПРОХОД ИНТЕНТА ИЗ КАНАЛА 10
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

    // АТОМАРНЫЙ DOD-РОУТИНГ ПО РАЗМОНОЛИЧЕННЫМ ФАЙЛАМ БЕЗ СВИТЧЕЙ И МАТРЕШЕК
    const targetReducerFn = _INTENTS_ROUTING_REGISTRY.get(action);
    
    if (targetReducerFn !== undefined) {
        return targetReducerFn(kernel, payloadObj, currentTx);
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/root_intent_handler.js
 * Время изменения: 18.09.2026 03:14:00 MSK
 */
