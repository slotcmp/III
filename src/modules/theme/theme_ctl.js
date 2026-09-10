/**
 * @file src/modules/theme/theme_ctl.js
 * @version 5.0.0-RELEASE-SMO-THEME-CTL-ABSTRACT-SEMANTICS
 * @description Системный PAC/WM-контроллер обслуживания Палитры Тем (Канал 106).
 * ИСПРАВЛЕНО: Полностью размоноличен по абстрактному семантическому стандарту collection/pointer.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { _gpssEngineState } from "../../core/smo/bus.js";

// Импортируем строго унифицированные чистые DOD-редьюсеры Палитры
import { reduceCollectionInject } from "./intents/collection_inject.js";
import { reducePointerScroll } from "./intents/pointer_scroll.js";
import { reducePointerSelect } from "./intents/pointer_select.js";
import { reducePointerStep } from "./intents/pointer_step.js";

/**
 * Главная мономорфная точка входа Control-слота абстрактной триады Палитры Тем.
 * @param {Object} triad Ссылка на мономорфный узел { mdl, view, ctl }
 * @param {string} intentStr Имя прерывания
 * @param {Object} contextPayload Данные клика или пакет воркера
 * @returns {boolean} Флаг успешности мутации состояния для перерисовки
 */
export function processIntent(triad, intentStr, contextPayload) {
    if (!triad || !intentStr) return false;

    const intent = String(intentStr || "");
    let isMutated = false;

    // Редукция по строго зафиксированной семантической матрице функций
    if (intent === "UPDATE_THEME_MASK") {
        isMutated = reduceCollectionInject(triad, contextPayload);
    } 
    else if (intent === "NOTIFY_SCROLL_MUTATED") {
        isMutated = reducePointerScroll(triad, contextPayload);
    } 
    else if (intent === "MOUSE_CLICK") {
        isMutated = reducePointerSelect(triad, contextPayload);
    } 
    else if (intent === "MOVE_CURSOR_DOWN" || intent === "MOVE_CURSOR_UP" || 
             intent === "SCROLL_CONTENT_DOWN" || intent === "SCROLL_CONTENT_UP") {
        isMutated = reducePointerStep(triad, intent);
    }

    // Сигнализируем виртуальному холсту о необходимости тактового перерисовывания
    if (isMutated === true) {
        const kernel = _gpssEngineState.runtime;
        if (kernel && kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }
    }

    return isMutated;
}

/**
 * АДАПТЕР ОБРАТНОЙ СОВМЕСТИМОСТИ ДЛЯ СТАРОГО ЗАГРУЗЧИКА ЯДРА (0% GC)
 * Перехватывает старые вызовы от loader_unit.js, безаллокационно собирает
 * абстрактную триаду из стейта и перенаправляет в новый PAC-контур intents.
 */
export function processSpecificThemeLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;

    const pack = facilityState.viewStack;
    if (!pack) return false;

    // Палитра имеет фиксированный стек из одного таба
    const triad = Array.isArray(pack) ? pack[0] : pack;
    if (!triad) return false;

    return processIntent(triad, intentStr, contextPayload);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/theme_ctl.js
 * Время изменения: 10.09.2026 20:58:00 MSK
 */
