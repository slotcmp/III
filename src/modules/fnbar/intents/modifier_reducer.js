/**
 * @file src/modules/fnbar/intents/modifier_reducer.js
 * @version 1.0.4-RELEASE-SMO-FNBAR-MODIFIER-STRICT-SAFE
 * @description Редьюсер обработки Фазы А. Ликвидирован краш TypeError за счет удаления записи в незадекларированные поля.
 */
import { generateGpssTransaction } from "../../../core/smo/bus.js";

export function reduceKeyboardModifierChanged(m, contextPayload, hostFacility) {
    if (!contextPayload || contextPayload.modifierIdx === undefined) return false;

    const nextMod = Math.max(0, Math.floor(contextPayload.modifierIdx || 0)) & 3;

    // 1. Гарантированно пишем в корень Window Manager фасилити-прибора (это поле преаллоцировано)
    if (hostFacility) {
        hostFacility.activeStackIdx = nextMod; 
    }

    // 2. Пишем во внутренний регистр фазы модели, существующий в Hidden Class со старта бутстрапа
    if (m && m !== hostFacility) {
        m._activeSubZone = nextMod; // ◄── ИСПРАВЛЕНО: activeStackIdx УДАЛЕН (ЗАЩИТА ОТ КРАША)
        m._isDirty = true;
    }

    let debugModNameStr = "DEFAULT";
    if (nextMod === 1) debugModNameStr = "CTRL";
    else if (nextMod === 2) debugModNameStr = "SHIFT";
    else if (nextMod === 3) debugModNameStr = "ALT";

    const now = new Date();
    const timeStr = "[" + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + ":" + String(now.getSeconds()).padStart(2, "0") + "]";
    const switchLogStr = timeStr + " [WM_TAB_CHAIN] Цепочка клика по ушку активна -> Раскладка переведена на: '" + debugModNameStr + "'\n";
    generateGpssTransaction("108", "ADD_LOG_ENTRY", switchLogStr, "104");

    generateGpssTransaction("9", "INVALIDATE_SLOT_CONTAINER", { targetSlotId: "104" }, "104");
    return true;
}