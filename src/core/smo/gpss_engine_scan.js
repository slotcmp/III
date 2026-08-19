/**
 * @file src/core/smo/gpss_engine_scan.js
 * @version 3.1.0-RELEASE-SMO-SCANNER-TICK
 * @description Центральный тактовый автомат продвижения имитационной шины СМО.
 * Поциклически опрашивает буферы приборов и координирует сквозной рендеринг.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { executeScanEventsPipeline, _gpssEngineState, generateGpssTransaction } from "./bus.js";

/**
 * Инициирует один полный такт продвижения очередей прерываний СМО
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра приложения
 * @returns {boolean} Флаг необходимости перерисовки кадра холста
 */
export function processEngineSingleTick(kernel) {
    if (!kernel || !_gpssEngineState.runtime) return false;

    // Шаг 1: Прогоняем сквозной конвейер обслуживания очередей СМО
    const screenNeedsUpdate = executeScanEventsPipeline();

    // Шаг 2: Если зафиксированы мутации — взводим импульс рендеринга на Канал 1
    if (screenNeedsUpdate === true) {
        generateGpssTransaction("1", "EXECUTE_RENDER", null);
        
        // Принудительно продвигаем Прибор Отрисовки (Канал 1) вне очереди для финализации матриц
        const renderUnit = _gpssEngineState.facilitiesRegistry.get("1");
        if (renderUnit && typeof renderUnit.advanceFacility === "function") {
            renderUnit.advanceFacility();
        }
        
        // Переводим виртуальный холст ConPTY в состояние загрязнения
        if (kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }
    }

    return screenNeedsUpdate;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/gpss_engine_scan.js
 * Время модификации: 18.08.2026 19:03:15 MSK
 */
