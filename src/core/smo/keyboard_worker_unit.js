/**
 * @file src/core/smo/keyboard_worker_unit.js
 * @version 4.4.9-RELEASE-SMO-KEYBOARD-UNIT-SIGNATURE-FIXED
 * @description Изолированный фазовый фильтр клавиатуры. Исправлена сигнатура вызова редьюсера символов.
 */
import { _gpssEngineState } from "./bus.js";
import { reduceAltFocusIntent } from "./keyboard_intents/alt_focus_reducer.js";
import { reduceFKeyPulseIntent } from "./keyboard_intents/fkey_pulse_reducer.js";
import { reduceCursorNavIntent } from "./keyboard_intents/cursor_nav_reducer.js";
import { reduceCharForwardIntent } from "./keyboard_intents/char_forward_reducer.js";

export function processSpecificKeyboardLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;
    const kernel = facilityState.host;
    if (!kernel) return false;

    const activeFocusedId = String(kernel.model?.logicalState?.focusedSlotId || "105");
    const intent = String(intentStr || "");

    // ФАЗА 1: Функциональный ряд и стягивание фокуса
    const isFKeyProcessed = reduceFKeyPulseIntent(kernel, intent);
    if (isFKeyProcessed === true) return true;

    // ФАЗА 2: Атомарная смена окна по displayIndex
    const isAltFocusProcessed = reduceAltFocusIntent(kernel, intent, contextPayload);
    if (isAltFocusProcessed === true) return true;

    // ФАЗА 3: Координатная навигация
    const isNavProcessed = reduceCursorNavIntent(intent, contextPayload, activeFocusedId);
    if (isNavProcessed === true) return true;

    // ФАЗА 4: МАРШРУТИЗАЦИЯ СИМВОЛОВ И УПРАВЛЯЮЩИХ КНОПОК ТЕКСТА
    // ИСПРАВЛЕНО: Добавлен обязательный первый аргумент kernel согласно контракту 1.1.2-RELEASE
    const isForwarded = reduceCharForwardIntent(kernel, intent, contextPayload, activeFocusedId);
    return isForwarded;
}