/**
 * @file src/system/vscrollbar/vscrollbar_mdl.js
 * @version 1.0.1-RELEASE-SMO-SYS-VSCROLLBAR-MDL-FAST-PROPERTIES
 * @description Системный регистр ОЗУ координат вертикального скролла Window Manager. 
 * Защищен от Dictionary Mode при смешанной адресации.
 */

export function createSystemVScrollbarMdlInstance() {
    const state = {
        componentType: "vscrollbar_mdl",
        
        // Плоские типизированные буферы под геометрию всех скроллбаров всех слотов (Индекс = slotIdNum)
        viewportOffsetRegistry: new Int16Array(256), // С какой строки массива считываем контент
        selectedIndexRegistry:  new Int16Array(256), // Индекс выбранной строки курсором
        totalItemsRegistry:     new Int16Array(256), // Текущее общее число элементов в бизнес-массиве
        maxVisibleRowsRegistry: new Uint8Array(256), // Физическая высота контентной области вьюхи
        
        _isDirty: true
    };
    
    // Намертво запечатываем мономорфный скрытый класс в куче V8
    Object.preventExtensions(state);
    return state;
}
