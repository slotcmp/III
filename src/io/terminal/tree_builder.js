/**
 * @file src/io/terminal/tree_builder.js
 * @version 3.7.6-RELEASE-SMO-TREE-BUILDER-DYNAMIC-PAC-STABLE
 * @description Модуль послойного блайтинга и синхронизации матриц ОЗУ (Presentation-контур).
 * ИСПРАВЛЕНЫ ИМПОРТЫ: Полностью интегрированы ветки вызова для explorer и theme по мономорфной PAC-маске.
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

    const allRegisteredKeys = _gpssEngineState.facilitiesKeysCached;
    const lenKeys = allRegisteredKeys.length;
    const currentFocusedSlotIdStr = String(host.model?.logicalState?.focusedSlotId || "");

    // 2. ПОСЛОЙНЫЙ СМО-БЛАЙТИНГ И АБСОЛЮТНОЕ ВЫЖИГАНИЕ СЕТКИ
    for (let i = 0; i < lenKeys; i++) {
        const slotId = allRegisteredKeys[i];
        
        // Пропускаем служебный инфраструктурный контур ядра (диапазон 0-99 по манифесту)
        if (slotId === "0" || slotId === "1" || slotId === "4" || slotId === "9" || slotId === "10" || slotId === "11") {
            continue;
        }

        const geo = geoMap[slotId];
        const facility = _gpssEngineState.facilitiesRegistry.get(slotId);
        if (!facility || !geo) continue;

        const sX = Math.floor(geo.x || 0);
        const sY = Math.floor(geo.y || 0);
        const sW = Math.floor(geo.w || 0);
        const sH = Math.floor(geo.h || 0);
        if (sW < 2 || sH < 2) continue;

        const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
        let view = null;
        let mdl = null;
        
        // Разделение struct-конвертов вкладок проводника и плоских слотов
        if (String(facility.componentType) === "explorer" && Array.isArray(facility.viewStack)) {
            if (facility.viewStack[activeIdx]) {
                view = facility.viewStack[activeIdx].view;
                mdl = facility.viewStack[activeIdx].mdl;
            }
        } else if (facility.viewStack) {
            view = facility.viewStack.view;
            mdl = facility.viewStack.mdl;
        }

        if (view) {
            view.width = sW;
            view.height = sH;

            // А. Запускаем пассивный рендер контента бизнес-модели во внутренний буфер вьюхи
            _triggerModuleContentRender(facility.componentType, view, mdl, activeIdx);

            const isFocused = (slotId === currentFocusedSlotIdStr);
            const themeColorAnsi = isFocused ? "\x1b[38;5;220m" : "\x1b[38;5;242m"; // Золото или сталь
            const bgColor = "\x1b[40m";

            // Б. ПРЯМОЙ ВЫЖИГ РАМОК ПО АБСОЛЮТНЫМ КООРДИНАТАМ ХОЛСТА (0% МУСОРА)
            for (let x = 0; x < sW; x++) {
                const tR = targetM[sY];
                const bR = targetM[sY + sH - 1];
                if (tR && tR[sX + x]) { tR[sX + x].char = "═"; tR[sX + x].fg = themeColorAnsi; tR[sX + x].bg = bgColor; }
                if (bR && bR[sX + x]) { bR[sX + x].char = "═"; bR[sX + x].fg = themeColorAnsi; bR[sX + x].bg = bgColor; }
            }
            for (let y = 0; y < sH; y++) {
                const row = targetM[sY + y];
                if (row) {
                    if (row[sX]) { row[sX].char = "║"; row[sX].fg = themeColorAnsi; row[sX].bg = bgColor; }
                    if (row[sX + sW - 1]) { row[sX + sW - 1].char = "║"; row[sX + sW - 1].fg = themeColorAnsi; row[sX + sW - 1].bg = bgColor; }
                }
            }
            // Угловые засечки окна
            if (targetM[sY] && targetM[sY][sX]) targetM[sY][sX].char = "╔";
            if (targetM[sY] && targetM[sY][sX + sW - 1]) targetM[sY][sX + sW - 1].char = "╗";
            if (targetM[sY + sH - 1] && targetM[sY + sH - 1][sX]) targetM[sY + sH - 1][sX].char = "╚";
            if (targetM[sY + sH - 1] && targetM[sY + sH - 1][sX + sW - 1]) targetM[sY + sH - 1][sX + sW - 1].char = "╝";

            // В. ВПЕКАНИЕ ЗАГЛОВКА И ПАСПОРТА ПРИБОРОВ СМО
            const displayTitleStr = "= [ " + String(facility.componentType || slotId).toUpperCase() + " ] =";
            if (targetM[sY]) {
                for (let t = 0; t < displayTitleStr.length; t++) {
                    const cell = targetM[sY][sX + 4 + t];
                    if (cell && (4 + t < sW - 2)) {
                        cell.char = displayTitleStr.charAt(t);
                        cell.fg = isFocused ? "\x1b[37m" : "\x1b[38;5;244m";
                    }
                }
            }

            // Г. ПЕРЕНОС ВНУТРЕННЕГО РАСТРА ЛОКАЛЬНОГО БУФЕРА НА ГЛАВНЫЙ ХОЛСТ СМО
            if (view.localBuffer && view.localBuffer.matrix) {
                const sourceM = view.localBuffer.matrix;
                for (let y = 1; y < sH - 1; y++) {
                    const srcRow = sourceM[y];
                    const dstRow = targetM[sY + y];
                    if (!srcRow || !dstRow) continue;

                    for (let x = 1; x < sW - 1; x++) {
                        const srcCell = srcRow[x];
                        const dstCell = dstRow[sX + x];
                        if (srcCell && dstCell && srcCell.char !== " ") {
                            dstCell.char = srcCell.char;
                            dstCell.fg = srcCell.fg;
                            dstCell.bg = srcCell.bg;
                        }
                    }
                }
            }
        }
    }

    const rootDisplayNode = {
        id: "root", x: 0, y: 0, w: rootW, h: rootH, visible: true, matrix: targetM, children: []
    };
    Object.preventExtensions(rootDisplayNode);
    return rootDisplayNode;
}

/**
 * Направляет импульс пассивного рендеринга контента в зависимости от типа домена
 */
