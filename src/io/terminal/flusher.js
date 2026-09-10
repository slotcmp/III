/**
 * @file src/io/terminal/flusher.js
 * @version 4.0.1-RELEASE-SMO-GRAPHICS-FLUSHER-FIXED
 * @description Дифференциальный TUI-блайтер Double Buffering кадра с поддержкой распаковки Int32Array.
 * ИСПРАВЛЕНА СЕГМЕНТАЦИЯ КУРСOРА: Оптимизирован сброс открытого сегмента при пропуске неизмененных ячеек.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / 0% GC.
 */

import fs from "node:fs";
import { unpackCellBits } from "./sprite_blit.js";

const _staticOutputByteBuffer = new Uint8Array(262144);
const _staticUtf8TokenBuffer = Buffer.alloc(4);

// Локальный распаковочный DOD-регистр, предотвращающий аллокацию объектов на кадре кадра
const _localUnpackCellRegister = { char: " ", fg: "", bg: "" };
Object.preventExtensions(_localUnpackCellRegister);

const _shadowCanvasState = {
    matrix: new Array(64)
};
for (let y = 0; y < 64; y++) {
    _shadowCanvasState.matrix[y] = new Int32Array(512);
    for (let x = 0; x < 512; x++) {
        _shadowCanvasState.matrix[y][x] = -1; // Принудительный триггер стартовой заливки черным фоном
    }
}
Object.preventExtensions(_shadowCanvasState.matrix);
Object.preventExtensions(_shadowCanvasState);

export function forceInvalidateShadowCanvas() {
    const shadowM = _shadowCanvasState.matrix;
    for (let y = 0; y < 64; y++) {
        const row = shadowM[y];
        if (row) {
            for (let x = 0; x < 512; x++) {
                row[x] = -1;
            }
        }
    }
}

export function flushVirtualCanvasToTty(virtualCanvasState, kernel, geoMap) {
    if (!virtualCanvasState || !kernel || !virtualCanvasState.virtualMatrix) return false;
    if (virtualCanvasState.isDirty === false) return false;

    const rootGeo = geoMap ? geoMap["root"] : null;
    const terminalW = Math.max(40, Math.floor(rootGeo?.w || 120));
    const terminalH = Math.max(10, Math.floor(rootGeo?.h || 30));

    const currentM = virtualCanvasState.virtualMatrix.matrix;
    const shadowM = _shadowCanvasState.matrix;

    const buf = _staticOutputByteBuffer;
    let ptr = 0;

    let activeAnsiFgStr = "";
    let activeAnsiBgStr = "";

    for (let y = 0; y < terminalH; y++) {
        const cRow = currentM[y]; 
        const sRow = shadowM[y]; 
        if (!cRow || !sRow) continue;

        let isSegmentOpen = false;

        for (let x = 0; x < terminalW; x++) {
            const cPackedBits = cRow[x];
            const sPackedBits = sRow[x];

            // ДЕТЕКЦИЯ ДЕЛЬТЫ ПИКСЕЛЯ НА УРОВНЕ СРАВНЕНИЯ ДВУХ ЧИСЕЛ
            if (cPackedBits !== sPackedBits) {
                
                if (isSegmentOpen === false) {
                    const posStr = "\x1b[" + (y + 1) + ";" + (x + 1) + "H";
                    for (let i = 0; i < posStr.length; i++) buf[ptr++] = posStr.charCodeAt(i);
                    isSegmentOpen = true;
                }

                unpackCellBits(cPackedBits, _localUnpackCellRegister);

                if (_localUnpackCellRegister.fg !== activeAnsiFgStr) {
                    const fgStr = _localUnpackCellRegister.fg;
                    for (let i = 0; i < fgStr.length; i++) buf[ptr++] = fgStr.charCodeAt(i);
                    activeAnsiFgStr = fgStr;
                }
                if (_localUnpackCellRegister.bg !== activeAnsiBgStr) {
                    const bgStr = _localUnpackCellRegister.bg;
                    for (let i = 0; i < bgStr.length; i++) buf[ptr++] = bgStr.charCodeAt(i);
                    activeAnsiBgStr = bgStr;
                }

                const charStr = _localUnpackCellRegister.char;
                if (charStr.length > 0) {
                    const primaryCode = charStr.charCodeAt(0);
                    if (primaryCode < 128 && charStr.length === 1) {
                        buf[ptr++] = primaryCode;
                    } else {
                        const bytesWritten = _staticUtf8TokenBuffer.write(charStr, 0, "utf8");
                        for (let i = 0; i < bytesWritten; i++) {
                            buf[ptr++] = _staticUtf8TokenBuffer[i];
                        }
                    }
                } else {
                    buf[ptr++] = 0x20;
                }

                sRow[x] = cPackedBits;
            } else {
                // Если пиксель не изменился, закрываем текущую цепочку монолитного вывода
                isSegmentOpen = false;
            }
        }
    }

    if (ptr > 0) {
        fs.writeSync(1, buf, 0, ptr, null);
    }

    virtualCanvasState.isDirty = false;
    return true;
}
