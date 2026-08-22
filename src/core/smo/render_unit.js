/**
 * @file src/core/smo/render_unit.js
 * @version 3.7.2-RELEASE-SMO-RENDER-FORCED-PROGREW
 * @description Системный СМО-прибор Слота 1 (Финальный барьер отрисовки presentación-контура).
 * ИСПРАВЛЕН ЭКСПОРТ: Гарантирован именованный экспорт processSpecificRenderLogic для ESM.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { executeViewportBlit } from "../../io/terminal/blit.js";

/**
 * Чистая процедура редукции Слота 1.
 * @param {Object} facilityState Состояние активного инфраструктурного прибора СМО
 * @param {string} intentStr Идентификатор прерывания
 * @param {Object|null} contextPayload Контекст транзакта
 * @param {Object} currentTx Полный паспорт транзакта СМО
 * @returns {boolean} Флаг наличия мутаций рантайма
 */
export function processSpecificRenderLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;
    const kernel = facilityState.host;
    if (!kernel || !kernel.virtualCanvasState) return false;

    if (String(intentStr) === "EXECUTE_RENDER") {
        // Извлекаем уникальный сквозной ID транзакта из паспорта шины СМО
        const currentTxIdNum = Math.floor(currentTx?.id || 0);

        // ФИНАЛЬНЫЙ ТАКТОВЫЙ БАРЬЕР: Выжигаем кадр, если ОЗУ ядра грязно (isDirty),
        // ИЛИ если это первый системный пуск платформы (ID транзакта на старте), принудительно пробивая гонки оптимизаций!
        if (kernel.virtualCanvasState.isDirty === true || currentTxIdNum < 25) {
            
            if (typeof executeViewportBlit === "function") {
                executeViewportBlit(kernel.virtualCanvasState, kernel, kernel.calculatedGeoMap);
            }
            
            kernel.virtualCanvasState.isDirty = false; // Кадр успешно доставлен в ConPTY, холст чист
            return true;
        }
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/render_unit.js
 * Time-stamp: 22.08.2026 07:35:00 MSK
 */
