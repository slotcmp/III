/**
 * @file src/modules/dashboard/dashboard_view.js
 * @version 3.0.1-RELEASE-SMO-DASHBOARD-VIEW-RESOLVED
 * @description Пассивное TUI-представление Дашборда (Presentation-контур).
 * ИСПРАВЛЕН РОУТИНГ: Адаптирован как каноничный шлюз для интеграции со сборщиком tree_builder.js.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { renderRulerContent } from "./ruler_view.js";
import { renderMonitorContent } from "./monitor_view.js";

/**
 * Фабрика выделения локального запечатанного TUI-буфера отображения дашборда
 * @param {string} slotIdStr Идентификатор целевой панели
 * @returns {Object} Запечатанная мономорфная структура представления
 */
export function createDashboardViewInstance(slotIdStr) {
    const viewState = {
        slotId: String(slotIdStr || "101"),
        width: 120,
        height: 5,
        _subViewTypeStr: "monitor", // По умолчанию запускаем прогретый график-монитор
        localBuffer: { matrix: null }
    };

    const m = new Array(64);
    for (let y = 0; y < 64; y++) {
        m[y] = new Array(512);
        for (let x = 0; x < 512; x++) {
            m[y][x] = { char: " ", fg: "\x1b[37m", bg: "\x1b[40m" };
            Object.preventExtensions(m[y][x]);
        }
        Object.preventExtensions(m[y]);
    }
    
    viewState.localBuffer.matrix = m;
    Object.preventExtensions(viewState.localBuffer);
    Object.preventExtensions(viewState);
    return viewState;
}

/**
 * Синхронный клининг буфера и каскадный вызов под-вкладок мониторинга ресурсов ядра
 * @param {Object} view Ссылка на буфер отображения прибора
 * @param {Object} mdl Ссылка на плоскую модель данных дашборда
 */
export function renderDashboardContent(view, mdl) {
    if (!view || !mdl || !view.localBuffer.matrix) return;

    const m = view.localBuffer.matrix;
    const currentW = Math.max(1, Math.floor(view.width || 120));
    const currentH = Math.max(1, Math.floor(view.height || 5));

    // Очищаем внутреннее ОЗУ-зеркало Дашборда строго внутри полезных контурных швов
    for (let y = 1; y < currentH - 1; y++) {
        const row = m[y];
        if (!row) continue;
        for (let x = 1; x < currentW - 1; x++) {
            row[x].char = " "; 
            row[x].fg = "\x1b[37m"; 
            row[x].bg = "\x1b[40m";
        }
    }

    // ДЕТЕРМИНИРОВАННЫЙ РОУТИНГ СУБ-ВКЛАДОК ДАШБОРДА
    // Внутренние отрисовщики принимают смещенную UHD-матрицу для защиты рамок от перетирания
    if (view._subViewTypeStr === "monitor") {
        if (typeof renderMonitorContent === "function") {
            renderMonitorContent(m, currentW, currentH, mdl);
        }
    } else {
        if (typeof renderRulerContent === "function") {
            renderRulerContent(m, currentW, currentH, mdl);
        }
    }
}
