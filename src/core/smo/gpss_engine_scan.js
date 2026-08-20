/**
 * @file src/core/smo/gpss_engine_scan.js
 * @version 3.0.0-RELEASE-DOD-GOLDEN-SCANNER
 * @description Центральный тактовый автомат продвижения имитационной шины СМО.
 * Синхронизирован со стабильной ревизией bus.js от 18.08.2026 19:29:45 MSK.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { _gpssEngineState, generateGpssTransaction } from "./bus.js";

/**
 * Инициирует один полный такт продвижения очередей прерываний СМО
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра приложения
 * @returns {boolean} Флаг необходимости перерисовки кадра холста
 */
export function processEngineSingleTick(kernel) {
    if (!kernel || !_gpssEngineState.runtime) return false;

    // Шаг 1: Форсируем такт рендеринга через легитимную СМО-транзакцию
    // Импульс сам раскрутит цепочку продвижения внутри bus.js и вызовет блайтер кадра!
    const success = generateGpssTransaction("1", "EXECUTE_RENDER", null);

    // Шаг 2: Переводим виртуальный холст ConPTY в состояние загрязнения
    if (success && kernel.virtualCanvasState) {
        kernel.virtualCanvasState.isDirty = true;
    }

    return success;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/gpss_engine_scan.js
 * Время модификации: 20.08.2026 21:58:15 MSK
 * Точка отката: #0818-RELEASE-GOLDEN-MONOMORPHIC
 */
