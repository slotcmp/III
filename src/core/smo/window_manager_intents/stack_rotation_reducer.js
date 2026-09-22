/**
 * @file src/core/smo/window_manager_intents/stack_rotation_reducer.js
 * @version 1.0.0-RELEASE-SMO-DOD-WM-STACK-ROTATION
 * @description Инфраструктурный редьюсер циклического переключения табов-триад окна.
 */
import { generateGpssTransaction, _gpssEngineState } from "../bus.js";

export function reduceStackRotation(facility) {
    if (!Array.isArray(facility.viewStack) || facility.viewStack.length <= 1) return false;

    const total = facility.viewStack.length;
    const currentIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
    const nextIdx = (currentIdx + 1) % total;

    facility.activeStackIdx = nextIdx;
    
    const nextTriad = facility.viewStack[nextIdx];
    if (nextTriad && nextTriad.mdl) {
        nextTriad.mdl._isDirty = true;

        // Если это Проводник (102/103) — каскадно отправляем IPC-запрос воркеру переиндексировать путь таба
        const compType = String(facility.componentType || "");
        const kernel = _gpssEngineState.runtime;
        if (compType === "explorer" && kernel?.workerGateway) {
            kernel.workerGateway.triggerDirectoryIndexing(String(facility.slotId || facility.id), nextTriad.mdl.currentDirectoryPath, nextIdx);
        }
    }

    if (_gpssEngineState.runtime?.virtualCanvasState) {
        _gpssEngineState.runtime.virtualCanvasState.isDirty = true;
    }
    generateGpssTransaction("1", "EXECUTE_RENDER", null, "12");
    return true;
}
