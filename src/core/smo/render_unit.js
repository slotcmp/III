/**
 * @file src/core/smo/render_unit.js
 * @version 3.3.8-RELEASE-SMO-RENDER-UNIT-CLEAN
 * @description Модуль обслуживания Фазы 4 СМО (Прибор Канала 1 / render_unit).
 * Полностью устранены дублирующиеся идентификаторы и SyntaxError объявления drawFrameGrid.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { drawFrameGrid } from "../../io/terminal/frame_grid_renderer.js";
import { drawDisplayNodeFrame } from "../../io/terminal/viewport_frame_drawer.js";
import { renderDashboardContent } from "../../modules/dashboard/dashboard_view.js";
import { renderLoggerContent } from "../../modules/logger/logger_view.js";
import { renderThemeContent } from "../../modules/theme/theme_view.js";
import { renderCommandContent } from "../../modules/command/command_view.js";
import { renderExplorerContent } from "../../modules/explorer/explorer_view.js";
import { _gpssEngineState } from "./bus.js";

/**
 * Фабрика сборки мономорфной структуры прибора обслуживания отрисовки (Канал 1)
 * @param {Object} appGpssBusRef Ссылка на шину СМО
 * @returns {Object} Запечатанное состояние прибора
 */
export function assemble(appGpssBusRef) {
    const unitState = {
        hub: appGpssBusRef,
        localQueue: [],
        isProcessing: false,
        _head: 0,
        componentType: "render_unit",
        displayIndex: 1,
        dispatch: (actionType, tx) => { 
            if (tx) unitState.localQueue.push(tx); 
            return true; 
        },
        advanceFacility: () => advanceQueueFacility(unitState)
    };
    Object.preventExtensions(unitState);
    return unitState;
}

/**
 * Конвейер обработки транзактов отрисовки и выталкивания кадров в терминал Windows
 * @param {Object} unitState Состояние прибора
 * @returns {boolean} Флаг наличия мутаций кадра
 */
function advanceQueueFacility(unitState) {
    const r = unitState.hub;
    const q = unitState.localQueue;
    if (!r || unitState.isProcessing || q.length === unitState._head) return false;

    unitState.isProcessing = true;
    
    const allRegisteredKeys = Array.from(_gpssEngineState.facilitiesRegistry.keys());
    const geoMap = _gpssEngineState.runtime?.calculatedGeoMap;
    const focusedSlotIdStr = String(_gpssEngineState.runtime?.model?.logicalState?.focusedSlotId || "105");
    
    // Считываем общие габариты UHD-матрицы из корня реестра геометрии
    const rootGeo = geoMap ? geoMap["root"] : null;
    const maxW = Math.max(40, Math.floor(rootGeo?.w || 120));
    const maxH = Math.max(10, Math.floor(rootGeo?.h || 30));
    
    let hasMutations = false;

    while (unitState._head < q.length) {
        const tx = q[unitState._head++];
        if (!tx) continue;

        const intent = String(tx.P2 || "");
        if (intent === "EXECUTE_RENDER") {
            hasMutations = true;
            
            for (let i = 0; i < allRegisteredKeys.length; i++) {
                const slotId = allRegisteredKeys[i];
                
                // Пропускаем служебные инфраструктурные каналы СМО
                if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9") {
                    continue;
                }

                const facility = _gpssEngineState.facilitiesRegistry.get(slotId);
                if (!facility) continue;

                // АДАПТИВНЫЙ РЕЗОЛВЕР КООРДИНАТ: Пассивный fallback-гвард геометрии
                let geo = geoMap ? geoMap[slotId] : null;
                if (!geo || isNaN(geo.x) || isNaN(geo.y) || isNaN(geo.w) || isNaN(geo.h)) {
                    const workspaceH = maxH - 14; 
                    
                    if (slotId === "101")      geo = { x: 0, y: 0, w: maxW, h: 5 };
                    else if (slotId === "102") geo = { x: 0, y: 5, w: 42, h: workspaceH };
                    else if (slotId === "103") geo = { x: 42, y: 5, w: 42, h: workspaceH };
                    else if (slotId === "106") geo = { x: 84, y: 5, w: Math.max(10, maxW - 84), h: workspaceH };
                    else if (slotId === "105") geo = { x: 0, y: maxH - 9, w: maxW, h: 3 };
                    else if (slotId === "108") geo = { x: 0, y: maxH - 6, w: maxW, h: 6 };
                }
                
                if (!geo) continue;

                const compType = String(facility.componentType || "slot").trim();
                const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
                const isFocused = (slotId === focusedSlotIdStr);

                let mdl = null; 
                let view = null;
                
                if (compType === "explorer" && Array.isArray(facility.viewStack)) {
                    const pack = facility.viewStack[activeIdx];
                    if (pack) { mdl = pack.mdl; view = pack.view; }
                } else if (facility.viewStack) {
                    mdl = facility.viewStack.mdl; 
                    view = facility.viewStack.view;
                }

                if (view && view.localBuffer?.matrix) {
                    view.width = Math.max(1, Math.floor(geo.w || 0));
                    view.height = Math.max(1, Math.floor(geo.h || 0));
                    const matrix = view.localBuffer.matrix;

                    // СИНХРОННЫЙ СМО-КОНВЕЙЕР: Построение растра внутренней сетки окна
                    drawFrameGrid(matrix, view.width, view.height, isFocused);
                    
                    // Вызов прикладных пассивных рендереров контента
                    if (slotId === "105") renderCommandContent(view, mdl);
                    else if (slotId === "101") renderDashboardContent(view, mdl);
                    else if (slotId === "108") renderLoggerContent(view, mdl);
                    else if (slotId === "106") renderThemeContent(view, mdl);
                    else if (slotId === "102" || slotId === "103") renderExplorerContent(view, mdl, activeIdx);

                    // Накатываем Unicode-контур двойных стальных рамок поверх готового растра
                    const mockNode = { matrix: matrix, w: view.width, h: view.height };
                    drawDisplayNodeFrame(mockNode, compType, slotId, isFocused, facility);
                }
            }
        }
    }

    if (unitState._head === q.length) { q.length = 0; unitState._head = 0; }
    unitState.isProcessing = false;
    return hasMutations;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/render_unit.js
 * Время модификации: 18.08.2026 21:26:00 MSK
 */
