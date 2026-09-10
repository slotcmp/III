/**
 * @file src/modules/explorer/intents/pointer_step.js
 * @version 2.0.0-RELEASE-SMO-EXPLORER-REDUCER-POINTER-STEP
 * @description Абстрактный DOD-редьюсер дискретного циклического изменения вкладок.
 */

import { _gpssEngineState } from "../../../core/smo/bus.js";

export function reducePointerStep(payload, slotIdStr, viewStack) {
    if (!payload || !Array.isArray(viewStack)) return false;

    const rawIdx = payload.targetStackIdx !== undefined ? payload.targetStackIdx :
                   (payload.tabIdx !== undefined ? payload.tabIdx : undefined);

    if (rawIdx === undefined) return false;

    const targetTabIdxNum = Math.max(0, Math.floor(rawIdx || 0));
    if (targetTabIdxNum >= viewStack.length) return false;

    const facility = _gpssEngineState.facilitiesRegistry.get(slotIdStr);
    if (!facility) return false;

    const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
    if (targetTabIdxNum === activeIdx) return false;

    facility.activeStackIdx = targetTabIdxNum;
    
    const nextActiveNode = viewStack[targetTabIdxNum];
    if (nextActiveNode && nextActiveNode.mdl) {
        nextActiveNode.mdl._isDirty = true;
        
        const kernel = _gpssEngineState.runtime;
        if (kernel && kernel.workerGateway) {
            const currentPath = String(nextActiveNode.mdl.currentDirectoryPath || "C:/");
            kernel.workerGateway.triggerDirectoryIndexing(slotIdStr, currentPath, targetTabIdxNum);
        }
        return true;
    }

    return false;
}
