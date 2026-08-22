/**
 * @file src/core/smo/gpss_engine_scan.js
 * @version 4.2.1-RELEASE-SMO-ENGINE-BEЗУСЛОВНЫЙ-RESIZE-STABLE
 * @description Центральный тактовый автомат продвижения имитационной шины СМО.
 * ИСПРАВЛЕНА РЕКУРСИЯ И АЛЛОКАЦИИ: Обход переведен на facilitiesKeysCached, устранен дедлок рендеринга.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { _gpssEngineState, generateGpssTransaction } from "./bus.js";
import { forceInvalidateShadowCanvas } from "../../io/terminal/flusher.js";

/**
 * Осуществляет одиночный проход продвижения очередей всех зарегистрированных приборов СМО
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 * @returns {boolean} Флаг наличия мутаций данных
 */
export function processEngineSingleTick(kernel) {
    if (!kernel || !_gpssEngineState.runtime) return false;

    let hasMutations = false;
    let isResizeDetected = false;
    
    // ИСПРАВЛЕНИЕ: Используем готовый мономорфный кэш ключей вместо аллокации через Array.from()
    const activeFacilitiesKeys = _gpssEngineState.facilitiesKeysCached;
    const keysLen = activeFacilitiesKeys.length;

    // ШАГ 1: СКВОЗНОЙ ЦИКЛИЧЕСКИЙ ОПРОС ОЧЕРЕДЕЙ ПРИБОРОВ (0% Polling)
    for (let i = 0; i < keysLen; i++) {
        const slotId = activeFacilitiesKeys[i];
        
        // Канал 1 Отрисовки продвигается шиной гарантированно последним во избежание гонок (Фаза Б Манифеста)
        if (slotId === "1") continue;

        const facility = _gpssEngineState.facilitiesRegistry.get(slotId);
        if (facility && typeof facility.advanceFacility === "function") {
            const mutated = facility.advanceFacility();
            if (mutated === true) {
                hasMutations = true;
                // Если сработал Канал #9 (Ресайз) — взводим локальный флаг перестройки кадра
                if (slotId === "9") {
                    isResizeDetected = true;
                }
            }
        }
    }

    // ШАГ 2: РЕАКТИВНАЯ ПЕРЕРИСОВКА КАРТИНЫ МИРА И СКВОЗНОЙ БЛАЙТИНГ
    if (hasMutations || isResizeDetected || (kernel.virtualCanvasState && kernel.virtualCanvasState.isDirty === true)) {
        
        // БЕЗУСЛОВНЫЙ СБРОС КЭША БЛАЙТЕРА ПРИ ИЗМЕНЕНИИ ГЕОМЕТРИИ TERMINAL WINDOW
        if (isResizeDetected) {
            if (typeof forceInvalidateShadowCanvas === "function") {
                forceInvalidateShadowCanvas();
            }
        }

        if (kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }

        // ИСПРАВЛЕНИЕ: Вызываем Канал 1 Отрисовки через транзакцию прерывания.
        // Он самостоятельно вызовет kernel.executeViewportBlit во время выполнения своей специфичной логики.
        // Прямой дублирующий вызов изъят для предотвращения зацикливания кадра.
        generateGpssTransaction("1", "EXECUTE_RENDER", null);
    }

    return hasMutations;
}
