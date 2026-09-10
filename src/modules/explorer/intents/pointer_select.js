/**
 * @file src/modules/explorer/intents/pointer_select.js
 * @version 2.0.0-RELEASE-SMO-EXPLORER-REDUCER-POINTER-SELECT
 * @description Абстрактный DOD-редьюсер абсолютного выбора элемента по клику TUI-строки.
 */

import path from "node:path";
import { _gpssEngineState } from "../../../core/smo/bus.js";

const _clicksRegistry = new Float64Array(256);

export function reducePointerSelect(triad, payload, slotIdStr, activeIdx) {
    if (!triad || !triad.mdl || !payload || payload.localY === undefined) return false;

    const m = triad.mdl;
    const localY = Math.floor(payload.localY);
    if (localY < 3) return false;

    const totalItems = m.itemsList ? m.itemsList.length : 0;
    const targetItemIdx = Math.floor((m.viewportOffset || 0) + (localY - 3));
    if (targetItemIdx < 0 || targetItemIdx >= totalItems) return false;

    const targetItemObj = m.itemsList[targetItemIdx];
    if (!targetItemObj) return false;

    const nowTimeNum = Date.now();
    const slotIdNum = parseInt(slotIdStr, 10) & 127;
    const timeRegistryIdx = slotIdNum * 2;
    const idxRegistryIdx = slotIdNum * 2 + 1;

    const lastClickTimeNum = _clicksRegistry[timeRegistryIdx];
    const lastClickIdxNum = _clicksRegistry[idxRegistryIdx] - 1;

    if (targetItemIdx === lastClickIdxNum && (nowTimeNum - lastClickTimeNum) < 300) {
        const isDir = targetItemObj.isDir === true || targetItemObj.isDirectory === true;
        const itemNameStr = String(targetItemObj.name || "");

        if (isDir === true) {
            let nextDirectoryPath = "";
            if (itemNameStr === "..") {
                nextDirectoryPath = path.dirname(String(m.currentDirectoryPath || "C:/"));
            } else {
                nextDirectoryPath = path.resolve(String(m.currentDirectoryPath || "C:/"), itemNameStr);
            }

            m.currentDirectoryPath = nextDirectoryPath;
            m.selectedIndex = 0; 
            _clicksRegistry[timeRegistryIdx] = 0;
            _clicksRegistry[idxRegistryIdx] = 0;

            const kernel = _gpssEngineState.runtime;
            if (kernel && kernel.workerGateway) {
                kernel.workerGateway.triggerDirectoryIndexing(slotIdStr, nextDirectoryPath, activeIdx);
            }
            m._isDirty = true;
            return true;
        }
    } else {
        m.selectedIndex = targetItemIdx;
        _clicksRegistry[timeRegistryIdx] = nowTimeNum;
        _clicksRegistry[idxRegistryIdx] = targetItemIdx + 1;
        m._isDirty = true;
        return true;
    }

    return false;
}
