/**
 * @file src/core/smo/window_manager_intents/cursor_step_reducer.js
 * @version 1.0.1-RELEASE-SMO-DOD-WM-CURSOR-STEP-FIXED
 * @description Инфраструктурный редьюсер пошагового сдвига курсора-плашки с унифицированными регистрами.
 */
import { generateGpssTransaction, _gpssEngineState } from "../bus.js";

export function reduceCursorStep(facility, intentStr) {
    const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
    const triad = Array.isArray(facility.viewStack) ? facility.viewStack[activeIdx] : facility.viewStack;
    if (!triad || !triad.mdl || !triad.view) return false;

    const m = triad.mdl;
    const v = triad.view;
    const intent = String(intentStr);
    const targetSlotIdStr = String(facility.slotId || facility.id || "102");

    // Читаем строго мономорфный регистр itemsList
    const total = m.itemsList ? m.itemsList.length : (m.themesList ? m.themesList.length : Math.max(0, m.totalLogsCount || 0));
    if (total === 0) return false;

    const oldSelected = Math.max(0, Math.floor(m.selectedIndex || 0));
    let nextSelected = oldSelected;

    if (intent === "MOVE_CURSOR_DOWN") {
        if (oldSelected < total - 1) nextSelected = oldSelected + 1;
    } else if (intent === "MOVE_CURSOR_UP") {
        if (oldSelected > 0) nextSelected = oldSelected - 1;
    }

    if (nextSelected !== oldSelected) {
        m.selectedIndex = nextSelected;

        const currentH = Math.floor(v.height || 10);
        const maxVisibleRows = Math.max(1, currentH - 4); 
        let currentOffset = Math.floor(m.viewportOffset || 0);

        if (nextSelected >= currentOffset + maxVisibleRows) {
            currentOffset = nextSelected - maxVisibleRows + 1;
        } else if (nextSelected < currentOffset) {
            currentOffset = nextSelected;
        }

        m.viewportOffset = currentOffset;
        m._isDirty = true;

        // Строковая адресация исключает Dictionary Mode в скрытом классе скроллбара
        const vScrollMdl = _gpssEngineState.facilitiesRegistry.get("14")?.mdl;
        if (vScrollMdl && vScrollMdl.viewportOffsetRegistry && vScrollMdl.selectedIndexRegistry) {
            vScrollMdl.viewportOffsetRegistry[targetSlotIdStr] = currentOffset;
            vScrollMdl.selectedIndexRegistry[targetSlotIdStr] = nextSelected;
        }

        if (_gpssEngineState.runtime?.virtualCanvasState) {
            _gpssEngineState.runtime.virtualCanvasState.isDirty = true;
        }
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "12");
        return true;
    }
    return false;
}