/**
 * @file src/modules/fnbar/fnbar_view.js
 * @version 2.0.2-RELEASE-SMO-DOD-FNBAR-VIEW-ROW0-STRICT-FIX
 * @description Пассивный безаллокационный выжигатель Far-меню (PAC / Presentation).
 * ИСПРАВЛЕНА СТРОКА: Извлечена первая строка matrix[0] двумерного буфера кадра.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { packCellBits } from "../../io/terminal/sprite_blit.js";
import { _gpssEngineState } from "../../core/smo/bus.js";

/**
 * Посимвольно накатывает Far-клавиши 1..10 на единственную строку контента плоского окна (Y=0)
 */
export function renderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack) {
    if (!matrix || !mdl) return;

    const w = Math.max(40, Math.floor(currentW || 120));
    
    // ИСПРАВЛЕНИЕ: Берем строго первую контентную строку из двумерного локального буфера
    const row = matrix[0]; 
    if (!row) return;

    // СИНХРОНИЗАЦИЯ ИНДЕКСА И МАТРИЦЫ ИЗ РЕЕСТРА ОЗУ ЯДРА
    const activeIdx = Math.max(0, Math.floor(mdl.activeModifierIdx ?? 0)) & 3;
    
    const kernel = _gpssEngineState.runtime;
    let targetTabsArray = null;

    if (kernel && kernel.layoutTopologyTree) {
        let foundNode = null;
        const root = kernel.layoutTopologyTree;
        
        if (String(root.slot || root.id || "") === "104") {
            foundNode = root;
        } else if (root.children) {
            const cLen = root.children.length;
            for (let k = 0; k < cLen; k++) {
                const child = root.children[k];
                if (String(child.slot || child.id || "") === "104") { foundNode = child; break; }
                if (child.children) {
                    const ccLen = child.children.length;
                    for (let cc = 0; cc < ccLen; cc++) {
                        if (String(child.children[cc].slot || child.children[cc].id || "") === "104") { foundNode = child.children[cc]; break; }
                    }
                }
            }
        }
        if (foundNode) targetTabsArray = foundNode.tabs;
    }

    const targetTabStruct = targetTabsArray ? targetTabsArray[activeIdx] : null;
    const labelsList = targetTabStruct && Array.isArray(targetTabStruct.keys) 
        ? targetTabStruct.keys 
        : null;

    const fallbackList = ["Help", "Menu", "View", "Edit", "Copy", "RenMov", "MkDir", "Delete", "Conf", "Exit"];
    const activeLabelsSource = labelsList || fallbackList;

    const singleKeyWidth = Math.floor(w / 10);

    const bgNum = "\x1b[40m";
    const bgKey = "\x1b[48;5;30m"; 
    const fgNum = "\x1b[38;5;220m"; 
    const fgKey = "\x1b[38;5;231m"; 

    let currentX = 0;

    for (let i = 0; i < 10; i++) {
        const numStr = String(i + 1);
        const cmdStr = String(activeLabelsSource[i] || "");

        // Вывод номера клавиши (1..10)
        for (let n = 0; n < numStr.length; n++) {
            if (currentX < w) {
                row[currentX] = packCellBits(numStr.charAt(n), fgNum, bgNum);
                currentX++;
            }
        }

        // Вывод текстового названия команды Far на цветной плашке
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

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/fnbar/fnbar_view.js
 * Время изменения: 10.09.2026 16:56:00 MSK
 */
