/**
 * @file src/modules/taskbar/taskbar_view.js
 * @version 2.0.6-RELEASE-SMO-DOD-TASKBAR-INDEX-MATRIX0-FINAL
 * @description Безаллокационный UHD-рендерер знакомест Панели задач (Presentation-контур, Слот 100).
 * ИСПРАВЛЕНО: Обращение к строке зафиксировано как matrix[0].
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

import { packCellBits } from "../../io/terminal/sprite_blit.js";
import { _gpssEngineState } from "../../core/smo/bus.js";

const _TARGET_TASK_SLOTS = ["102", "103", "106", "108"];
Object.freeze(_TARGET_TASK_SLOTS);

export function renderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack) {
    if (!matrix || !mdl) return;

    const w = Math.max(10, Math.floor(currentW || 120));

    // ФИКСИРУЕМ ИНДЕКС: Достаем реальный Int32Array первой строки холста
    const row = matrix[0];
    if (!row) return;

    let currentX = 0;
    mdl._tracksCount = 0;

    const kernel = _gpssEngineState.runtime;
    const topologyTree = kernel ? kernel.layoutTopologyTree : null;

    for (let i = 0; i < 4; i++) {
        const targetIdStr = _TARGET_TASK_SLOTS[i];
        const facility = _gpssEngineState.facilitiesRegistry.get(targetIdStr);
        if (!facility) continue;

        const isEnabled = facility.enabled !== false;
        let isCollapsed = false;
        if (topologyTree) {
            if (String(topologyTree.id) === targetIdStr) {
                isCollapsed = topologyTree.collapsed === true;
            } else if (topologyTree.children) {
                const cLen = topologyTree.children.length;
                for (let k = 0; k < cLen; k++) {
                    const child = topologyTree.children[k];
                    if (String(child.id) === targetIdStr) { isCollapsed = child.collapsed === true; break; }
                }
            }
        }

        const compTypeStr = String(facility.componentType || "window");

        if (isEnabled === true) {
            const colorAnsi = isCollapsed ? "\x1b[38;5;244m" : "\x1b[38;5;39m";
            const bracketColor = "\x1b[38;5;240m";

            const iconChar = isCollapsed ? "─" : "■";
            const labelStr = "[" + iconChar + " " + targetIdStr + ":" + compTypeStr + "]";
            const labelLen = labelStr.length;

            if (currentX + labelLen < w) {
                for (let k = 0; k < labelLen; k++) {
                    const chr = labelStr.charAt(k);
                    const cellColor = (k === 1) ? colorAnsi : ((k === 0 || k === labelLen - 1) ? bracketColor : "\x1b[38;5;250m");
                    row[currentX + k] = packCellBits(chr, cellColor, "\x1b[40m");
                }
                
                if (mdl._clickTracksRegistry) {
                    const trackIdx = Math.floor(mdl._tracksCount || 0);
                    if (trackIdx < 16) {
                        const track = mdl._clickTracksRegistry[trackIdx];
                        if (track) {
                            track.startX = currentX;
                            track.endX = currentX + labelLen;
                            track.targetSlotId = targetIdStr;
                            mdl._tracksCount = trackIdx + 1;
                        }
                    }
                }
                currentX += labelLen + 1;
            }
        }
    }

const cleanSpaceBits = packCellBits(" ", "\x1b[37m", "\x1b[40m");
    while (currentX < w) {
        row[currentX] = cleanSpaceBits; // Гарантирует сохранение Int32 типа в ячейках первой строки
        currentX++;
    }
}
