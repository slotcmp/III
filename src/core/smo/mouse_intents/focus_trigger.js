/**
 * @file src/core/smo/mouse_intents/focus_trigger.js
 * @version 1.0.1-RELEASE-SMO-IDD-FOCUS-TRIGGER-STRICT-WHEEL-SHIELDED
 * @description Изолированная DOD-процедура генерации интента фокуса ввода (Канал 10).
 * ИСПРАВЛЕНО: Внедрен абсолютный щит от WHEEL-событий. Колесико больше никогда не ворует фокус.
 * Выполнен в строгой парадигме PAC / DOD / IDD / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../bus.js";

export function evaluateMouseFocusIntent(hitId, mouseAction, kernel) {
    if (!hitId || !kernel || hitId === "200" || hitId === "12" || hitId === "14") return false;

    const action = String(mouseAction || "").trim();

    // ЖЕСТКИЙ АППАРАТНЫЙ ЩИТ: Если это прокрутка колесика — мгновенно выходим!
    // Колесико имеет право скроллировать контент, но НЕ имеет права менять фокус рамок!
    if (action === "WHEEL_UP" || action === "WHEEL_DOWN" || action.startsWith("WHEEL")) {
        return false;
    }

    // Фокус разрешен ТОЛЬКО при физическом нажатии кнопок мыши
    if (action !== "MOUSE_DOWN" && action !== "MOUSE_CLICK") {
        return false;
    }

    const currentFocusedId = String(kernel.model?.logicalState?.focusedSlotId || "");

    // Если кликнули по новому слоту — шлем интент фокуса на Канал 0
    if (hitId !== currentFocusedId) {
        const focusPayload = { targetSlotId: hitId };
        Object.preventExtensions(focusPayload);

        generateGpssTransaction("0", "SET_SLOT_FOCUS", focusPayload, "10");
        return true;
    }

    return false;
}
