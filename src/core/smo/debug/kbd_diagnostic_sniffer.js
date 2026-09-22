/**
 * @file src/core/smo/debug/kbd_diagnostic_sniffer.js
 * @version 1.0.2-RELEASE-SMO-DIAGNOSTIC-KBD-SNIFFER-FIXED
 * @description Прецизионный DOD-тест клавиатурного контура с корректным чтением массивов viewStack.
 */
import fs from "node:fs";
import { _gpssEngineState } from "../bus.js";

export function executeKbdDiagnosticSniffer(kernel) {
    if (!kernel) return false;

    const kbdFacility = _gpssEngineState.facilitiesRegistry.get("4");
    const cliFacility = _gpssEngineState.facilitiesRegistry.get("105");

    const now = new Date();
    const tsStr = "[" + String(now.getHours()).padStart(2, "0") + ":" + 
                        String(now.getMinutes()).padStart(2, "0") + ":" + 
                        String(now.getSeconds()).padStart(2, "0") + " Msk]";

    let outStr = "=== СТАРТ ДИAГНOСТИКИ КЛAВИAТУРНOГO ТРAКТA ===\n";

    if (kernel.model && kernel.model.logicalState) {
        const focusedId = String(kernel.model.logicalState.focusedSlotId || "unknown");
        outStr += tsStr + " [DIAG_CORE] Регистр focusedSlotId ядра хоста указывает на: '" + focusedId + "'\n";
    }

    if (kbdFacility) {
        const qLen = Array.isArray(kbdFacility.localQueue) ? kbdFacility.localQueue.length : 0;
        const head = Math.floor(kbdFacility._head || 0);
        const isProc = kbdFacility.isProcessing === true;
        outStr += tsStr + " [DIAG_KBD] Канал 4 Очередь -> Длина: " + qLen + " | Указатель Head: " + head + " | isProcessing: " + isProc + "\n";
    }

    if (cliFacility) {
        let activeMdl = null;
        const pack = cliFacility.viewStack;

        // ИСПРАВЛЕНО: Безопасное DOD-извлечение из массива или плоского объекта
        if (Array.isArray(pack) && pack.length > 0 && pack[0]) {
            activeMdl = pack[0].mdl;
        } else if (pack && !Array.isArray(pack)) {
            activeMdl = pack.mdl;
        } else if (cliFacility.mdl) {
            activeMdl = cliFacility.mdl;
        }

        if (activeMdl) {
            const isF = activeMdl.isFocused === true;
            const isF_alt = activeMdl._isFocused === true;
            const bufLen = String(activeMdl.buffer || "").length;
            outStr += tsStr + " [DIAG_CLI] Модель 105 -> isFocused: " + isF + " | _isFocused: " + isF_alt + " | Длина буфера: " + bufLen + "\n";
        } else {
            outStr += tsStr + " [DIAG_CLI] Сбой: Модель данных Слота 105 не извлечена из паспорта.\n";
        }
    } else {
        outStr += tsStr + " [DIAG_CLI] Сбой: Фасилити Слота 105 отсутствует в реестре шины.\n";
    }

    outStr += "=== КOНЕЦ КЛAВИAТУРНOГO ПAСПOРТA ===\n";

    try {
        const fd = fs.openSync("./logs/kbd_diagnostics.txt", "a");
        fs.writeSync(fd, Buffer.from(outStr), 0, outStr.length, null);
        fs.closeSync(fd);
    } catch (e) {
        // Пассивный гвард синхронного I/O
    }

    return true;
}