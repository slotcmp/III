/**
 * @file src/io/terminal/vectors/ansi_escape_vector.js
 * @version 1.0.3-RELEASE-SMO-VECTOR-ANSI-ESCAPE-SAFE-REGISTERS
 * @description Вынесенный изолированный автомат разбора управляющих префиксов ANSI Escape-кодов и стрелок.
 * ИСПРАВЛЕНО: Флаг сдвоенного ESC (ALT) переведен на использование преаллоцированного регистра st._paramIdx.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

import { dispatchKeyToken } from "./key_dispatcher.js";

export function reduceAnsiEscapeState(b, st, kernel) {
    if (st.state === 1) {
        if (b === 0x5B) { 
            st.state = 2; 
        } else if (b === 0x4F) { 
            st.state = 5; 
        } else if (b === 0x1B) { 
            // ИСПРАВЛЕНИЕ: Используем преаллоцированный _paramIdx как флаг зажатия ALT
            st._paramIdx = 1; 
        } else {
            const altCharToken = String.fromCharCode(b).toLowerCase();
            dispatchKeyToken(0x1B, "alt+" + altCharToken, kernel);
            st.state = 0; 
        }
        return;
    }

    if (st.state === 2) {
        if (b === 0x3C) { 
            st.state = 4; 
            st._paramIdx = 0; st.btnCode = 0; st.mX = 0; st.mY = 0;
        } else if (b >= 0x30 && b <= 0x39) { 
            st.state = 6;
            st._vtParamLen = 0;
            st._vtParamBuf[st._vtParamLen++] = b;
        } else {
            const arrowChar = String.fromCharCode(b);
            let arrowName = "";
            if (arrowChar === "A") arrowName = "up";
            else if (arrowChar === "B") arrowName = "down";
            else if (arrowChar === "C") arrowName = "right";
            else if (arrowChar === "D") arrowName = "left";

            if (arrowName.length > 0) {
                dispatchKeyToken(0, arrowName, kernel);
            }
            st.state = 0;
        }
    }
}
