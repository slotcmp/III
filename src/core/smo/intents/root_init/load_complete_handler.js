/**
 * @file src/core/smo/intents/init/load_complete_handler.js
 * @version 1.0.0-RELEASE-SMO-IDD-LOAD-COMPLETE-HANDLER
 * @description Изолированная DOD-процедура финализации IoC-загрузки (Канал 0).
 * Выполнен в строгой парадигме PAC / DOD / IDD / Zero Allocation / 0% GC.
 */

import { generateGpssTransaction } from "../../bus.js";

/**
 * Переводит рантайм в активный TUI-режим и зажигает стартовую рамку CLI
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 * @returns {boolean} Флаг успешности совершения мутации
 */
export function reduceLoadSequenceCompleted(kernel) {
    if (!kernel) return false;

    if (kernel.virtualCanvasState) {
        // Принудительно взводим флаг грязи UHD-холста для первого blit-кадра
        kernel.virtualCanvasState.isDirty = true;
    }

    // =================================================================
    // ВНЕДРЕНИЕ СТАРТОВОГО ИНТЕНТА ФОКУСА ПО МЕТОДОЛОГИИ IDD
    // =================================================================
    // Вместо хардкода, цивилизованно шлем намерение на Канал 0.
    // Теперь при холодном пуске рамка CLI (105) гарантированно загорится активным цветом!
    generateGpssTransaction("0", "SET_SLOT_FOCUS", { targetSlotId: "105" }, "11");

    // Выстреливаем стартовый импульс выжига сетки знакомест Window Manager
    generateGpssTransaction("1", "EXECUTE_RENDER", null, "0");
    return true;
}
