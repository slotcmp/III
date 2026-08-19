/**
 * @file: src/io/terminal/frame_title_renderer.js
 * @path: C:\slotcmd_3\src\io\terminal\frame_title_renderer.js
 * @version: 3.0.0-RELEASE-DOD-FORK
 * @description: frameRenderer заголовка по канону скриншота slotcmd_2 (0% Class).
 */
import { resolveWebColor } from "../../core/layout/layout_color_map.js";

export function drawFrameTitle(row, compTypeStr, slotIdStr, currentW, isFocusedBool) {
    if (!row) return;

    // Скриншот-оригинал: шаблон "= [ Название ] ="
    let displayTitle = String(compTypeStr).toUpperCase();
    if (displayTitle === "THEME") displayTitle = "COLOR PALETTE";
    if (displayTitle === "LOGGER") displayTitle = "SYSTEM LOGGER";

    const titleTextStr = "= [ " + displayTitle + " ] =";
    const tLen = titleTextStr.length;
    
    if (currentW > tLen + 6) {
        const startX = 4; // Сдвинуто к левому краю, как на скриншоте оригинала
        for (let i = 0; i < tLen; i++) {
            const cell = row[startX + i];
            if (cell) {
                cell.char = titleTextStr.charAt(i);
                // На скриншоте: текст заголовка всегда белый/серый, разметка рамы вокруг
                cell.fg = isFocusedBool ? resolveWebColor("white") : resolveWebColor("gray"); 
            }
        }
    }
}
