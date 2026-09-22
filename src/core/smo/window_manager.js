/**
 * @file src/core/smo/window_manager.js
 * @version 1.3.0-RELEASE-SMO-WM-STRICT-DISPATCHER
 * @description Верховный централизованный диспетчер кинематики TUI-интерфейса.
 * ИСПРАВЛЕНО: Полностью очищен от всех видов прокрутки (логика делегирована в Канал 14).
 * Выполнен в строгой парадигме PAC / DOD / Zero Allocation / 0% GC.
 */
import { reduceCursorStep } from "./window_manager_intents/cursor_step_reducer.js";
import { reduceMouseWheel } from "./window_manager_intents/mouse_wheel_reducer.js";
import { reduceMouseClick } from "./window_manager_intents/mouse_click_reducer.js";
import { reduceStackRotation } from "./window_manager_intents/stack_rotation_reducer.js";
import { reduceThemeSync } from "./window_manager_intents/theme_sync_reducer.js";

/**
 * Маршрутизирует неспецифические прерывания оконной кинематики
 */
export function processGenericUiKinematics(facility, intentStr, contextPayload) {
    if (!facility) return false;

    const intent = String(intentStr || "");

    // Window Manager больше не содержит громоздких веерных редьюсеров прокрутки.
    // Его vtable-таблица роутинга обрабатывает только чистую Ui-кинематику фокуса и шага:

    if (intent === "MOVE_CURSOR_DOWN" || intent === "MOVE_CURSOR_UP") {
        return reduceCursorStep(facility, intent);
    }
    if (intent === "MOUSE_CLICK") {
        return reduceMouseClick(facility, contextPayload);
    }
    if (intent === "ROTATE_SLOT_STACK") {
        return reduceStackRotation(facility);
    }
    if (intent === "UPDATE_THEME_MASK") {
        return reduceThemeSync(facility);
    }

    return false;
}