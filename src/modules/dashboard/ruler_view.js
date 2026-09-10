/**
 * @file src/modules/dashboard/ruler_view.js
 * @version 2.8.0-RELEASE-SMO-RULER-VIEW-PENNER-TWINNING-COMPLIANT
 * @description Суб-представление Дашборда Линейки.
 * ИСПРАВЛЕН ТВИННИНГ: Позиция каретки ▲ привязана к вещественному регистру интерполяции _currentTriangleX.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { packCellBits } from "../../io/terminal/sprite_blit.js";

const SAFE_MAX_COLS = 512;
const _digitCharBuffer = new Uint8Array([0x20, 0x20, 0x20, 0x20]); 

export function renderRulerContent(matrix, currentW, currentH, mdl) {
    if (!matrix || currentH < 6) return;

    const topRow = matrix[3]; 
    const midRow = matrix[4]; 
    const botRow = matrix[5];
    if (!topRow || !midRow || !botRow) return;

    const limitW = Math.min(SAFE_MAX_COLS, Math.max(1, Math.floor(currentW || 120)));
    const defBg = "\x1b[40m";

    const packedLineBits  = packCellBits("─", "\x1b[38;5;239m", defBg);
    const packedCrossBits = packCellBits("┼", "\x1b[38;5;242m", defBg);
    const packedTickBits  = packCellBits("┴", "\x1b[38;5;220m", defBg);

    for (let x = 2; x < limitW - 2; x++) {
        const absX = x - 1;
        const remainderNum = absX % 10;

        midRow[x] = packedLineBits;

        if (absX % 5 === 0 && remainderNum !== 0) {
            midRow[x] = packedCrossBits;
        }

        if (remainderNum === 0) {
            midRow[x] = packedTickBits;

            let temp = absX;
            const db = _digitCharBuffer;
            db[0] = 0x20; db[1] = 0x20; db[2] = 0x20; db[3] = 0x20;

            let charCount = 0;
            if (temp === 0) {
                db[0] = 0x30; charCount = 1;
            } else {
                let t1 = temp;
                if (t1 >= 100) charCount = 3;
                else if (t1 >= 10) charCount = 2;
                else charCount = 1;

                let idx = charCount - 1;
                while (t1 > 0 && idx >= 0) {
                    db[idx] = 0x30 + (t1 % 10);
                    t1 = Math.floor(t1 / 10);
                    idx--;
                }
            }

            const startX = x - Math.floor(charCount / 2);
            for (let charIdx = 0; charIdx < charCount; charIdx++) {
                const targetX = startX + charIdx;
                if (targetX >= 2 && targetX < limitW - 2) {
                    topRow[targetX] = packCellBits(String.fromCharCode(db[charIdx]), "\x1b[38;5;44m", defBg);
                }
            }
        }
    }

    // =================================================================
    // ВЫЖИГ ТВИННИНГ-КАРЕТКИ ▲ С ОКРУГЛЕНИЕМ ВЕЩЕСТВЕННОЙ КООРДИНАТЫ
    // =================================================================
    // Считываем живой сглаженный шаг интерполяции Роберта Пеннера
    const floatTriangleX = Number(mdl?._currentTriangleX ?? 3);
    const targetTriangleX = Math.round(floatTriangleX);
    
    if (targetTriangleX >= 2 && targetTriangleX < limitW - 2) {
        // Каретка плавно скользит по нижней строке Y = 5 знакомест Дашборда
        botRow[targetTriangleX] = packCellBits("▲", "\x1b[38;5;196m", defBg);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/dashboard/ruler_view.js
 * Время исправления: 03.09.2026 14:12:35 MSK
 * Ревизия: #0824-RULER-VIEW-PENNER-TWINNING-STABLE
 */
