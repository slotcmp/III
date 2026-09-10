/**
 * @file src/modules/dashboard/monitor_view.js
 * @version 3.1.1-RELEASE-SMO-MONITOR-VIEW-INT32ARRAY-STABLE
 * @description Пассивный процедурный отрисовщик шкал CPU/RAM Дашборда.
 * ИСПРАВЛЕН КРАШ: Вывод прогресс-баров полностью переведен на пакование чисел через packCellBits.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { packCellBits } from "../../io/terminal/sprite_blit.js";

export function renderMonitorContent(matrix, currentW, currentH, mdlState) {
    if (!matrix || !mdlState) return;

    const maxCols = Math.max(10, Math.floor(currentW || 120));
    const cpu = Math.max(0, Math.min(100, Math.floor(mdlState._cpuPercent || 0)));
    const ram = Math.max(0, Math.min(100, Math.floor(mdlState._ramPercent || 0)));

    const rowCPU = matrix[3]; // Шкала CPU смещена на Y=3
    if (rowCPU) {
        const cpuLabelStr = "  CPU LOADING: [" + String(cpu).padStart(3, " ") + "%] ";
        for (let i = 0; i < cpuLabelStr.length; i++) {
            if (2 + i < maxCols - 1) {
                rowCPU[2 + i] = packCellBits(cpuLabelStr.charAt(i), "\x1b[37m", "\x1b[40m");
            }
        }
        
        const startScaleX = 24;
        const availableScaleW = Math.max(10, maxCols - startScaleX - 4);
        const filledScaleCharsCount = Math.floor((availableScaleW * cpu) / 100);

        for (let x = 0; x < availableScaleW; x++) {
            if (startScaleX + x < maxCols - 1) {
                const charStr = x < filledScaleCharsCount ? "█" : "░";
                const fgStr = x < filledScaleCharsCount ? "\x1b[38;5;46m" : "\x1b[38;5;236m";
                rowCPU[startScaleX + x] = packCellBits(charStr, fgStr, "\x1b[40m");
            }
        }
    }

    const rowRAM = matrix[4]; // Шкала RAM смещена на Y=4
    if (rowRAM) {
        const ramLabelStr = "  RAM CONSUME: [" + String(ram).padStart(3, " ") + "%] ";
        for (let i = 0; i < ramLabelStr.length; i++) {
            if (2 + i < maxCols - 1) {
                rowRAM[2 + i] = packCellBits(ramLabelStr.charAt(i), "\x1b[37m", "\x1b[40m");
            }
        }

        const startScaleX = 24;
        const availableScaleW = Math.max(10, maxCols - startScaleX - 4);
        const filledScaleCharsCount = Math.floor((availableScaleW * ram) / 100);

        for (let x = 0; x < availableScaleW; x++) {
            if (startScaleX + x < maxCols - 1) {
                const charStr = x < filledScaleCharsCount ? "█" : "░";
                const fgStr = x < filledScaleCharsCount ? "\x1b[38;5;51m" : "\x1b[38;5;236m";
                rowRAM[startScaleX + x] = packCellBits(charStr, fgStr, "\x1b[40m");
            }
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/dashboard/monitor_view.js
 * Время исправления: 03.09.2026 13:19:00 MSK
 */
