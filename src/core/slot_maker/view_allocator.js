/**
 * @file src/core/slot_maker/view_allocator.js
 * @version 1.3.0-RELEASE-SMO-IOC-VIEW-ALLOCATOR-FOCUS-ARMORED
 * @description Абстрактный централизованный аллокатор мономорфных TUI-матриц отображения (Presentation-контур).
 * ИСПРАВЛЕН КРАШ ФOКУСА ВЬЮХИ: В структуру viewState преаллоцирован флаг _isFocused для защиты от лимитов preventExtensions.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

/**
 * Процедурно генерирует анемичный каркас отображения и преаллоцирует суверенный буфер Int32Array знакомест
 * @param {string} componentTypeStr Строковый тип прикладного домена ("taskbar", "explorer", "command" etc.)
 * @param {Object} layoutNode Ссылка на живой, вычисленный в Pass 1 узел дерева топологии разметки
 * @returns {Object} Полностью запечатанный мономорфный вью-пакет Fast Properties для монтажера
 */
export function allocateDomainView(componentTypeStr, layoutNode) {
    if (!layoutNode) return null;

    // Считываем точные физические границы кадра, вычисленные каскадным измерителем в Pass 1
    const targetW = Math.max(2, Math.floor(layoutNode._computedMinW || 120));
    const targetH = Math.max(1, Math.floor(layoutNode._computedMinH || 4));
    const idStr = String(layoutNode.id || "unknown");

    // Выделяем суверенную локальную память под матрицу строк знакомест
    const linesMatrix = new Array(targetH);
    for (let y = 0; y < targetH; y++) {
        linesMatrix[y] = new Int32Array(256); // UHD-запас
    }

    const viewState = {
        width: targetW,
        height: targetH,
        slotId: idStr,
        
        // =================================================================
        // ГВАРД ПРЕДОТВРАЩЕНИЯ КРАША: РЕГИСТР АКТИВНОГО ФОКУСА ТУИ-ВЬЮХИ
        // =================================================================
        _isFocused: false, // Резервируем скрытый класс для in-place мутаций в ctl-контурах панелей
        
        localBuffer: {
            matrix: linesMatrix,
            w: targetW,
            h: targetH
        }
    };

    // Намертво запечатываем структуру Hidden Classes до входа в вычислительный такт (0% OOP)
    Object.preventExtensions(viewState.localBuffer);
    Object.preventExtensions(viewState);
    return viewState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker/view_allocator.js
 * Время изменения: 05.09.2026 21:52:10 MSK
 */
