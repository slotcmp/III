/**
 * @file src/io/terminal/frame_decorator.js
 * @version 2.9.6-RELEASE-SMO-FRAME-DECORATOR-STRICT-OVERRIDE
 * @description Пассивный DOD-выжигатель оконных рамок и кнопок обвеса в Int32Array.
 * ИСПРАВЛЕНО: Защита контента убрана с базового периметра рамы (0% блокировок вертикалей).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% GC.
 */

import { packCellBits } from "./sprite_blit.js";
import { _activeThemeState } from "../../core/smo/bus.js";
import { resolveWebColor } from "../../core/layout/layout_color_map.js";

/**
 * Выжигает стальную раму и паспорт заголовка поверх глобальной UHD-матрицы кадра (Слой Z-2)
 */
export function drawFacilityWindowFrame(targetM, sX, sY, sW, sH, isFocusedBool, compTypeStr, slotIdStr) {
    if (!targetM || sW < 2 || sH < 2 || sX < 0 || sY < 0) return;

    const currentGlobalFocusedSlotIdStr = _activeThemeState.focusedSlotIdStr;
    const realIsFocusedBool = (String(slotIdStr) === currentGlobalFocusedSlotIdStr);

    const activeColorAlias = _activeThemeState.currentBorderAnsiMask;
    const passiveColorAlias = _activeThemeState.currentPassiveAnsiMask;

    const activeColorAnsi = resolveWebColor(activeColorAlias);
    const passiveColorAnsi = resolveWebColor(passiveColorAlias);

    const themeColorAnsi = realIsFocusedBool ? activeColorAnsi : passiveColorAnsi;
    const bgColor = "\x1b[40m";

    const packedHorizBits = packCellBits("═", themeColorAnsi, bgColor);
    const packedVertBits  = packCellBits("║", themeColorAnsi, bgColor);
    const packedTLBits    = packCellBits("╔", themeColorAnsi, bgColor);
    const packedTRBits    = packCellBits("╗", themeColorAnsi, bgColor);
    const packedBLBits    = packCellBits("╚", themeColorAnsi, bgColor);
    const packedBRBits    = packCellBits("╝", themeColorAnsi, bgColor);

    // =================================================================
    // ПРЯМОЙ ВЫЖИГ КАРКАСА РАМЫ (БЕЗ БЛОКИРОВОК КОНТЕНТОМ ВИДА)
    // =================================================================
    const tR = targetM[sY];
    const bR = targetM[sY + sH - 1];
    
    // 1. ГОРИЗОНТАЛЬНЫЕ РЕБРА ЧЕРТЯТСЯ НАПРЯМУЮ
    for (let x = 0; x < sW; x++) {
        const posX = (sX + x) | 0;
        if (tR) tR[posX] = packedHorizBits;
        if (bR) bR[posX] = packedHorizBits;
    }
    
    // 2. ВЕРТИКАЛЬНЫЕ РЕБРА ЧЕРТЯТСЯ НАПРЯМУЮ (0% КРАШЕЙ / ВЕРНУЛИ СТЕНЫ!)
    for (let y = 0; y < sH; y++) {
        const row = targetM[sY + y];
        if (row) {
            row[sX] = packedVertBits;
            row[sX + sW - 1] = packedVertBits;
        }
    }

    // 3. УГЛОВЫЕ ЗАСЕЧКИ
    if (tR) {
        tR[sX] = packedTLBits;
        tR[sX + sW - 1] = packedTRBits;
    }
    if (bR) {
        bR[sX] = packedBLBits;
        bR[sX + sW - 1] = packedBRBits;
    }

    // 4. НАКАТ ПАСПОРТА ЗАГОЛОВКА С ТРАФАРЕТНОЙ ЗАЩИТОЙ ГЛОБАЛЬНОЙ СТРОКИ 0
    // Если окно начинается с Y=0, дефолтный текстовый паспорт блокируется, 
    // чтобы освободить место для агрегатора вкладок Слота 200 на фазе Z-3
    if (sY === 0) {
        return; 
    }

    let displayTitle = String(compTypeStr || slotIdStr).toUpperCase();
    if (displayTitle === "THEME") displayTitle = "COLOR PALETTE";
    else if (displayTitle === "LOGGER") displayTitle = "SYSTEM LOGGER";
    
    const passportLineStr = "[ " + displayTitle + " ]";
    const tLen = passportLineStr.length;
    
    if (tR && sW > tLen + 20) {
        const textStartIdx = sX + 15; 
        const activeTextAnsiColor = realIsFocusedBool ? "\x1b[38;5;231m" : "\x1b[38;5;244m";
        
        for (let t = 0; t < tLen; t++) {
            const posX = (textStartIdx + t) | 0;
            const currentCell = tR[posX] | 0;
            const charCode = currentCell & 0xFF;
            // Защита контента работает исключительно внутри паспорта текста на средних эшелонах
            if (charCode === 32 || charCode === 0 || charCode === 0x3D) {
                tR[posX] = packCellBits(passportLineStr.charAt(t), activeTextAnsiColor, bgColor);
            }
        }
    }
}

/**
 * Вынесенный суверенный выжиг интерактивных кнопок обвеса (Слой Z-3)
 */
export function drawWindowButtonsOverlay(targetM, sX, sY, sW, sH, slotIdStr) {
    if (!targetM || sW < 17 || sH < 2 || sX < 0 || sY < 0) return;

    // Кнопки свертывания полностью блокируются на глобальной строке Y=0 в пользу агрегатора 200
    if (sY === 0) return;

    const tR = targetM[sY];
    if (!tR) return;

    const currentGlobalFocusedSlotIdStr = _activeThemeState.focusedSlotIdStr;
    const realIsFocusedBool = (String(slotIdStr) === currentGlobalFocusedSlotIdStr);

    const activeColorAlias = _activeThemeState.currentBorderAnsiMask;
    const passiveColorAlias = _activeThemeState.currentPassiveAnsiMask;
    const themeColorAnsi = resolveWebColor(realIsFocusedBool ? activeColorAlias : passiveColorAlias);
    
    const bgColor = "\x1b[40m";
    const startButtonsX = sX + sW - 12;

    const btnPassiveColor = "\x1b[38;5;244m"; 
    const closeActiveColor = "\x1b[38;5;196m"; 

    tR[startButtonsX]     = packCellBits("[", themeColorAnsi, bgColor);
    tR[startButtonsX + 1] = packCellBits("-", btnPassiveColor, bgColor);
    tR[startButtonsX + 2] = packCellBits("]", themeColorAnsi, bgColor);

    tR[startButtonsX + 4] = packCellBits("[", themeColorAnsi, bgColor);
    tR[startButtonsX + 5] = packCellBits("▲", realIsFocusedBool ? "\x1b[38;5;46m" : btnPassiveColor, bgColor);
    tR[startButtonsX + 6] = packCellBits("]", themeColorAnsi, bgColor);

    tR[startButtonsX + 8] = packCellBits("[", themeColorAnsi, bgColor);
    tR[startButtonsX + 9] = packCellBits("×", closeActiveColor, bgColor);
    tR[startButtonsX + 10] = packCellBits("]", themeColorAnsi, bgColor);
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/frame_decorator.js
 * Время изменения: 10.09.2026 16:03:00 MSK
 */
