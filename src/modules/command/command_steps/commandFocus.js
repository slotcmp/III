export function commandFocus(m, v, kernel) {
    if (kernel && kernel.model && kernel.model.logicalState) {
        const isFocusedNow = (String(kernel.model.logicalState.focusedSlotId || "") === "105");
        
        // Дублируем маски флагов во избежание рассинхронизации в смежных редьюсерах
        v._isFocused = isFocusedNow;
        m.isFocused = isFocusedNow;
        m._isFocused = isFocusedNow; // Фиксация для диагностического ОЗУ-сниффера
    }
}