/**
 * @file src/core/slot_maker/dashboard_tab_utils.js
 * @version 1.0.0-RELEASE-SMO-IOC-DASHBOARD-TAB-UTILS
 * @description Безаллокационный выжигатель вкладок Дашборда Слота 101 в Int32Array буфер кадра.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { packCellBits } from "../../io/terminal/sprite_blit.js";

/**
 * Выжигает плашки RULER и MONITOR строго на строке Y = 1
 */
export function drawDashboardTabs(facility, tabRowInt32Array, currentW) {
    if (!facility || !tabRowInt32Array || !facility.viewStack) return;

    const tabsArray = facility.viewStack;
    const activeTabIdx = Math.max(0, Math.floor(facility.activeStackIdx || 0));
    
    const activePack = tabsArray[activeTabIdx];
    const singleMdl = activePack ? activePack.mdl : null;
    if (!singleMdl) return;

    const maxCols = Math.max(1, Math.floor(currentW || 120));
    const currentZone = Math.floor(singleMdl._activeSubZone ?? 0);
    const defBg = "\x1b[48;5;236m";

    // 1. ПЛАШКА ВКЛАДКИ RULER (activeTabIdx === 0)
    const isRuler = (activeTabIdx === 0);
    const rLabel = " RULER ";
    let rFg = isRuler ? "\x1b[38;5;16m" : "\x1b[38;5;246m";
    let rBg = isRuler ? (currentZone === 1 ? "\x1b[48;5;220m" : "\x1b[48;5;51m") : defBg;

    singleMdl._tabStartX = 2;
    for (let i = 0; i < rLabel.length; i++) {
        if (2 + i < maxCols - 1) {
            tabRowInt32Array[2 + i] = packCellBits(rLabel.charAt(i), rFg, rBg);
        }
    }

    // 2. ПЛАШКА ВКЛАДКИ MONITOR (activeTabIdx === 1)
    const isMonitor = (activeTabIdx === 1);
    const mLabel = " MONITOR ";
    const mStartX = 2 + rLabel.length + 1;
    let mFg = isMonitor ? "\x1b[38;5;16m" : "\x1b[38;5;246m";
    let mBg = isMonitor ? (currentZone === 1 ? "\x1b[48;5;220m" : "\x1b[48;5;51m") : defBg;

    for (let i = 0; i < mLabel.length; i++) {
        if (mStartX + i < maxCols - 1) {
            tabRowInt32Array[mStartX + i] = packCellBits(mLabel.charAt(i), mFg, mBg);
        }
    }
    
    // Запечатываем конец общей зоны вкладок Дашборда в ОЗУ для Канала 12
    singleMdl._tabEndX = mStartX + mLabel.length;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker/dashboard_tab_utils.js
 * Время создания: 03.09.2026 13:37:25 MSK
 */
