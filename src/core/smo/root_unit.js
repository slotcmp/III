/**
 * @file src/core/smo/root_unit.js
 * @version 3.9.3-RELEASE-SMO-ROOT-SEQUENCE-BARRIER
 * @description Системный СМО-прибор Слота 0 (Инициализатор/Гидратор).
 * ИСПРАВЛЕН БУТСТРАП: Запечатывание перенесено на фазу LOAD_SEQUENCE_COMPLETED.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { generateGpssTransaction, _gpssEngineState } from "./bus.js";
import { executeDeferredSynchronization } from "../slot_maker.js";
import { listenHardwareInterrupts, enterAlternativeHardwareBuffer } from "../../io/terminal/tty_hardware_gate.js";

/**
 * Чистая процедура редукции Слота 0. Динамически векторизует первичный импульс по всем бизнес-слотам
 */
export function processSpecificRootLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;
    const kernel = facilityState.host;
    if (!kernel) return false;

    const intent = String(intentStr);

    if (intent === "init") {
        return true; 
    }

    // ФАЗА 2: АТОМАРНЫЙ СИНХРОННЫЙ МОНТАЖ ТРИАДЫ ИЗ SLOT_MAKER
    if (intent === "SYNCHRONIZE_DYNAMIC_SLOT" && contextPayload) {
        if (typeof executeDeferredSynchronization === "function") {
            const success = executeDeferredSynchronization(kernel, contextPayload);
            if (success === true) {
                _gpssEngineState.facilitiesKeysCached = Array.from(_gpssEngineState.facilitiesRegistry.keys());
                
                if (kernel.virtualCanvasState) {
                    kernel.virtualCanvasState.isDirty = true;
                }
                return true;
            }
        }
    }

    // ФАЗА 3: ТОТАЛЬНЫЙ ФИНАЛЬНЫЙ ПОДЖЕГ ЭКРАНА И ЗАПЕЧАТЫВАНИЕ КУЧИ КОРНЯ
    if (intent === "LOAD_SEQUENCE_COMPLETED") {
        // Жестко форсируем обновление кэша ключей шины СМО
        _gpssEngineState.facilitiesKeysCached = Array.from(_gpssEngineState.facilitiesRegistry.keys());

        // Фиксируем фокус на Командной строке (Слот 105)
        kernel.model.logicalState.focusedSlotId = "105";
        
        if (kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }

        // ВЫСТРЕЛИВАЕМ ИБ ПЕРЕД ЗАПЕЧАТЫВАНИЕМ: Включаем прерывания терминала
        enterAlternativeHardwareBuffer();
        listenHardwareInterrupts(kernel);

        // ФИНАЛЬНОЕ СТРОГОЕ ДОД ЗАПЕЧАТЫВАНИЕ: Рантайм полностью стабилизирован!
        Object.preventExtensions(kernel.model.logicalState.panelRegistry);
        Object.preventExtensions(kernel.model.logicalState);
        Object.preventExtensions(kernel.model);
        Object.preventExtensions(kernel.virtualCanvasState.virtualMatrix);
        Object.preventExtensions(kernel.virtualCanvasState);
        Object.preventExtensions(kernel);
        
        // ВЫСТРЕЛИВАЕМ ПЕРВЫЙ КАНОНИЧЕСКИЙ КАДР НА ПОЛНОСТЬЮ СИНХРОННОЕ ОЗУ
        generateGpssTransaction("1", "EXECUTE_RENDER", null);

        if (typeof kernel.executeViewportBlit === "function") {
            kernel.executeViewportBlit();
        }
        return true;
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/root_unit.js
 * Время модификации: 22.08.2026 07:56:00 MSK
 */
