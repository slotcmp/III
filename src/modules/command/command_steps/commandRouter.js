/**
 * @file src/modules/command/command_steps/commandRouter.js
 * @version 1.0.0-RELEASE-SMO-CLI-STEP-ROUTER
 * @description Стерильный перераспределитель доменных и инфраструктурных интентов CLI.
 */
import { generateGpssTransaction } from "../../../core/smo/bus.js";
import { processGenericUiKinematics } from "../../../core/smo/window_manager.js";

import { reduceCliCharInput } from "../intents/cli_char_reducer.js";
import { reduceCliTabCompletion } from "../intents/cli_tab_reducer.js";
import { reduceCliHistoryNavigation } from "../intents/cli_history_reducer.js";

export function commandRouter(m, intentStr, contextPayload, currentTx, kernel, facilityState) {
    const intent = String(intentStr || "");
    let isMutated = false;

    switch (intent) {
        case "KEY_PRESSED": {
            const rawCharObj = contextPayload || (currentTx ? currentTx.P3 : null);
            if (rawCharObj) {
                const chr = String(typeof rawCharObj === "object" ? (rawCharObj.char || "") : rawCharObj);
                isMutated = reduceCliCharInput(m, intent, chr);
            }
            break;
        }

        case "BACKSPACE":
        case "BACKSPACE_PRESSED":
        case "DELETE_CHAR":
            isMutated = reduceCliCharInput(m, "BACKSPACE", null);
            break;

        case "MOVE_CURSOR_LEFT":
        case "MOVE_CURSOR_RIGHT":
            isMutated = reduceCliCharInput(m, intent, null);
            break;

        case "TAB_COMPLETION_REQUEST":
            isMutated = reduceCliTabCompletion(m, kernel);
            break;

        case "MOVE_CURSOR_UP":
        case "MOVE_CURSOR_DOWN":
            isMutated = reduceCliHistoryNavigation(m, intent);
            break;

        case "EXECUTE_COMMAND":
            if (m.buffer && m.buffer.length > 0) {
                const commandStr = String(m.buffer).trim();
                
                if (m.historyBuffer) {
                    if (m.historyCount < 32) {
                        m.historyBuffer[m.historyCount] = commandStr;
                        m.historyCount++;
                    } else {
                        for (let i = 1; i < 32; i++) {
                            m.historyBuffer[i - 1] = m.historyBuffer[i];
                        }
                        m.historyBuffer[31] = commandStr; 
                    }
                    m.historyCursor = m.historyCount;
                    if (kernel?.model?.logicalState?.appSettings) {
                        kernel.model.logicalState.appSettings.cli_history_count = m.historyCount;
                        kernel.model.logicalState.appSettings._isHistoryDirty = true;
                    }
                }

                generateGpssTransaction("0", "SYSTEM_COMMAND_EXECUTE", { rawCommand: commandStr }, "105");
                
                m.buffer = ""; m.cursor = 0; m.textLength = 0; m.cursorX = 0;
                for (let k = 0; k < 256; k++) m.charBuffer[k] = " ";
                m._isDirty = true;
                isMutated = true;
            }
            break;

        default:
            isMutated = processGenericUiKinematics(facilityState, intentStr, contextPayload);
            break;
    }

    return isMutated;
}
