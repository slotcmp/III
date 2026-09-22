import fs from 'node:fs';

// 1. РЕВИЗИЯ src/core/smo/intent_registry.js (Каноническая VTABLE мутаций)
const registryCode = `/**
 * @file src/core/smo/intent_registry.js
 * @version 1.1.0-RELEASE-SMO-INTENT-REGISTRY-MUTATE-STANDARD
 * @description Центральный реестр контрактов, семантических масок и валидации интентов СМО.
 */

export const MUTATE = {
    INJECT: "INJECT", 
    SCROLL: "SCROLL", 
    SELECT: "SELECT", 
    STEP:   "STEP",   
    NO_OP:  "NO_OP"    
};
Object.freeze(MUTATE);

export const INTENT_DICTIONARY = {
    "INJECT_VFS_DATA":        { dataType: "COLLECTION", mutationType: MUTATE.INJECT, targets: ["102", "103"] },
    "SWITCH_SLOT_TAB":        { dataType: "POINTER",    mutationType: MUTATE.STEP,   targets: ["102", "103"] },
    "TAB_CLICKED":            { dataType: "POINTER",    mutationType: MUTATE.STEP,   targets: ["102", "103"] },
    "UPDATE_THEME_MASK":      { dataType: "COLLECTION", mutationType: MUTATE.INJECT, targets: ["106"] },
    "MOVE_CURSOR_DOWN":       { dataType: "POINTER",    mutationType: MUTATE.STEP,   targets: ["106"] },
    "MOVE_CURSOR_UP":         { dataType: "POINTER",    mutationType: MUTATE.STEP,   targets: ["106"] },
    "SCROLL_CONTENT_DOWN":    { dataType: "POINTER",    mutationType: MUTATE.STEP,   targets: ["106"] },
    "SCROLL_CONTENT_UP":      { dataType: "POINTER",    mutationType: MUTATE.STEP,   targets: ["106"] },
    "SYNC_SCROLLBAR_METRICS": { dataType: "POINTER",    mutationType: MUTATE.NO_OP,  targets: ["14"] },
    "NOTIFY_SCROLL_MUTATED":   { dataType: "POINTER",    mutationType: MUTATE.SCROLL, targets: ["102", "103", "106", "108"] },
    "MOUSE_CLICK":            { dataType: "POINTER",    mutationType: MUTATE.SELECT, targets: ["102", "103", "106", "108", "100"] },
    "BOOT_LAYOUT_TREE":       { dataType: "SYSTEM",     mutationType: MUTATE.NO_OP,  targets: ["11"] },
    "RELOAD_LAYOUT":          { dataType: "SYSTEM",     mutationType: MUTATE.NO_OP,  targets: ["11"] },
    "LOAD_SEQUENCE_COMPLETED": { dataType: "SYSTEM",     mutationType: MUTATE.NO_OP,  targets: ["*"] }, 
    "GLOBAL_THEME_CHANGED":   { dataType: "SYSTEM",     mutationType: MUTATE.NO_OP,  targets: ["*"] }  
};
Object.freeze(INTENT_DICTIONARY);

export function validateTransactionIntent(intentStr, targetSlotIdStr) {
    const intentKey = String(intentStr || "");
    const slotKey = String(targetSlotIdStr || "0");
    const contract = INTENT_DICTIONARY[intentKey];
    
    if (!contract) {
        console.error(\`\\n❌ [IDD_VALIDATION_FATAL] НЕЗАРЕГИСТРИРОВАННЫЙ ИНТЕНТ: "\${intentKey}"\`);
        process.exit(1);
    }
    if (!contract.targets.includes("*") && !contract.targets.includes(slotKey)) {
        console.error(\`\\n❌ [IDD_ROUTING_FATAL] КАНАЛ СМО \${slotKey} НЕ ИМЕЕТ КОНТРАКТА НА ИНТЕНТ "\${intentKey}"\`);
        process.exit(1);
    }
    return true;
}
`;

// 2. РЕВИЗИЯ src/modules/theme/theme_view.js (Чистый пассивный PULL-отрисовщик кадра)
const viewCode = `/**
 * @file src/modules/theme/theme_view.js
 * @version 3.4.2-RELEASE-SMO-THEME-VIEW-MEMORY-ALIGNED
 * @description Пассивный процедурный отрисовщик TUI-строк палитр Слота 106.
 */
import { prepareGenericTuiLayout } from "../../io/terminal/generic_tui_layout.js";
import { drawFrameGrid } from "../../io/terminal/frame_grid_renderer.js";
import { drawThemeItem } from "./theme_item_renderer.js";
import { _gpssEngineState } from "../../core/smo/bus.js";

export function renderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack) {
    if (!matrix) return;

    const activeIdx = Math.max(0, Math.floor(activeTabIdx || 0));
    const activeTriad = Array.isArray(viewStack) ? viewStack[activeIdx] : viewStack;
    const liveMdl = (activeTriad && activeTriad.mdl) ? activeTriad.mdl : mdl;
    if (!liveMdl) return;

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
`;

fs.mkdirSync('src/core/smo', { recursive: true });
fs.writeFileSync('src/core/smo/intent_registry.js', registryCode, 'utf8');
fs.writeFileSync('src/modules/theme/theme_view.js', viewCode, 'utf8');
console.log('✅ Чистые рабочие ревизии развернуты на диске!');
