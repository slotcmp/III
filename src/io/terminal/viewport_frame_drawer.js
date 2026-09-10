/**
 * @file src/io/terminal/viewport_frame_drawer.js
 * @version 4.7.1-RELEASE-SMO-FRAME-DRAWER-Z3-EXPORT-FIXED
 * @description Центральный системный сборщик элементов обвеса рамы (Presentation-контур).
 * ИСПРАВЛЕНА СВЯЗЬ ОВЕРЛЕЕВ: Внедрен прямой реэкспорт drawWindowButtonsOverlay для редьюсера Z-3.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP.
 */

import { drawFacilityWindowFrame } from "./frame_decorator.js";
import { drawFrameGeoPassport } from "./frame_geo_renderer.js";
import { drawFrameQueueIndicator } from "./frame_queue_renderer.js";

import { packCellBits } from "./sprite_blit.js";
import { _gpssEngineState } from "../../core/smo/bus.js";

/**
 * Выполняет комплексную финализацию внешнего вида СМО-окна на глобальном холсте кадра
 */
export function drawDisplayNodeFrame(targetMatrix, compTypeStr, slotIdStr, isFocusedBool, sX, sY, sW, sH) {
    // 1. Накатываем стальные ребра окна ╔ ═ ╗ ║, паспорт заголовка и КНОПКИ
    drawFacilityWindowFrame(targetMatrix, sX, sY, sW, sH, isFocusedBool, compTypeStr, slotIdStr);

    if (sW < 6 || sH < 3) return;

    // 2. ВЫЖИГ ЖИВОГО ПУТИ VFS НА НИЖНЮЮ ГРАНЬ (Y = sY + sH - 1)
    const botRow = targetMatrix[sY + sH - 1];
    const facility = _gpssEngineState.facilitiesRegistry.get(slotIdStr);

    if (botRow) {
        // По умолчанию чертим стандартный штамп геометрии [WxH] справа
        drawFrameGeoPassport(botRow, sX, sW, sH);

        // Если это Проводник — врезаем актуальный путь папки на левую сторону нижней рамки
        if ((compTypeStr === "explorer" || slotIdStr === "102" || slotIdStr === "103") && facility && facility.viewStack) {
            const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
            const activeNode = Array.isArray(facility.viewStack) ? facility.viewStack[activeIdx] : facility.viewStack;
            const activeMdl = activeNode?.mdl;

            if (activeMdl && activeMdl.currentDirectoryPath) {
                const rawPathStr = String(activeMdl.currentDirectoryPath);
                // Формируем красивый TUI-паспорт стыка ребер: ╡ C:/Windows ╞
                const pathPassportStr = "╡ " + rawPathStr + " ╞";
                const pLen = pathPassportStr.length;

                // Защитный гвард: выводим путь только если он физически влезает в рамку, не перетирая геометрию
                if (sW > pLen + 15) {
                    const startPathX = sX + 2; // Небольшой отступ от левого угла '╚'
                    const pathColorAnsi = isFocusedBool ? "\x1b[38;5;231m" : "\x1b[38;5;244m"; // Белый или стальной
                    const bgColorStr = "\x1b[40m";

                    for (let t = 0; t < pLen; t++) {
                        botRow[startPathX + t] = packCellBits(pathPassportStr.charAt(t), pathColorAnsi, bgColorStr);
                    }
                }
            }
        }
    }

    // 3. Отрисовка паспорта вью-стека слота [1: 101 1/2]== в правом верхнем углу рамы
    const topRow = targetMatrix[sY];
    if (topRow && facility) {
        let displayIndexNum = Math.floor(facility.displayIndex || 0);
        drawFrameQueueIndicator(topRow, sX, slotIdStr, displayIndexNum, facility.viewStack, sW, facility);
    }
}

// =================================================================
// ИСПРАВЛЕНИЕ ЛИНКОВКИ: ПРЯМОЙ РЕЭКСПОРТ ДЛЯ КОНВЕЙЕРА СЛОЯ Z-3
// =================================================================
export { drawWindowButtonsOverlay } from "./frame_decorator.js";

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/viewport_frame_drawer.js
 * Время изменения: 09.09.2026 14:31:10 MSK
 */
