/**
 * @file src/core/smo/intents/far_command_reducer.js
 * @version 1.0.1-RELEASE-SMO-FAR-COMMAND-TEXT-COMPLIANT
 * @description Вынесенный изолированный редьюсер обработки прикладных Far-команд Канала 0.
 * ИСПРАВЛЕНО: Форматирование строки переведено на явный вывод комбинаций вида CTRL+F5 / ALT+F5.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../bus.js";

/**
 * Редукция интента EXECUTE_FAR_COMMAND
 */
export function reduceFarCommandExecute(kernel, payloadObj, currentTx) {
    if (!payloadObj) return false;

    const keyNum = Math.max(1, Math.min(10, Math.floor(payloadObj.keyNumber || 1)));
    const cmdNameStr = String(payloadObj.commandName || "NoOp");
    const p = currentTx ? currentTx.P3 : null;

    // Вычисляем текстовый префикс зажатого модификатора для экранной презентации
    let comboPrefixStr = "";
    if (p && (p.ctrl === true || p.modifierIdx === 1)) comboPrefixStr = "CTRL+";
    else if (p && (p.shift === true || p.modifierIdx === 2)) comboPrefixStr = "SHIFT+";
    else if (p && (p.meta === true || p.alt === true || p.modifierIdx === 3)) comboPrefixStr = "ALT+";

    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");

    // Собираем точную, красивую строчку: [00:22:54 Msk] [FAR_COMMAND] Выполняется действие CTRL+F5: 'PRINT'
    const screenLogLineStr = 
        "[" + h + ":" + m + ":" + s + " Msk] [FAR_COMMAND] Выполняется действие " + 
        comboPrefixStr + "F" + keyNum + ": '" + cmdNameStr.toUpperCase() + "'\n";

    generateGpssTransaction("108", "ADD_LOG_ENTRY", screenLogLineStr, "0");
    
    if (kernel.virtualCanvasState) {
        kernel.virtualCanvasState.isDirty = true;
    }

    generateGpssTransaction("1", "EXECUTE_RENDER", null, "0");
    return true;
}
