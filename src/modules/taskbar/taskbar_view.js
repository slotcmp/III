/**
 * @file src/modules/taskbar/taskbar_view.js
 * @version 2.0.1-RELEASE-SMO-DOD-TASKBAR-VIEW-ALL-WINDOWS
 * @description Безаллокационный UHD-рендерер знакомест Панели задач (Presentation-контур, Слот 100).
 * ИСПРАВЛЕНО: Выводятся плашки всех окон системы с динамической подсветкой активного/свернутого статуса.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { packCellBits } from "../../io/terminal/sprite_blit.js";

/**
 * Процедурно выжигает растр иконок окон в локальную матрицу знакомест Слота 100.
 */
export function renderContent(view, mdl, rootLayoutTree) {
    if (!view || !view.localBuffer || !view.localBuffer.matrix) return;

    const targetM = view.localBuffer.matrix;
    const sW = Math.max(10, Math.floor(view.width || 120));

    // Вывод плашек задач идет строго в первую единственную строку буфера (индекс 0)
    const contentRow = targetM[0];
    if (!contentRow || !rootLayoutTree) return;

    let currentX = 0; // Стартуем без рамочных отступов от левого края экрана

    const scanNode = (node) => {
        if (!node) return;

        const nodeTypeStr = String(node.type || "");
        const nodeIdStr = String(node.id || "");
        const nodeCompStr = String(node.component || "unknown");

        // Фильтруем инфраструктурные и сервисные слоты, оставляя только рабочие окна
        if (nodeTypeStr === "slot" && nodeIdStr !== "100" && nodeIdStr !== "200" && nodeIdStr !== "104") {
            const isEnabled = node.enabled !== false;
            const isCollapsed = node.collapsed === true;

            // ВЫВОДИМ ПЛАШКИ ДЛЯ ВСЕХ БИЗНЕС-ОКOН БЕЗ ИСКЛЮЧЕНИЯ
            if (isEnabled === true) {
                // Динамическая DOD-подсветка: развернутые окна горят цианом, свернутые — серым
                const colorAnsi = isCollapsed ? "\x1b[38;5;244m" : "\x1b[38;5;39m";
                const bracketColor = "\x1b[38;5;240m";

                const iconChar = isCollapsed ? "─" : "■";
                const labelStr = "[" + iconChar + " " + nodeIdStr + ":" + nodeCompStr + "]";
                const labelLen = labelStr.length;

                // Защитный гвард по ширине локальной строки
                if (currentX + labelLen < sW) {
                    for (let k = 0; k < labelLen; k++) {
                        const chr = labelStr.charAt(k);
                        // Иконка (индекс 1) горит статусом, края — стальные, текст — белый/серый
                        const cellColor = (k === 1) ? colorAnsi : ((k === 0 || k === labelLen - 1) ? bracketColor : "\x1b[38;5;250m");
                        
                        contentRow[currentX + k] = packCellBits(chr, cellColor, "\x1b[40m");
                    }
                    
                    // Сохраняем физические координаты хит-трека плашки в преаллоцированную модель (0% OOP)
                    if (mdl && mdl._clickTracksRegistry) {
                        const trackIdx = Math.floor(mdl._tracksCount || 0);
                        if (trackIdx < 16) {
                            const track = mdl._clickTracksRegistry[trackIdx];
                            if (track) {
                                track.startX = currentX;
                                track.endX = currentX + labelLen;
                                track.targetSlotId = nodeIdStr;
                                mdl._tracksCount = trackIdx + 1;
                            }
                        }
                    }

                    currentX += labelLen + 1; // Шаг каретки под следующую иконку прибора
                }
            }
        }

        // Каскадный обход детей контейнера по дереву разметки
        if (node.children && node.children.length > 0) {
            const len = node.children.length;
            for (let i = 0; i < len; i++) {
                scanNode(node.children[i]);
            }
        }
    };

    // Сброс преаллоцированного счетчика хит-треков строго по алиасу аргумента 'mdl'
    if (mdl) {
        mdl._tracksCount = 0;
    }

    scanNode(rootLayoutTree);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/taskbar/taskbar_view.js
 * Время изменения: 10.09.2026 16:51:00 MSK
 */
