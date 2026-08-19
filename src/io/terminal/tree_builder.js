/**
 * @file src/io/terminal/tree_builder.js
 * @version 3.0.5-RELEASE-SMO-TREE-BUILDER-DOD
 * @description Модуль послойного блайтинга и синхронизации матриц ОЗУ.
 * Собирает мономорфные буферы приборов на единый запечатанный холст ConPTY по флекс-координатам.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { _gpssEngineState } from "../../core/smo/bus.js";

/**
 * Синхронизирует и собирает плоские матрицы приборов обслуживания на глобальном холсте кадра
 * @param {Object} virtualCanvasState Состояние виртуального холста ConPTY
 * @param {Object} host Ссылка на рантайм хоста приложения
 * @param {Object} geoMap Актуальная рассчитанная карта флекс-геометрии ОЗУ
 * @returns {Object|null} Скомпонованный запечатанный корневой узел отображения
 */
export function synchronizeDisplayTree(virtualCanvasState, host, geoMap) {
    if (!host || !geoMap || !geoMap["root"] || !virtualCanvasState || !virtualCanvasState.virtualMatrix) return null;
    
    const rootGeo = geoMap["root"];
    const rootW = Math.floor(rootGeo.w || 120);
    const rootH = Math.floor(rootGeo.h || 30);
    
    // Единая физическая DOD-матрица холста кадра
    const targetM = virtualCanvasState.virtualMatrix.matrix;
    if (!targetM) return null;

    // 1. ОЧИСТКА ГЛАВНОГО ХОЛСТА ПЕРЕД СБОРКОЙ КАДРА
    for (let y = 0; y < rootH; y++) {
        const row = targetM[y];
        if (!row) continue;
        for (let x = 0; x < rootW; x++) {
            if (row[x]) {
                row[x].char = " ";
                row[x].fg = "\x1b[37m";
                row[x].bg = "\x1b[40m";
            }
        }
    }

    // 2. ДИНАМИЧЕСКИЙ ДЕХАРДКОД: Считываем все зарегистрированные ключи приборов СМО
    const allRegisteredKeys = Array.from(_gpssEngineState.facilitiesRegistry.keys());
    
    // 3. ПОСЛОЙНЫЙ СМО-БЛАЙТИНГ: Копируем буферы приборов на холст по координатам флекс-сетки
    for (let i = 0; i < allRegisteredKeys.length; i++) {
        const slotId = allRegisteredKeys[i];
        
        // Пропускаем служебные инфраструктурные каналы СМО
        if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9" || slotId === "11") {
            continue;
        }

        const geo = geoMap[slotId];
        const facility = _gpssEngineState.facilitiesRegistry.get(slotId);
        if (!facility || !geo) continue;

        const sX = Math.floor(geo.x || 0);
        const sY = Math.floor(geo.y || 0);
        const sW = Math.floor(geo.w || 0);
        const sH = Math.floor(geo.h || 0);

        const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
        let view = null;
        
        if (String(facility.componentType) === "explorer" && Array.isArray(facility.viewStack)) {
            if (facility.viewStack[activeIdx]) view = facility.viewStack[activeIdx].view;
        } else if (facility.viewStack) {
            view = facility.viewStack.view;
        }

        if (view && view.localBuffer && view.localBuffer.matrix) {
            const sourceM = view.localBuffer.matrix;
            
            // Попиксельно переносим знакоместа из памяти прибора на экран
            for (let y = 0; y < sH; y++) {
                const srcRow = sourceM[y];
                const dstRow = targetM[sY + y];
                if (!srcRow || !dstRow) continue;

                for (let x = 0; x < sW; x++) {
                    const srcCell = srcRow[x];
                    const dstCell = dstRow[sX + x];
                    if (srcCell && dstCell) {
                        dstCell.char = srcCell.char;
                        dstCell.fg = srcCell.fg;
                        dstCell.bg = srcCell.bg;
                    }
                }
            }
        }
    }

    const rootDisplayNode = {
        id: "root", x: 0, y: 0, w: rootW, h: rootH,
        visible: true, matrix: targetM, children: []
    };
    Object.preventExtensions(rootDisplayNode);
    return rootDisplayNode;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tree_builder.js
 * Время модификации: 18.08.2026 16:44:15 MSK
 */
