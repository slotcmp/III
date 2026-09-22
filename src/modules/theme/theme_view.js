/**
 * @file src/modules/theme/theme_view.js
 * @version 3.4.3-RELEASE-SMO-THEME-VIEW-SELF-CONTAINED
 * @description Пассивный процедурный отрисовщик TUI-строк палитр Слота 106 с постоянным автоналивом.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { prepareGenericTuiLayout } from "../../io/terminal/generic_tui_layout.js";
import { drawFrameGrid } from "../../io/terminal/frame_grid_renderer.js";
import { drawThemeItem } from "./theme_item_renderer.js";
import { _gpssEngineState } from "../../core/smo/bus.js";
import { reduceCollectionInject } from "./intents/collection_inject.js";

const _LOCAL_STATIC_THEMES_RECORDS = [
    { id: "classic",    name: "Classic Grey", borderColorMsk: "gray",      passiveColorMsk: "darkgray" },
    { id: "matrix",     name: "Matrix Green", borderColorMsk: "green",     passiveColorMsk: "black" },
    { id: "cyberpunk",  name: "Cyber Neon",   borderColorMsk: "magenta",   passiveColorMsk: "blue" },
    { id: "dracula",    name: "Dracula Vamp", borderColorMsk: "purple",    passiveColorMsk: "darkgray" },
    { id: "nordic",     name: "Nordic Frost", borderColorMsk: "cyan",      passiveColorMsk: "darkgray" }
];
Object.freeze(_LOCAL_STATIC_THEMES_RECORDS);

/**
 * Унифицированная процедура рендеринга контента Панели Тем
 */
export function renderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack) {
    if (!matrix) return;

    const activeIdx = Math.max(0, Math.floor(activeTabIdx || 0));
    const activeTriad = Array.isArray(viewStack) ? viewStack[activeIdx] : viewStack;
    const liveMdl = (activeTriad && activeTriad.mdl) ? activeTriad.mdl : mdl;
    if (!liveMdl) return;

    // Гарантированный самодостаточный налив данных, если модель пуста
    if (!liveMdl.themesList || liveMdl.themesList.length === 0) {
        reduceCollectionInject({ mdl: liveMdl, view: { width: currentW, height: currentH } }, _LOCAL_STATIC_THEMES_RECORDS);
    }

    const w = Math.floor(currentW || 40);
    const h = Math.floor(currentH || 15);
    const titles = liveMdl._globalTabsNamesCached || ["PALETTE"];

    prepareGenericTuiLayout(matrix, w, h, liveMdl, titles, activeIdx, false, slotIdStr, true);
    drawFrameGrid(matrix, w, h, true);

    const vScrollMdl = _gpssEngineState.facilitiesRegistry.get("14")?.mdl;
    const offset = (vScrollMdl && vScrollMdl.viewportOffsetRegistry) 
        ? Math.max(0, Math.floor(vScrollMdl.viewportOffsetRegistry[slotIdStr] || 0)) 
        : 0;

    const themes = liveMdl.themesList || [];
    const total = themes.length;
    const selected = Math.floor(liveMdl.selectedIndex || 0);
    const maxVisibleRows = Math.max(1, h - 4);
    const printCount = Math.min(maxVisibleRows, Math.max(0, total - offset));

    for (let i = 0; i < printCount; i++) {
        const rowLineIdx = 3 + i;
        const row = matrix[rowLineIdx];
        const themeItem = themes[offset + i];

        if (row && themeItem) {
            const isSelected = (offset + i === selected);
            drawThemeItem(row, themeItem, w, isSelected);
        }
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/theme_view.js
 * Время изменения: 11.09.2026 19:50:00 MSK
 */
