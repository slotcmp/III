/**
 * @file src/core/slot_maker/mdl_allocator.js
 * @version 1.0.8-RELEASE-SMO-IOC-MDL-ALLOCATOR-FOCUS-FIXED
 * @description Изолированная DOD-процедура преаллокации регистров памяти для моделей.
 * ИСПРАВЛЕН КРАШ ФOКУСА: В базовую форму внедрен преаллоцированный регистр фокуса _isFocused.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Генерирует плоскую структуру ОЗУ-параметров для прикладной модели панели
 */
export function allocateDomainMdl(componentTypeStr, initialPathStr = "C:/") {
    const type = String(componentTypeStr || "").trim();
    const contentStartY = (type === "command") ? 1 : 3;

    // Преаллоцируем фиксированный буфер под 16 интерактивных иконок для таскбара, защищая Hidden Class
    const tracksRegistry = new Array(16);
    for (let i = 0; i < 16; i++) {
        tracksRegistry[i] = {
            startX: 0,
            endX: 0,
            targetSlotId: ""
        };
        Object.preventExtensions(tracksRegistry[i]);
    }

    const baseMdl = {
        _isDirty: true, itemsList: [], lines: [], buffer: "", cursor: 0, textLength: 0, cursorX: 0,
        currentDirectoryPath: String(initialPathStr),
        _subViewTypeStr: "monitor", 
        _activeSubZone: 1, 
        _tabLineY: 1, 
        _contentStartY: contentStartY, 
        _cpuPercent: 35, _ramPercent: 48, _ramUsedMb: 7864, _ramTotalMb: 16384, _cpuCores: 8, totalTransactions: 0,
        _activeThemeId: 0,
        
        themesList: [],
        totalThemes: 0,
        
        _localTabTitle: "TAB",
        _globalTabsNamesCached: [], 
        _tabStartX: 0,
        _tabEndX: 0,
        
        _clockPrescaler: 0, 
        _targetTriangleX: 3,
        _currentTriangleX: 3,
        
        selectedIndex: 0, maxLines: 128, logsArray: [], totalLogsCount: 0, viewportOffset: 0,
        charBuffer: new Array(256),

        historyBuffer: null, 
        historyCount: 0,
        historyCursor: 0,
        stashBuffer: "",     

        _tabCompletionActive: false,
        _matchEntriesArray: new Array(64), 
        _matchCount: 0,
        _matchCurrentIdx: 0,
        _completionBaseLen: 0,

        _clickTracksRegistry: tracksRegistry,
        _tracksCount: 0,

        // =================================================================
        // ГВАРД ПРЕДОТВРАЩЕНИЯ КРАША: РЕГИСТР АКТИВНОГО СМО-ФОКУСА ОКНА
        // =================================================================
        _isFocused: false // Преаллоцируем флаг фокуса для прохождения preventExtensions в ctl-контурах
    };

    // Предварительное зануление и гидратация массивов Fast Properties
    for (let k = 0; k < 256; k++) baseMdl.charBuffer[k] = " ";
    for (let i = 0; i < 64; i++) baseMdl._matchEntriesArray[i] = "";
    
    if (type === "logger") { 
        for (let i = 0; i < 128; i++) baseMdl.logsArray.push(""); 
    }
    
    if (type === "theme") {
        const themesJsonPath = path.resolve(__dirname, "../../../config/themes.json");
        if (fs.existsSync(themesJsonPath)) {
            const rawData = JSON.parse(fs.readFileSync(themesJsonPath, "utf8").trim());
            const themesCount = rawData.length;
            
            const isolatedThemesArray = new Array(themesCount);
            for (let i = 0; i < themesCount; i++) {
                const srcItem = rawData[i];
                if (srcItem) {
                    const isolatedItem = {
                        name: String(srcItem.name || srcItem.themeName || ""),
                        borderColorMsk: String(srcItem.borderColorMsk || "gray"),
                        passiveColorMsk: String(srcItem.passiveColorMsk || "darkgray"),
                        _clockPrescaler: 0,
                        _targetTriangleX: 3,
                        _currentTriangleX: 3
                    };
                    isolatedThemesArray[i] = isolatedItem;
                }
            }
            baseMdl.themesList = isolatedThemesArray;
            baseMdl.totalThemes = themesCount;
        }
    }
    
    return baseMdl;
}
