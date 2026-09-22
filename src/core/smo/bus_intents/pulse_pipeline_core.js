/**
 * @file src/core/smo/bus_intents/pulse_pipeline_core.js
 * @version 1.1.0-RELEASE-SMO-BUS-PULSE-PIPELINE-SUPER-INTERRUPT
 * @description Главный тактовый двигатель очередей СМО с контуром Приоритетного Супер-Прерывания.
 * ИСПРАВЛЕНО: Интегрирован высший тактовый барьер детекции системных прорывов (0% try/catch, 0% GC).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% try-catch.
 */

import { loadAppSettings } from "../../app_config.js";
import { writeCoreLogMessageInline } from "../logger_io.js";
import { processEngineSingleTick } from "../gpss_engine_scan.js";
import { auditHardwareTickPassive } from "../tick_sniffer.js";
import { buildDynamicTabCoordinatesRegistry } from "../../layout/balancer/tab_indexer.js"; 
import { _busClockMetrics, _gpssEngineState, _activeThemeState } from "../bus.js";

// Импортируем изолированное паническое ядро Аппаратного Рубежа 1 для мгновенного сброса кадра
import { executeHardwarePanicBypass } from "../../../io/terminal/vectors/dispatcher_intents/hardware_panic_core.js";

/**
 * Продвигает веерный скан очередей транзакций СМО на один квант аппаратного времени
 */
export function executeReactivePulsePipeline() {
    _busClockMetrics.hardwareTicksCount++;
    _busClockMetrics.currentPipelineDepth++;

    const configData = loadAppSettings();
    const isBypass = configData ? (configData.bAuditTicksBypass === true) : false;

    if (!isBypass) {
        auditHardwareTickPassive("BEFORE_ADVANCE", _gpssEngineState, _busClockMetrics, writeCoreLogMessageInline);
    }

    if (_gpssEngineState.isScanActive) {
        _busClockMetrics.currentPipelineDepth--;
        return;
    }
    _gpssEngineState.isScanActive = true;
    
    const kernel = _gpssEngineState.runtime;
    
    if (kernel) {
        // Синхронизируем динамическую строку фокуса Window Manager с кучей ядра на текущем тике
        if (kernel.model && kernel.model.logicalState) {
            const liveFocusedIdStr = String(kernel.model.logicalState.focusedSlotId || "105");
            _activeThemeState.focusedSlotIdStr = liveFocusedIdStr;
        }

        // =================================================================
        // ВЕРХОВНЫЙ КОНТУР ПРИОРИТЕТНОГО СУПЕР-ПРЕРЫВАНИЯ (NMI БАРЬЕР)
        // =================================================================
        // Сканируем последний исполненный интент на предмет системной контрабанды
        const lastIntentStr = _busClockMetrics.lastExecutedIntent;
        
        // Если прилетел клавиатурный импульс, но он проскочил в обход очередей приборов (прямой вызов)
        if (lastIntentStr === "KEY_PRESSED" && _gpssEngineState._transactionGlobalCounter > 0) {
            const facility4 = _gpssEngineState.facilitiesRegistry.get("4");
            
            // Если в localQueue KBD-Прибора 4 пусто, значит ввод прорывается нелегально!
            if (facility4 && Array.isArray(facility4.localQueue) && facility4.localQueue.length === 0) {
                // Извлекаем имя последнего токена из живых регистров модели
                const lastRawTokenStr = String(kernel.model?.logicalState?.lastRawKeyName || "");
                
                // Посимвольный разбор строки "alt+" без регулярных выражений (0% RegExp)
                if (lastRawTokenStr.length >= 5 && 
                    lastRawTokenStr.charCodeAt(0) === 0x61 && // 'a'
                    lastRawTokenStr.charCodeAt(1) === 0x6C && // 'l'
                    lastRawTokenStr.charCodeAt(2) === 0x74 && // 't'
                    lastRawTokenStr.charCodeAt(3) === 0x2B) { // '+'
                    
                    const digitCharCode = lastRawTokenStr.charCodeAt(4);
                    if (digitCharCode >= 0x30 && digitCharCode <= 0x39) {
                        const targetIdx = (digitCharCode - 0x30) | 0;
                        
                        // МГНОВЕННЫЙ АВАРИЙНЫЙ АРЕСТ ПОТОКА: Вызываем паническое ядро Рубежа 1 инлайном!
                        executeHardwarePanicBypass(kernel, lastRawTokenStr, targetIdx);
                        
                        // Сбрасываем флаги сканирования и полностью гасим нелегальный такт
                        _gpssEngineState.isScanActive = false;
                        _busClockMetrics.currentPipelineDepth--;
                        return; // Поток перехвачен и уничтожен до входа в бизнес-слоты!
                    }
                }
            }
        }

        buildDynamicTabCoordinatesRegistry(kernel);

        // Входим в стандартную фазу легитимного обслуживания очередей СМО
        _gpssEngineState.isBusProcessing = true;
        processEngineSingleTick(kernel); // Вызов каскада редьюсеров (Файлы летят на экран!)
        _gpssEngineState.isBusProcessing = false;
    }
    
    _gpssEngineState.isScanActive = false;

    if (kernel && typeof kernel.executeViewportBlit === "function") {
        kernel.executeViewportBlit();
    }

    if (!isBypass) {
        auditHardwareTickPassive("AFTER_ADVANCE", _gpssEngineState, _busClockMetrics, writeCoreLogMessageInline);
    }
    _busClockMetrics.currentPipelineDepth--;
}
