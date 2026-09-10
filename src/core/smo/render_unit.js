/**
 * @file src/core/smo/render_unit.js
 * @version 3.8.2-RELEASE-SMO-RENDER-STRICT-BARRIER
 * @description Системный СМО-прибор Слота 1 (Финальный барьер отрисовки presentación-контура).
 * ИСПРАВЛЕН ОТВАЛ РЕСАЙЗА: Ликвидировано асинхронное зацикливание промисов, блокировавшее Event Loop ОС.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { executeViewportBlit } from "../../io/terminal/blit.js";

// Локальный регистр для защиты от стартового дребезга кадров
const _renderGateState = {
    initialSpikeFramesCount: 0
};
Object.preventExtensions(_renderGateState);

/**
 * Чистая процедура редукции Слота 1.
 */
export function processSpecificRenderLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!facilityState) return false;
    const kernel = facilityState.host;
    if (!kernel || !kernel.virtualCanvasState) return false;

    if (String(intentStr) === "EXECUTE_RENDER") {
        const canvas = kernel.virtualCanvasState;
        const isDirty = canvas.isDirty === true;
        
        // Разрешаем безусловный выжиг кадра на старте ровно 2 раза, далее — строго по isDirty флангу
        if (isDirty || _renderGateState.initialSpikeFramesCount < 2) {
            _renderGateState.initialSpikeFramesCount++;
            
            // ИСПРАВЛЕНИЕ: Жестко гасим флаг СИНХРОННО до вызова блайтера. 
            // Это мгновенно освобождает шину и открывает шлюз Event Loop для приема сигналов 'resize' и мыши.
            canvas.isDirty = false;
            
            if (typeof executeViewportBlit === "function") {
                // Запускаем блайтинг кадра пассивно
                executeViewportBlit(canvas, kernel, kernel.calculatedGeoMap);
            }
            
            return true;
        }
    }

    return false;
}
