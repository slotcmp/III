/**
 * @file src/modules/fnbar/intents/fkey_reducer.js
 * @version 1.0.5-RELEASE-SMO-FNBAR-FKEY-STRICT-DEFAULT-FIXED
 * @description Вынесенный изолированный редьюсер обработки Фазы Б (Выжиг Far-команд по F1..F10).
 * ИСПРАВЛЕНО: Гвард calculatedMod > 0 полностью удален. Цепочка переключения ушек (Фаза А) 
 * теперь принудительно прокручивается при каждом нажатии, гарантируя возврат в DEFAULT.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% try-catch.
 */

import { generateGpssTransaction } from "../../../core/smo/bus.js";
import { createFnbarMdlInstance } from "../fnbar_mdl.js";

let _BACKUP_VALID_MODEL_INSTANCE = null;

export function reduceFnKeyClicked(m, contextPayload, hostFacility) {
    if (!contextPayload || contextPayload.keyNumber === undefined) return false;

    const keyNum = Math.max(1, Math.min(10, Math.floor(contextPayload.keyNumber || 1)));
    
    let calculatedMod = 0; // 0 = DEFAULT
    if (contextPayload.ctrl === true) calculatedMod = 1;
    else if (contextPayload.shift === true) calculatedMod = 2;
    else if (contextPayload.alt === true || contextPayload.meta === true) calculatedMod = 3;

    // =================================================================
    // СИНХРОHHЫЙ НАКАТ ФAЗЫ А: ПРИHУДИТЕЛЬНОЕ ВЫРАВHИВАHИЕ УШЕК В ОЗУ
    // =================================================================
    // Больше никаких гвардов — жестко пишем вычисленный индекс (0, 1, 2 или 3)
    if (hostFacility) {
        hostFacility.activeStackIdx = calculatedMod;
    }
    if (m && m !== hostFacility) {
        m._activeSubZone = calculatedMod;
        if (m.activeStackIdx !== undefined) {
            m.activeStackIdx = calculatedMod;
        }
        m._isDirty = true;
    }

    // Выбиваем веерный транзакт инвалидации, чтобы рендерер мгновенно перерисовал 
    // верхнюю полосу вкладок (Y=0) под зафиксированный calculatedMod
    let debugModNameStr = "DEFAULT";
    if (calculatedMod === 1) debugModNameStr = "CTRL";
    else if (calculatedMod === 2) debugModNameStr = "SHIFT";
    else if (calculatedMod === 3) debugModNameStr = "ALT";

    const now = new Date();
    const timeStr = "[" + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + ":" + String(now.getSeconds()).padStart(2, "0") + "]";
    const switchLogStr = timeStr + " [WM_TAB_CHAIN] Клавиатурный каскад форсировал маску: '" + debugModNameStr + "'\n";
    generateGpssTransaction("108", "ADD_LOG_ENTRY", switchLogStr, "104");

    generateGpssTransaction("9", "INVALIDATE_SLOT_CONTAINER", { targetSlotId: "104" }, "104");

    // =================================================================
    // ВЫПОЛHЕHИЕ ФAЗЫ Б: ИЗВЛЕЧЕHИЕ И ВЫСТРЕЛ Far-КOМАHДЫ
    // =================================================================
    let currentMod = hostFacility 
        ? (Math.max(0, Math.floor(hostFacility.activeStackIdx || 0)) & 3)
        : ((m && m._activeSubZone !== undefined) ? (Math.max(0, Math.floor(m._activeSubZone)) & 3) : 0);

    const hardwareModifierAuditLineStr = 
        timeStr + " [ANTI_GHOST_AUDIT] Исполнение Фазы Б -> ИHДЕКС: " + currentMod + 
        " | АКТИВHАЯ МАСКА: '" + debugModNameStr + "'\n";
        
    generateGpssTransaction("108", "ADD_LOG_ENTRY", hardwareModifierAuditLineStr, "104");

    let targetCommandStr = "NoOp";
    if (m && m.menuMatrix && Array.isArray(m.menuMatrix) && m.menuMatrix[currentMod]) {
        targetCommandStr = String(m.menuMatrix[currentMod][keyNum] || "NoOp");
    }

    if (targetCommandStr === "NoOp") {
        if (_BACKUP_VALID_MODEL_INSTANCE === null) {
            _BACKUP_VALID_MODEL_INSTANCE = createFnbarMdlInstance();
        }
        const backupMatrix = _BACKUP_VALID_MODEL_INSTANCE.menuMatrix;
        if (backupMatrix && backupMatrix[currentMod]) {
            targetCommandStr = String(backupMatrix[currentMod][keyNum] || "NoOp");
        }
    }

    generateGpssTransaction("0", "EXECUTE_FAR_COMMAND", { 
        keyNumber: keyNum, 
        commandName: targetCommandStr,
        ctrl: contextPayload.ctrl === true,
        shift: contextPayload.shift === true,
        meta: contextPayload.meta === true,
        alt: contextPayload.alt === true || contextPayload.meta === true
    }, "104");

    return true;
}