async function _triggerModuleContentRender(compTypeStr, view, mdl, activeTabIdxNum) {
    if (!view || !mdl) return;
    
    // Динамический маршалинг рендереров по строгим URL-маскам (0% RegExp)
    if (compTypeStr === "command") {
        const commandViewUrlStr = new URL("../../modules/command/command_view.js", import.meta.url).href;
        const { renderCommandContent } = await import(commandViewUrlStr);
        renderCommandContent(view, mdl);
    } else if (compTypeStr === "logger") {
        const loggerViewUrlStr = new URL("../../modules/logger/logger_view.js", import.meta.url).href;
        const { renderLoggerContent } = await import(loggerViewUrlStr);
        renderLoggerContent(view, mdl);
    } else if (compTypeStr === "dashboard") {
        const dashboardViewUrlStr = new URL("../../modules/dashboard/monitor_view.js", import.meta.url).href;
        const { renderMonitorContent } = await import(dashboardViewUrlStr);
        renderMonitorContent(view.localBuffer.matrix, view.width, view.height, mdl);
    } 
    // ИСПРАВЛЕНИЕ: Интегрирована полноценная поддержка Слота Панели Тем
    else if (compTypeStr === "theme") {
        const themeViewUrlStr = new URL("../../modules/theme/theme_view.js", import.meta.url).href;
        const { renderThemeContent } = await import(themeViewUrlStr);
        renderThemeContent(view, mdl);
    }
    // ИСПРАВЛЕНИЕ: Интегрирована поддержка вкладок файловых Проводников 102/103
    else if (compTypeStr === "explorer") {
        const explorerViewUrlStr = new URL("../../modules/explorer/explorer_view.js", import.meta.url).href;
        const { renderExplorerContent } = await import(explorerViewUrlStr);
        renderExplorerContent(view, mdl, activeTabIdxNum);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tree_builder.js
 * Время модификации: 21.08.2026 23:25:40 MSK
 */
