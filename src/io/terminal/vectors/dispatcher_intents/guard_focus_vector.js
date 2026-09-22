/**
 * @file src/io/terminal/vectors/dispatcher_intents/guard_focus_vector.js
 * @version 1.0.0-RELEASE-SMO-DOD-GUARD-FOCUS-VECTOR
 * @description Вынесенный редьюсер O(1) защиты служебных каналов 108/104 от паразитного символьного ввода.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

/**
 * Проверяет идентификатор текущего фокус-слота и осуществляет принудительный сброс на CLI
 * @param {string} rawFocusedId Текущий считанный focusedSlotId из логического состояния ядра
 * @returns {string} Выровненный и безопасный идентификатор целевого прибора
 */
export function guardSystemFacilitiesFocus(rawFocusedId) {
    const focusedStr = String(rawFocusedId || "105");

    // Если фокус удерживается служебным Логгером (108) или FnBar (104) — 
    // одной ассемблерной операцией перенаправляем ввод на дефолтный CLI Слот 105
    if (focusedStr === "108" || focusedStr === "104") {
        return "105";
    }

    return focusedStr;
}
