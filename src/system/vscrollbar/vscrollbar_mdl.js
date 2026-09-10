/**
 * @file src/system/vscrollbar/vscrollbar_mdl.js
 * @version 1.0.0-RELEASE-SMO-SYS-VSCROLLBAR-MDL
 * @description Системный регистр ОЗУ координат вертикального скролла Window Manager (Infrastructure).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation.
 */

export function createSystemVScrollbarMdlInstance() {
    const state = {
        // Плоские типизированные буферы под геометрию всех скроллбаров всех слотов (Индекс = slotIdNum)
        viewportOffsetRegistry: new Int16Array(256), // С какой строки массива считываем контент
        selectedIndexRegistry:  new Int16Array(256), // Индекс выбранной строки курсором
        totalItemsRegistry:     new Int16Array(256), // Текущее общее число элементов в бизнес-массиве
        maxVisibleRowsRegistry: new Uint8Array(256)  // Физическая высота контентной области вьюхи
    };
    Object.preventExtensions(state);
    return state;
}
