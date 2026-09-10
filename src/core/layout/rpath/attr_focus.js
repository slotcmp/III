/**
 * @file src/core/layout/rpath/attr_focus.js
 * @version 1.0.0-RELEASE-SMO-DOD-ATTR-FOCUS
 * @description Изолированная DOD-процедура изменения активного фокуса ввода.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

/**
 * Переводит фокус ядра на выбранный слот
 */
export function mutateAttrFocus(app, node, slotNum, value) {
    node.isActiveFocus = value;

    if (value === true && !isNaN(slotNum) && app.model?.logicalState) {
        app.model.logicalState.focusedSlotId = String(slotNum);
    }
}
