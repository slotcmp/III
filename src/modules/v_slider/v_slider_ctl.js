/**
 * @file src/core/smo/vscrollbar_ctl.js
 * @version 1.1.0-RELEASE-SMO-VSCROLLBAR-CTL-DYNAMIC
 * @description Системный СМО-контроллер Канала 14 обслуживания вертикальных скроллбаров.
 * ИСПРАВЛЕН СКРОЛЛ: Внедрен адаптивный импорт лимитов контента для логгера и проводников.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction, _gpssEngineState } from "./bus.js";

/**
 * Главный контур продвижения интентов прокрутки Канала 14
 */
export function processVerticalScrollLogic(facilityState, intentStr, contextPayload, currentTx) {
    if (!contextPayload || !facilityState) return false;

    const m = facilityState.mdl;
    if (!m) return false;

    const intent = String(intentStr || "");
    const targetSlotIdStr = String(contextPayload.targetSlotId || "");
    const slotIdNum = parseInt(targetSlotIdStr, 10) & 255;
    if (slotIdNum === 0) return false;

    // Считываем живой прибор-адресат прокрутки из реестра СМО
    const targetFacility = _gpssEngineState.facilitiesRegistry.get(targetSlotIdStr);
    if (!targetFacility || !Array.isArray(targetFacility.viewStack)) return false;

    const activeIdx = Math.max(0, Math.floor(targetFacility.activeStackIdx || 0));
    const activeMdl = targetFacility.viewStack[activeIdx]?.mdl;
    const activeView = targetFacility.viewStack[activeIdx]?.view;
    if (!activeMdl || !activeView) return false;

    // =================================================================
    // АДАПТИВНЫЙ ИМПОРТ ЛИМИТOВ КОНТЕНТА ИЗ ЖИВЫХ МОДЕЛЕЙ (0% GC)
    // =================================================================
    let totalItems = 1;

    if (targetSlotIdStr === "108") {
        // Слот 108 (Системный Логгер): берем живой счетчик строк напрямую из его модели
        totalItems = Math.max(1, Math.floor(activeMdl.totalLogsCount || 0));
    } else if (targetSlotIdStr === "102" || targetSlotIdStr === "103") {
        // Слоты 102/103 (Проводники VFS): динамически вычисляем емкость по длине itemsList
        totalItems = Math.max(1, Array.isArray(activeMdl.itemsList) ? activeMdl.itemsList.length : 0);
    } else if (targetSlotIdStr === "106") {
        // Слот 106 (Панель Тем): извлекаем полный размер загруженного JSON
        totalItems = Math.max(1, Math.floor(activeMdl.totalThemes || 0));
    } else {
        // Резервный дефолтный регистр Канала 14
        totalItems = Math.max(1, Math.floor(m.totalItemsRegistry[slotIdNum] || 1));
    }

    const currentOffset = Math.floor(m.viewportOffsetRegistry[slotIdNum] || 0);
    const viewHeight = Math.max(1, Math.floor(activeView.height || 5));
    const maxVisibleLines = Math.max(1, viewHeight - 4); // Исключаем рамки и табы

    let nextOffset = currentOffset;

    if (intent === "SCROLL_CONTENT_UP") {
        nextOffset = currentOffset - 1;
    } 
    else if (intent === "SCROLL_CONTENT_DOWN") {
        nextOffset = currentOffset + 1;
    }

    // Жесткий математический гвард границ скроллинга
    const maxAllowedOffset = Math.max(0, totalItems - maxVisibleLines);
    if (nextOffset < 0) nextOffset = 0;
    if (nextOffset > maxAllowedOffset) nextOffset = maxAllowedOffset;

    // Фиксируем мутацию в ОЗУ-регистрах Канала 14 и синхронизируем с прикладной моделью
    if (nextOffset !== currentOffset) {
        m.viewportOffsetRegistry[slotIdNum] = nextOffset;
        activeMdl.viewportOffset = nextOffset;
        activeMdl._isDirty = true;

        const kernel = _gpssEngineState.runtime;
        if (kernel) {
            if (kernel.virtualCanvasState) kernel.virtualCanvasState.isDirty = true;
        }

        // Выстреливаем такты на перерисовку TUI-кадра
        generateGpssTransaction("1", "EXECUTE_RENDER", null, "14");
        return true;
    }

    return false;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/vscrollbar_ctl.js
 * Время изменения: 09.09.2026 16:17:00 MSK
 */
