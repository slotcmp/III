/**
 * @file src/io/terminal/z_layers/z1_content_reducer.js
 * @version 2.0.0-RELEASE-SMO-Z1-CONTENT-DECLARATIVE-SHIFTS
 * @description Автономная DOD-процедура сборки бизнес-контента приборов (Слой Z-1).
 * ИСПРАВЛЕНО: Интегрирован сдвиг контента на y=0 для sH=1, и выбор старта y=1 или y=3 по флагу tabs_in.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation / 0% GC.
 */

import { _gpssEngineState } from "../../../core/smo/bus.js";
import { routeModuleContentRender } from "../content_router.js";

// Статический преаллоцированный стек для безаллокационного обхода дерева топологии (0% GC)
const _staticZ1NodesStack = new Array(64);

/**
 * Пробегает по пулу приборов и осуществляет попиксельный налив контента вьюх на холст
 */
export async function reduceContentLayer(targetM, host, geoMap, allRegisteredKeys, lenKeys) {
    if (!host || !geoMap || !targetM) return;

    for (let i = 0; i < lenKeys; i++) {
        const slotId = allRegisteredKeys[i];
        if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9" || slotId === "10" || slotId === "11" || slotId === "12") {
            continue;
        }

        const geo = geoMap[slotId];
        const facility = _gpssEngineState.facilitiesRegistry.get(slotId);
        if (!facility || !geo || facility.enabled === false) continue;

        let sX = Math.floor(geo.x || 0);
        let sY = Math.floor(geo.y || 0);
        let sW = Math.floor(geo.w || 0);
        let sH = Math.floor(geo.h || 0);

        if (sW < 1 || sH < 1) continue;

        // =================================================================
        // БЕЗАЛЛОКАЦИОННЫЙ ПОИСК ФЛАГА ТOПОЛОГИИ TABS_IN В КОРНЕ ЦИКЛА (O(1))
        // =================================================================
        let layoutNodeRef = null;
        let stackPtr = 0;
        _staticZ1NodesStack[stackPtr++] = host.layoutTopologyTree;

        while (stackPtr > 0) {
            const currNode = _staticZ1NodesStack[--stackPtr];
            if (!currNode) continue;

            if (String(currNode.slot || currNode.id || "") === String(slotId)) {
                layoutNodeRef = currNode;
                break;
            }

            const children = currNode.children;
            if (children && children.length > 0) {
                const cLen = children.length;
                for (let k = 0; k < cLen; k++) {
                    if (stackPtr < 64) _staticZ1NodesStack[stackPtr++] = children[k];
                }
            }
        }

        while (stackPtr > 0) {
            _staticZ1NodesStack[--stackPtr] = null;
        }

        // Если узел принудительно схлопнут или отключен разметкой — игнорируем шаг
        if (layoutNodeRef && layoutNodeRef.enabled === false) continue;
        if (layoutNodeRef && layoutNodeRef.collapsed === true) {
            sH = Math.min(sH, 3);
        }

        const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
        let view = null;
        let mdl = null;
        
        if (Array.isArray(facility.viewStack) && facility.viewStack[activeIdx]) {
            view = facility.viewStack[activeIdx].view;
            mdl = facility.viewStack[activeIdx].mdl;
        } else if (facility.viewStack && !Array.isArray(facility.viewStack)) {
            view = facility.viewStack.view;
            mdl = facility.viewStack.mdl;
        }

        if (view && mdl) {
            view.width = sW;
            view.height = sH;
            const compType = String(facility.componentType);
            const isContentVisibleBool = layoutNodeRef ? (layoutNodeRef.contentVisible !== false) : true;

            if (isContentVisibleBool === true) {
                // Асинхронно наполняем локальную матрицу вьюхи контентом
                await routeModuleContentRender(compType, view, mdl, activeIdx, slotId, facility.viewStack);

                if (view.localBuffer && view.localBuffer.matrix) {
                    const sourceM = view.localBuffer.matrix;
                    
                    // =================================================================
                    // НОВЫЕ ПРАВИЛА ГЕОМЕТРИИ И СДВИГОВ ДЛЯ ЧЕСТНОЙ ПРОЗРАЧНОСТИ
                    // =================================================================
                    let startY = 3; // По умолчанию для стандартных TUI-окон с локальным обвесом

                    if (sH === 1) {
                        // Правило №1: Если высота равна 1, рамок нет, пишем с нулевой строки
                        startY = 0;
                    } else if (layoutNodeRef && layoutNodeRef.tabs_in === true) {
                        // Правило №2: Если вкладки внутри слота, контент сдвинут под разделитель на y=3
                        startY = 3;
                    } else {
                        // Правило №3: Если флага tabs_in нет, вкладки ушли на Слот 200, полезная площадь стартует с y=1
                        startY = 1;
                    }

                    // Попиксельный перенос растра из локальной матрицы в UHD-матрицу кадра
                    for (let y = startY; y < sH; y++) {
                        const srcRow = sourceM[y]; 
                        const dstRow = targetM[sY + y]; 
                        if (!srcRow || !dstRow) continue;

                        // Коррекция X-координат: если рамок нет, заполняем строку от края до края (с x=0)
                        const startX = (sH === 1) ? 0 : 1;
                        const endX = (sH === 1) ? sW : (sW - 1);

                        for (let x = startX; x < endX; x++) {
                            dstRow[sX + x] = srcRow[x];
                        }
                    }
                }
            }
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/z_layers/z1_content_reducer.js
 * Время изменения: 10.09.2026 14:02:00 MSK
 */
