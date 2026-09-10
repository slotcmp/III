/**
 * @file src/io/terminal/tree_builder.js
 * @version 5.0.0-RELEASE-SMO-TREE-BUILDER-DECOUPLED-FINAL
 * @description Верховный диспетчер послойного блайтинга с поддержкой Int32Array векторов.
 * ИСПРАВЛЕНА СТРУКТУРА: Логика полностью размоноличена на автономные Z-слои (0% OOP).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { _gpssEngineState } from "../../core/smo/bus.js";

// Импортируем изолированные DOD-редьюсеры Z-слоев графики
import { reduceBackgroundLayer } from "./z_layers/z0_bg_reducer.js";
import { reduceContentLayer } from "./z_layers/z1_content_reducer.js";
import { reduceFrameLayer } from "./z_layers/z2_frame_reducer.js";
import { reduceInteractiveLayer } from "./z_layers/z3_interactive_reducer.js";

/**
 * Синхронизирует и собирает плоские матрицы приборов обслуживания на глобальном холсте кадра
 */
export async function synchronizeDisplayTree(virtualCanvasState, host, geoMap) {
    if (!host || !geoMap || !geoMap["root"] || !virtualCanvasState || !virtualCanvasState.virtualMatrix) return null;
    
    const rootGeo = geoMap["root"];
    const rootW = Math.floor(rootGeo.w || 120);
    const rootH = Math.floor(rootGeo.h || 30);
    
    const targetM = virtualCanvasState.virtualMatrix.matrix;
    if (!targetM) return null;

    const allRegisteredKeys = _gpssEngineState.facilitiesKeysCached;
    const lenKeys = allRegisteredKeys.length;
    const currentFocusedSlotIdStr = String(host.model?.logicalState?.focusedSlotId || "");
    const appSettings = host.model?.logicalState?.appSettings;

    // Динамическое извлечение live-масок послойного отключения для отладки геометрии
    const drawBackgroundAndContent = appSettings?.view?.bOff?.content ?? true;
    const drawFrameContour = !(appSettings?.view?.bOff?.frameContour ?? false);
    const drawFrameMetrics = !(appSettings?.view?.bOff?.frameMetrics ?? false);

    // =================================================================
    // ТАКТ Z-0: ОЧИСТКА ХОЛСТА (ФОН)
    // =================================================================
    if (drawBackgroundAndContent === true) {
        reduceBackgroundLayer(targetM, rootW, rootH);
    }

    // =================================================================
    // ТАКТ Z-1: ВЫЖИГ БИЗНЕС-КОНТЕНТА ПРИБОРОВ (Файлы, Логи, Шкалы)
    // =================================================================
    if (drawBackgroundAndContent === true) {
        await reduceContentLayer(targetM, host, geoMap, allRegisteredKeys, lenKeys);
    }

    // =================================================================
    // ТАКТ Z-2: НАКАТ СТАЛЬНЫХ КАРКАСОВ ОКOН (╚ ═ ╗ ║)
    // =================================================================
    if (drawFrameContour === true) {
        reduceFrameLayer(targetM, host, geoMap, allRegisteredKeys, lenKeys, currentFocusedSlotIdStr);
    }

    // =================================================================
    // ТАКТ Z-3: НАЛОЖЕНИЕ СВЕРХВЕРХНЕГО ОБВЕСА (Кнопки [-][▲][×] и Табы)
    // =================================================================
    if (drawFrameMetrics === true) {
        reduceInteractiveLayer(targetM, host, geoMap, allRegisteredKeys, lenKeys);
    }

    // Формируем итоговый запечатанный паспорт узла отображения для флушера
    const rootDisplayNode = {
        id: "root", x: 0, y: 0, w: rootW, h: rootH, visible: true, matrix: targetM, children: []
    };
    Object.preventExtensions(rootDisplayNode);
    return rootDisplayNode;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tree_builder.js
 * Время изменения: 09.09.2026 14:27:00 MSK
 */
