/**
 * @file src/modules/fnbar/fnbar_view.js
 * @version 2.0.8-RELEASE-SMO-IDD-FNBAR-VIEW-FIXED
 * @description Пассивный безаллокационный выжигатель Far-меню. Исправлено двумерное извлечение строки растра.
 */
import { packCellBits } from "../../io/terminal/sprite_blit.js";

export function renderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack) {
    if (!matrix || !mdl) return;

    const w = Math.max(40, Math.floor(currentW || 120));
    
    // ИСПРАВЛЕНО: Безопасное извлечение строки из двумерной матрицы окон (Защита от порчи типов)
    const row = matrix[0]; 
    if (!row) return;

    const currentModIdx = Math.max(0, Math.floor((mdl.activeModifierIdx !== undefined) ? mdl.activeModifierIdx : (mdl._activeSubZone || 0))) & 3;
    let sourceMatrix = mdl.menuMatrix;
    if ((!sourceMatrix || !Array.isArray(sourceMatrix[currentModIdx])) && Array.isArray(viewStack) && viewStack[0] && viewStack[0].mdl) {
        sourceMatrix = viewStack[0].mdl.menuMatrix;
    }

    const fallbackList = ["Help", "Menu", "View", "Edit", "Copy", "RenMov", "MkDir", "Delete", "Conf", "Exit"];
    const activeLabelsSource = (sourceMatrix && Array.isArray(sourceMatrix[currentModIdx])) 
        ? sourceMatrix[currentModIdx] 
        : fallbackList;

    const singleKeyWidth = Math.floor(w / 10);

    const bgNum = "\x1b[40m";
    const bgKey = "\x1b[48;5;30m"; 
    const fgNum = "\x1b[38;5;220m"; 
    const fgKey = "\x1b[38;5;231m"; 

    let currentX = 0;

    for (let i = 0; i < 10; i++) {
        const numStr = String(i + 1);
        const cmdStr = String(activeLabelsSource[i] || "");

        for (let n = 0; n < numStr.length; n++) {
            if (currentX < w) {
                row[currentX] = packCellBits(numStr.charAt(n), fgNum, bgNum);
                currentX++;
            }
        }

        const maxCmdChars = singleKeyWidth - numStr.length;
        for (let c = 0; c < maxCmdChars; c++) {
            if (currentX < w) {
                const charToPrint = c < cmdStr.length ? cmdStr.charAt(c) : " ";
                row[currentX] = packCellBits(charToPrint, fgKey, bgKey);
                currentX++;
            }
        }
    }

    while (currentX < w) {
        row[currentX] = packCellBits(" ", "\x1b[37m", bgNum);
        currentX++;
    }
}