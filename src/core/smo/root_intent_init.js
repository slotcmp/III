/**
 * @file src/core/smo/root_intent_init.js
 * @version 6.4.2-RELEASE-SMO-ROOT-LAZY-SAFE-RESIZE-RESTORED
 */
import { executeDeferredSynchronization } from "../slot_maker.js";
import { generateGpssTransaction } from "./bus.js";

export function processInitIntent(unitState, r) {
    if (!unitState || !r) return false;
    if (unitState.isSystemFullyBooted === true) return false;
    unitState.isSystemFullyBooted = true; 

    generateGpssTransaction("11", "BOOT_LAYOUT_TREE", null);
    unitState.isStageHydratedAndReady = true;
    return true;
}

export function processDeferredSyncIntent(unitState, payload) {
    if (!unitState || !unitState.hub || !payload) return false;
    const kernel = unitState.hub;
    
    const success = executeDeferredSynchronization(kernel, payload);
    
    if (success) {
        const slotIdStr = String(payload.slotId || "");
        const compTypeStr = String(payload.cleanDomain || "");
        
        if (compTypeStr === "explorer") {
            const configData = kernel.model?.logicalState?.appSettings;
            const pathKey = "s" + slotIdStr + "_paths";
            // ИСПРАВЛЕНИЕ: Прямые Unix-разделители для VFS-воркера
            const startPath = (configData && configData[pathKey]) ? configData[pathKey] : "C:/";
            
            if (kernel.workerGateway && typeof kernel.workerGateway.triggerDirectoryIndexing === "function") {
                kernel.workerGateway.triggerDirectoryIndexing(slotIdStr, startPath, 0);
            }
        }
        
        if (kernel.virtualCanvasState) {
            kernel.virtualCanvasState.isDirty = true;
        }
    }
    return success;
}
