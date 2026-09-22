/**
 * @file src/core/smo/window_manager_intents/mouse_wheel_reducer.js
 * @version 2.0.1-RELEASE-SMO-DOD-WM-PURE-WHEEL-ALIGN-FIXED
 * @description Инфраструктурный редьюсер прямого смещения оффсета с унифицированным обращением к иксу коллекций.
 */
import { generateGpssTransaction, _gpssEngineState } from "../bus.js";

export function reduceMouseWheel(facility, intentStr) {
    const activeIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
    const triad = Array.isArray(facility.viewStack) ? facility.viewStack[activeIdx] : facility.viewStack;
    if (!triad || !triad.mdl || !triad.view) return false;

    const m = triad.mdl;
    const v = triad.view;
    const intent = String(intentStr);
    const targetSlotIdStr = String(facility.slotId || facility.id || "102");

    // СИНХРОНИЗИРОВАНО: Исключен фолбэк на m.items. Читаем строго itemsList
    const total = m.itemsList ? m.itemsList.length : (m.themesList ? m.themesList.length : Math.max(0, m.totalLogsCount || 0));
    if (total === 0) return false;

    const currentOffset = Math.floor(m.viewportOffset || 0);
    const maxVisibleRows = Math.max(1, Math.floor(v.height || 10) - 4);
    let nextOffset = currentOffset;

    if (intent === "SCROLL_CONTENT_UP") {
        nextOffset = currentOffset - 1;
    } else if (intent === "SCROLL_CONTENT_DOWN") {
        nextOffset = currentOffset + 1;
    }

    const maxAllowedOffset = Math.max(0, total - maxVisibleRows);
    if (nextOffset < 0) nextOffset = 0;
    if (nextOffset > maxAllowedOffset) nextOffset = maxAllowedOffset;

    if (nextOffset !== currentOffset) {
        m.viewportOffset = nextOffset;
        m._isDirty = true;

        // СИНХРОНИЗИРОВАНО: Дублируем смещение колеса в строковый реестр Канала 14 для атомарного блита ползунка
        const vScrollMdl = _gpssEngineState.facilitiesRegistry.get("14")?.mdl;
        if (vScrollMdl && vScrollMdl.viewportOffsetRegistry) {
            vScrollMdl.viewportOffsetRegistry[targetSlotIdStr] = nextOffset;
        }

        const compType = String(facility.componentType || facility.component || "").trim();
        if (compType === "explorer" && _gpssEngineState.runtime?.workerGateway) {
            _gpssEngineState.runtime.workerGateway.triggerDirectoryIndexing(targetSlotIdStr, m.currentDirectoryPath, activeIdx);
        }

        if (_gpssEngineState.runtime?.virtualCanvasState) {
            _gpssEngineState.runtime.virtualCanvasState.isDirty = true;
        }
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "12");
        return true;
    }
    return false;
}