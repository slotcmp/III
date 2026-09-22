import { generateGpssTransaction, _gpssEngineState } from "../../../core/smo/bus.js";
import { forceInvalidateShadowCanvas } from "../../../io/terminal/flusher.js";

export function handleScrollTabsUp(m, kernel, hostFacility, slotId, targetSlotIdStr, activeIdx) {
    if (targetSlotIdStr === "200") {
        const fnbarFacility = _gpssEngineState.facilitiesRegistry.get("104");
        if (!fnbarFacility) return false;

        const currentModIdx = Math.max(0, Math.floor(fnbarFacility.activeStackIdx || 0));
        const nextModIdx = (currentModIdx - 1 + 4) % 4;

        if (nextModIdx !== currentModIdx) {
            generateGpssTransaction("104", "KEYBOARD_MODIFIER_CHANGED", { modifierIdx: nextModIdx }, "200");
            return true;
        }
        return false;
    }

    if (!m || !hostFacility || !Array.isArray(hostFacility.viewStack)) return false;
    const total = hostFacility.viewStack.length;
    if (total <= 1) return false;

    const nextIdx = (activeIdx - 1 + total) % total;
    if (nextIdx !== activeIdx) {
        hostFacility.activeStackIdx = nextIdx;
        m.activeTabRegistry[slotId] = nextIdx;
        
        if (String(hostFacility.componentType) === "explorer" && kernel?.workerGateway) {
            const nextMdl = hostFacility.viewStack[nextIdx].mdl;
            if (nextMdl) kernel.workerGateway.triggerDirectoryIndexing(targetSlotIdStr, nextMdl.currentDirectoryPath, nextIdx);
        }

        if (kernel) {
            if (kernel.virtualCanvasState) kernel.virtualCanvasState.isDirty = true;
            const currentMdl = hostFacility.viewStack[nextIdx].mdl;
            if (currentMdl) currentMdl._isDirty = true;
        }

        if (typeof forceInvalidateShadowCanvas === "function") forceInvalidateShadowCanvas();

        generateGpssTransaction(targetSlotIdStr, "SWITCH_SLOT_TAB", { targetStackIdx: nextIdx }, "12");
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "12");
        return true;
    }
    return false;
}
