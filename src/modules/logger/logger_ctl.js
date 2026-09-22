/**
 * @file src/modules/logger/logger_ctl.js
 * @version 3.4.3-RELEASE-SMO-LOGGER-CTL-STRING-KEY-FIXED
 * @description Контроллер Слота 108. Запись смещения в Канал 14 переведена на строковую адресацию.
 */
import { generateGpssTransaction, _gpssEngineState } from "../../core/smo/bus.js";
import { processGenericUiKinematics } from "../../core/smo/window_manager.js";

export function createLoggerController(appHostRef, slotIdStr) {
    const id = String(slotIdStr || "108");
    const ctlState = { mdl: null, view: null, host: appHostRef, slotId: id };
    Object.preventExtensions(ctlState);
    return ctlState;
}

export function processSpecificLoggerLogic(facilityState, intentStr, contextPayload, currentTx) {
    const pack = facilityState.viewStack;
    if (!pack) return false;
    
    let m = null;
    if (Array.isArray(pack)) {
        if (pack[0]) m = pack[0].mdl;
    } else {
        m = pack.mdl;
    }
    
    if (!m) return false;
    
    const intent = String(intentStr || "");

    if (intent === "ADD_LOG_ENTRY") {
        const rawMessage = contextPayload || (currentTx ? currentTx.P3 : null);
        if (!rawMessage) return false;

        const cleanLogStr = String(rawMessage).trim();
        if (cleanLogStr.length === 0) return false;

        if (Array.isArray(m.logsArray)) {
            const cleanLen = cleanLogStr.length;
            const chunkLineWidth = 70;
            let charCursor = 0;

            while (charCursor < cleanLen) {
                const chunkStr = cleanLogStr.substring(charCursor, charCursor + chunkLineWidth);
                const currentTotal = Math.floor(m.totalLogsCount || 0);
                const maxCapacity = Math.floor(m.maxLines || 128);
                
                if (currentTotal < maxCapacity) {
                    m.logsArray[currentTotal] = chunkStr;
                    m.totalLogsCount = currentTotal + 1;
                } else {
                    for (let i = 1; i < maxCapacity; i++) {
                        m.logsArray[i - 1] = m.logsArray[i];
                    }
                    m.logsArray[maxCapacity - 1] = chunkStr;
                }
                charCursor = (charCursor + chunkLineWidth) | 0;
            }
            
            let maxVisibleLines = Math.max(1, (facilityState.view?.height || 6) - 4);
            let maxScrollLimit = Math.max(0, Math.floor(m.totalLogsCount || 0) - maxVisibleLines);
            
            m.viewportOffset = maxScrollLimit;
            m._isDirty = true; 

            // ИСПРАВЛЕНО: Строковый ключ "108" вместо числового литерала защищает скрытый класс Канала 14
            const vScrollMdl = _gpssEngineState.facilitiesRegistry.get("14")?.mdl;
            if (vScrollMdl && vScrollMdl.viewportOffsetRegistry) {
                vScrollMdl.viewportOffsetRegistry["108"] = maxScrollLimit;
            }

            if (facilityState.host?.virtualCanvasState) {
                facilityState.host.virtualCanvasState.isDirty = true;
            }

            generateGpssTransaction("1", "EXECUTE_RENDER", null, "108");
            return true;
        }
        return false;
    }

    return processGenericUiKinematics(facilityState, intent, contextPayload);
}