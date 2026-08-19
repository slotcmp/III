/**
 * @file src/io/terminal/tty_mouse_parser.js
 * @version 3.0.0-RELEASE-SMO-MOUSE-PARSER-REACTIVE
 * @description Координатный хит-тест и распределитель мышиных прерываний (PAC / Control-контур).
 * Вычисляет клики по флекс-сетке панелей и вкладкам T1..T4, переключая фокус через СМО-транзакты.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

import { generateGpssTransaction } from "../../core/smo/bus.js";
import { forceInvalidateShadowCanvas } from "./flusher.js";

/**
 * Прогоняет абсолютные координаты клика мыши через гео-карту ОЗУ и генерирует СМО-прерывания фокуса
 * @param {number} btn Код кнопки мыши (0 - левая, 32 - перемещение с зажатой левой)
 * @param {number} mX Абсолютная координата X терминала (1..cols)
 * @param {number} mY Абсолютная координата Y терминала (1..rows)
 * @param {boolean} isRelease Флаг отпускания кнопки мыши (true, если маркер 'm')
 * @param {any} staticSlots Игнорируемый параметр обратной совместимости
 * @param {Object} kernel Ссылка на ОЗУ-рантайм хоста ядра
 */
export function parseAndDispatchSgr(btn, mX, mY, isRelease, staticSlots, kernel) {
    // Обрабатываем только нажатие левой кнопки мыши (код 0 или 32 при драге), отпускание игнорируем
    if (isRelease || (btn !== 0 && btn !== 32) || !kernel || !kernel.calculatedGeoMap) return;

    const geoMap = kernel.calculatedGeoMap;
    const slotKeys = Object.keys(geoMap);
    
    let targetSlotIdStr = "";
    let matchedGeo = null;

    // 1. АППАРАТНЫЙ ХИТ-ТЕСТ: Ищем, в границы какой панели попал клик (с учетом 1-индексации терминала)
    for (let i = 0; i < slotKeys.length; i++) {
        const slotId = slotKeys[i];
        if (slotId === "root") continue; // Пропускаем корень мета-сетки

        const geo = geoMap[slotId];
        if (!geo) continue;

        // Переводим 0-индексированную геометрию ОЗУ в 1-индексированные координаты мыши ConPTY
        const xMin = geo.x + 1;
        const xMax = geo.x + geo.w;
        const yMin = geo.y + 1;
        const yMax = geo.y + geo.h;

        if (mX >= xMin && mX <= xMax && mY >= yMin && mY <= yMax) {
            targetSlotIdStr = slotId;
            matchedGeo = geo;
            break; // Целевая панель найдена, останавливаем проход по массиву
        }
    }

    if (targetSlotIdStr.length === 0 || !matchedGeo) return;

    let isStateMutated = false;

    // 2. РЕАКТИВНОЕ ПЕРЕКЛЮЧЕНИЕ ФОКУСА СЛОТА
    if (kernel.model?.logicalState?.focusedSlotId !== targetSlotIdStr) {
        kernel.model.logicalState.focusedSlotId = targetSlotIdStr;
        isStateMutated = true;
    }

    // 3. МАТЕМАТИЧЕСКИЙ ХИТ-ТЕСТ ВКЛАДКИ (Если кликнули на верхнюю линию панели)
    const localY = mY - matchedGeo.y; // 1-индексированная локальная строка внутри окна
    if (localY === 1 && (targetSlotIdStr === "102" || targetSlotIdStr === "103")) {
        const localX = mX - matchedGeo.x; // 1-индексированный локальный столбец

        // Каждая вкладка " T1 ", " T2 " занимает ровно 4 знакоместа плюс 1 пробел разделителя = 5 чар
        // Вьюха начинает рендер вкладок с локального X = 3 (с учетом рамки)
        if (localX >= 3) {
            const clickedTabIdx = Math.floor((localX - 3) / 5);
            
            if (clickedTabIdx >= 0 && clickedTabIdx <= 3) {
                const facility = kernel.model?.logicalState?.panelRegistry?.[targetSlotIdStr];
                
                // Если кликнули на новую вкладку — переключаем активный индекс вкладочной карусели
                if (facility && facility.activeStackIdx !== clickedTabIdx) {
                    // Генерируем транзакт ротации стека в целевой Проводник на следующий такт СМО
                    generateGpssTransaction(targetSlotIdStr, "ROTATE_SLOT_STACK", null);
                    
                    // Вручную корректируем индекс для немедленного визуального отклика рендерера
                    facility.activeStackIdx = clickedTabIdx;
                    isStateMutated = true;
                }
            }
        }
    }

    // 4. ПЕРЕДАЧА ИМПУЛЬСА МЫШИ В ВНУТРЕННИЙ PAC-КОНТРОЛЛЕР СЛОТА
    // Отправляем транзакт MOUSE_CLICK, чтобы контроллер (например, проводник) выделил строку под курсором мыши
    const mousePayload = { localX: mX - matchedGeo.x, localY: mY - matchedGeo.y };
    Object.preventExtensions(mousePayload);
    generateGpssTransaction(targetSlotIdStr, "MOUSE_CLICK", mousePayload);

    // 5. ФИНАЛИЗАЦИЯ ИМПУЛЬСА: Если фокус или вкладка мутировали — взрываем рендер кадра!
    if (isStateMutated === true) {
        if (typeof forceInvalidateShadowCanvas === "function") {
            forceInvalidateShadowCanvas(); // Сбрасываем кэш, чтобы рамка изменила цвет
        }
        generateGpssTransaction("1", "EXECUTE_RENDER", null);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/io/terminal/tty_mouse_parser.js
 * Время модификации: 19.08.2026 00:32:00 MSK
 */
