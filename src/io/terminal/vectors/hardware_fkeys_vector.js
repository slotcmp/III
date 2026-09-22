/**
 * @file src/io/terminal/vectors/hardware_fkeys_vector.js
 * @version 1.0.6-RELEASE-SMO-VECTOR-HARDWARE-FKEYS-EXTREME-SPEED
 * @description Безаллокационный сборщик параметров F1..F10. split() заменен на высокоскоростной ASCII-сканер.
 */
import { dispatchKeyToken } from "./key_dispatcher.js";

export function reduceHardwareFKeysState(b, st, kernel) {
    if (st.state === 5) {
        const fChar = String.fromCharCode(b);
        let fToken = "";
        if (fChar === "P") fToken = "f1";
        else if (fChar === "Q") fToken = "f2";
        else if (fChar === "R") fToken = "f3";
        else if (fChar === "S") fToken = "f4";

        if (fToken.length > 0) dispatchKeyToken(0, fToken, kernel);
        st.state = 0;
        return;
    }

    if (st.state === 6) {
        if ((b >= 0x30 && b <= 0x39) || b === 0x3B) {
            if (st._vtParamLen < 8) st._vtParamBuf[st._vtParamLen++] = b;
        } 
        else if (b === 0x7E) { 
            // Прецизионный посимвольный выжим чисел без создания промежуточных массивов строк
            let codeNum = 0;
            let modCodeNum = 1;
            let isSecondParam = false;

            const len = st._vtParamLen;
            for (let i = 0; i < len; i++) {
                const charCode = st._vtParamBuf[i];
                if (charCode === 0x3B) { 
                    isSecondParam = true;
                    continue;
                }
                const digit = (charCode - 0x30) | 0;
                if (!isSecondParam) {
                    codeNum = ((codeNum * 10) + digit) | 0;
                } else {
                    modCodeNum = ((modCodeNum * 10) + digit) | 0;
                }
            }

            let fToken = "";
            if (codeNum === 15) fToken = "f5";
            else if (codeNum === 17) fToken = "f6";
            else if (codeNum === 18) fToken = "f7";
            else if (codeNum === 19) fToken = "f8";
            else if (codeNum === 20) fToken = "f9";
            else if (codeNum === 21) fToken = "f10";

            if (fToken.length > 0) {
                const isAltPressedBool = (modCodeNum === 3 || modCodeNum === 4 || st._paramIdx === 1);

                const combinedKbdPayload = {
                    name: fToken,
                    _iddSignature: 0x4246, // Инжектируем подпись легитимности для contract_validator.js
                    ctrl: (modCodeNum === 5),
                    shift: (modCodeNum === 2),
                    alt: isAltPressedBool,
                    meta: isAltPressedBool, 
                    isRealCombo: (modCodeNum > 1 || isAltPressedBool === true)
                };
                Object.preventExtensions(combinedKbdPayload);

                st._paramIdx = 0;

                const focusedId = String(kernel.model?.logicalState?.focusedSlotId || "105");
                if (kernel.workerGateway && typeof kernel.workerGateway.triggerKeyboardBufferParsing === "function") {
                    kernel.workerGateway.triggerKeyboardBufferParsing(focusedId, combinedKbdPayload);
                }
            }
            st.state = 0;
        } else {
            st.state = 0; 
        }
    }
}