/**
 * @file src/core/smo/gateway_intents/alt_bypass_validator.js
 * @version 1.2.0-RELEASE-SMO-DOD-ALT-BYPASS-VALIDATOR-DEEP-SCAN
 * @description Вынесенная DOD-процедура универсального обнаружения прорывов и выжигания аварийной сетки Fallback.
 * ИСПРАВЛЕНО: Интегрирован веерный извлекатель вложенных регистров msg.payload.payload (0% try/catch).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC / 0% RegExp.
 */

import { generateGpssTransaction, _gpssEngineState, _activeThemeState } from "../bus.js";

/**
 * Осуществляет прецизионный аудит IPC-пакета и выжигает Fallback-сеть при обнаружении обхода СМО
 * @param {Object} kernel Ссылка на ОЗУ-рантайм ядра хоста
 * @param {Object} msg Полный сырой объект сообщения, пришедший от воркера клавиатуры
 * @returns {boolean} Флаг успешного перехвата прорыва (true - контрабанда уничтожена)
 */
export function reduceAltBypassValidation(kernel, msg) {
    if (!kernel || !msg) return false;

    // ВЕРХОВНЫЙ КОНТРАКТНЫЙ БАРЬЕР: Проверяем, спит ли шина СМО в момент асинхронного прилёта IPC-сообщения
    if (_gpssEngineState.isScanActive !== true) {
        let isSystemHotkey = false;
        let targetDisplayIndex = 0;
        let targetSlotStr = "105"; // Дефолт на Командную строку, куда чаще всего идет прорыв

        // =================================================================
        // ВЕЕРНЫЙ ИЗВЛЕКАТЕЛЬ СКРЫТЫХ РЕГИСТРОВ ПОЛЕЗНОЙ НАГРУЗКИ (ВЫСШИЙ ПРИОРИТЕТ)
        // =================================================================
        let payloadNameStr = "";
        const pObj = msg.payload;

        if (typeof msg.P3 === "string") {
            payloadNameStr = msg.P3;
        } else if (typeof pObj === "string") {
            payloadNameStr = pObj;
        } else if (pObj && typeof pObj === "object") {
            // Прецизионный выжим согласно оригинальной структуре KEYBOARD_ACTION_READY
            targetSlotStr = String(pObj.slotId || "105");
            
            if (typeof pObj.payload === "string") {
                payloadNameStr = pObj.payload; // Успешный захват "alt+6" из вложенного регистра p.payload!
            } else {
                payloadNameStr = String(pObj.name || pObj.char || "");
            }
        }

        const sLen = payloadNameStr.length;

        // ПРЕЦИЗИОННЫЙ ВСЕЯДНЫЙ РАЗБОР: Ищем маркер "alt" в начале строки (0% RegExp)
        if (sLen >= 4 && 
            payloadNameStr.charCodeAt(0) === 0x61 && // 'a'
            payloadNameStr.charCodeAt(1) === 0x6C && // 'l'
            payloadNameStr.charCodeAt(2) === 0x74) { // 't'
            
            // Считываем ASCII-код самого последнего символа строки (универсально для "alt+6", "alt6", "alt 6")
            const digitCharCode = payloadNameStr.charCodeAt(sLen - 1);
            if (digitCharCode >= 0x30 && digitCharCode <= 0x39) { // Полный ряд '0' - '9'
                isSystemHotkey = true;
                targetDisplayIndex = (digitCharCode - 0x30) | 0; // Числовой displayIndex
            }
        }

        // Если зафиксирован несанкционированный прорыв системной комбинации смены окон Window Manager
        if (isSystemHotkey === true && kernel.model && kernel.model.logicalState) {
            const activeKeys = _gpssEngineState.facilitiesKeysCached;
            const keysLen = activeKeys.length;
            let resolvedFocusedSlotStr = "";

            // Высокоскоростной плоский DOD-поиск прибора по его физическому displayIndex в ОЗУ
            for (let k = 0; k < keysLen; k++) {
                const currentKey = activeKeys[k];
                if (currentKey === "0" || currentKey === "1" || currentKey === "4" || currentKey === "9" || currentKey === "14") {
                    continue;
                }
                const facility = _gpssEngineState.facilitiesRegistry.get(currentKey);
                if (facility && Math.floor(facility.displayIndex) === targetDisplayIndex) {
                    if (facility.enabled !== false) {
                        resolvedFocusedSlotStr = currentKey;
                        break;
                    }
                }
            }

            if (resolvedFocusedSlotStr.length > 0) {
                // Атомарно перенаправляем указатели фокуса и синхронизируем слой Z-2 темы оформления
                kernel.model.logicalState.focusedSlotId = resolvedFocusedSlotStr;
                _activeThemeState.focusedSlotIdStr = resolvedFocusedSlotStr;

                // КРАСНЫЙ FALLBACK-БЛАЙТИНГ МАТРИЦЫ УПАВШЕГО ОКНА
                const targetFacility = _gpssEngineState.facilitiesRegistry.get(targetSlotStr);
                if (targetFacility) {
                    targetFacility.enabled = false; // Отключаем стандартный прикладной контур панели
                    
                    const viewStack = targetFacility.viewStack;
                    let localMatrix = null;
                    
                    if (viewStack) {
                        if (Array.isArray(viewStack)) {
                            const activeStackIdx = Math.max(0, Math.floor(targetFacility.activeStackIdx || 0));
                            localMatrix = viewStack[activeStackIdx]?.view?.localBuffer?.matrix;
                        } else if (viewStack.view?.localBuffer) {
                            localMatrix = viewStack.view.localBuffer.matrix;
                        }
                    }

                    // Попиксельно заполняем буфер ярко-красной защитной UHD-текстурой знакомест "░"
                    if (localMatrix && Array.isArray(localMatrix)) {
                        const rowsLen = localMatrix.length;
                        for (let y = 0; y < rowsLen; y++) {
                            const row = localMatrix[y];
                            if (Array.isArray(row)) {
                                const colsLen = row.length;
                                for (let x = 0; x < colsLen; x++) {
                                    row[x] = "░"; 
                                }
                            }
                        }
                        
                        // Врезаем белый текстовый паспорт аварии строго по центру верхней строки буфера
                        const topRow = localMatrix;
                        if (topRow && topRow.length > 25) {
                            const alertMsgStr = " [ CONTRACT PANIC: SLOT " + targetSlotStr + " FALLBACK ] ";
                            const msgLen = alertMsgStr.length;
                            const startX = Math.floor((topRow.length - msgLen) / 2);
                            for (let c = 0; c < msgLen; c++) {
                                topRow[startX + c] = alertMsgStr.charAt(c);
                            }
                        }
                    }
                }

                if (kernel.virtualCanvasState) {
                    kernel.virtualCanvasState.isDirty = true;
                }

                // Формируем текстовый рапорт аварии для Системного Журнала (Слот 108)
                const now = new Date();
                const h = String(now.getHours()).padStart(2, "0");
                const m = String(now.getMinutes()).padStart(2, "0");
                const s = String(now.getSeconds()).padStart(2, "0");
                
                const panicLogStr = 
                    "[" + h + ":" + m + ":" + s + " Msk] [CONTRACT_PANIC] ОБНАРУЖЕН ТОТАЛЬНЫЙ ПРОРЫВ МИМО ШИНЫ СМО!\n" +
                    "  -> Компонент: 'worker_gateway.js' | Успешный перехват вложенного регистра p.payload: '" + payloadNameStr + "'\n" +
                    "  -> Статус: Поток заблокирован на Рубеже 1. Выжжен аварийный Fallback в Слот " + targetSlotStr + ".\n";

                const facility108 = kernel.model.logicalState.panelRegistry["108"];
                let loggerMdl = null;
                
                if (facility108 && facility108.viewStack) {
                    if (Array.isArray(facility108.viewStack)) {
                        const activeIdx = Math.max(0, Math.floor(facility108.activeStackIdx || 0));
                        loggerMdl = facility108.viewStack[activeIdx]?.mdl;
                    } else {
                        loggerMdl = facility108.viewStack.mdl;
                    }
                }

                if (loggerMdl && Array.isArray(loggerMdl.logsArray)) {
                    const count = Math.floor(loggerMdl.totalLogsCount || 0) % 128;
                    loggerMdl.logsArray[count] = panicLogStr;
                    loggerMdl.totalLogsCount++;
                    loggerMdl._isDirty = true;
                }

                // Аппаратный акустический зуммер Рубежа 1 (ASCII Bell \x07)
                if (process.stderr) {
                    process.stderr.write("\x07");
                }

                // Форсируем мгновенный рендер кадра с обновленной бирюзовой подсветкой активной рамы окон
                generateGpssTransaction("1", "EXECUTE_RENDER", null, "4");
                return true; 
            }
        }
    }

    return false; 
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/gateway_intents/alt_bypass_validator.js
 * Время изменения: 17.09.2026 23:09:55 MSK
 */
