/**
 * @file src/modules/dashboard/dashboard_view.js
 * @version 3.9.1-RELEASE-SMO-DASHBOARD-VIEW-SAFE-MATRIX
 * @description Центральный процедурный отрисовщик TUI-строк Дашборда Слота 101.
 * ИСПРАВЛЕН КРАШ МАТРИЦЫ: Переведен на прямую адресацию аргумента matrix (0% OOP).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp / Zero Allocation.
 */

import { drawDashboardTabs } from "../../core/slot_maker/dashboard_tab_utils.js";
import { drawFrameGrid } from "../../io/terminal/frame_grid_renderer.js";
import { renderRulerContent } from "./ruler_view.js";
import { renderMonitorContent } from "./monitor_view.js";

/**
 * Унифицированная процедура рендеринга контента Дашборда
 */
export function renderContent(matrix, currentW, currentH, mdl, activeTabIdx, slotIdStr, viewStack) {
    // ИСПРАВЛЕНИЕ: Безопасный плоский гвард. Работаем с матрицей напрямую.
    if (!matrix || !mdl) return;

    const w = Math.floor(currentW || 120);
    const h = Math.floor(currentH || 7);
    const tabIdx = Math.max(0, Math.floor(activeTabIdx || 0));

    // 1. Выжигаем плашки табов RULER / MONITOR на строке Y = 1 локального буфера
    const topRowTabs = matrix[1];
    if (topRowTabs && viewStack) {
        // Передаем временный mock объекта facility для совместимости с утилитами
        const facilityMock = { activeStackIdx: tabIdx, viewStack: viewStack };
        drawDashboardTabs(facilityMock, topRowTabs, w);
    }

    // 2. Накатываем фоновую сетку знакомест с защитой желоба скроллбара
    drawFrameGrid(matrix, w, h, true);

    // =================================================================
    // МАРШАЛИНГ СУБ-ПАНЕЛЕЙ В ЗАВИСИМОСТИ ОТ АКТИВНОГО ТАБА (0% GC)
    // =================================================================
    if (tabIdx === 0) {
        // Вкладка 0: Отрисовка шкалы Линейки с Penner-интерполированной кареткой
        renderRulerContent(matrix, w, h, mdl);
    } else if (tabIdx === 1) {
        // Вкладка 1: Отрисовка UHD-прогрессбаров загрузки ресурсов CPU и RAM
        renderMonitorContent(matrix, w, h, mdl);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/dashboard/dashboard_view.js
 * Время исправления: 09.09.2026 14:06:22 MSK
 */
