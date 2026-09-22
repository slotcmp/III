/**
 * @file src/core/smo/bus/contract_validator.js
 * @version 1.0.2-RELEASE-SMO-CONTRACT-VALIDATOR-STRICT-FIXED
 * @description Обнаружитель прорывов. Исправлен ложный арест пакетов после Structured Clone.
 */
import { _gpssEngineState, generateGpssTransaction } from "../bus.js";

export function auditHardwareContractBypass(kernel, targetSlotId, payload, callerName) {
    if (!kernel) return false;

    // КРИТЕРИЙ 1: Проверка тактового флага активности шины СМО
    const isIllegalBypass = (_gpssEngineState.isBusProcessing !== true);

    // КРИТЕРИЙ 2: Валидация персистентной бинарной подписи (Игнорируем сброшенный extensible)
    let isObjectCorrupted = false;
    if (payload && typeof payload === "object") {
        if (payload._iddSignature !== 0x4246) {
            isObjectCorrupted = true;
        }
    }

    if (isIllegalBypass || isObjectCorrupted) {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, "0");
        const m = String(now.getMinutes()).padStart(2, "0");
        const s = String(now.getSeconds()).padStart(2, "0");

        const panicLogStr = 
            "[" + h + ":" + m + ":" + s + " Msk] [CONTRACT_PANIC] ОБНАРУЖЕНА КОНТРАБАНДА МИМО ШИНЫ СМО!\n" +
            "  -> Шлюз-вызывающий: '" + callerName + "' | Целевой Слот: " + targetSlotId + "\n" +
            "  -> Причина: " + (isIllegalBypass ? "[ПРЯМОЙ ПРОРЫВ ИЗ ИНТЕРРАПТА ОС] " : "") + 
                             (isObjectCorrupted ? "[МУСОРНАЯ АЛЛОКАЦИЯ / ОТСУТСТВИЕ ПОДПИСИ IDD_SIGNATURE]" : "") + "\n" +
            "  -> Исполнение заблокировано. Контур СМО изолирован.\n";

        const loggerMdl = kernel.model?.logicalState?.panelRegistry["108"]?.viewStack?.[0]?.mdl ||
                          kernel.model?.logicalState?.panelRegistry["108"]?.viewStack?.mdl;
        if (loggerMdl && Array.isArray(loggerMdl.logsArray)) {
            const count = Math.floor(loggerMdl.totalLogsCount || 0) % 128;
            loggerMdl.logsArray[count] = panicLogStr;
            loggerMdl.totalLogsCount++;
            loggerMdl._isDirty = true;
        }

        const targetFacility = _gpssEngineState.facilitiesRegistry.get(targetSlotId);
        if (targetFacility) {
            targetFacility.enabled = false;
            targetFacility.isCorruptedByBypass = true;
        }

        if (kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "0");

        return true; 
    }

    return false;
}