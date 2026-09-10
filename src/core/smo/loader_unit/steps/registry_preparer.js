/**
 * @file src/core/smo/loader_unit/steps/registry_preparer.js
 * @version 1.0.0-RELEASE-SMO-STEP-REGISTRY-PREPARER
 * @description Безаллокационная процедура преаллокации и запечатывания бланков ОЗУ-структур окон.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

/**
 * Инициализирует и запечатывает пустую структуру прибора в реестре панелей ядра хоста
 * @param {Object} kernel Ссылка на ОЗУ-рантайм ядра хоста
 * @param {string} id Идентификатор физического слота (например, "102")
 * @param {string} comp Имя домена компонента (например, "explorer")
 * @param {number} dIdx Порядковый индекс отображения слоя
 * @param {number} initialActiveIdx Стартовый активный индекс таба
 */
export function prepareRegistryBlank(kernel, id, comp, dIdx, initialActiveIdx) {
    if (!kernel || !kernel.model || !kernel.model.logicalState) return;

    const registry = kernel.model.logicalState.panelRegistry;
    if (registry && !registry[id]) {
        // Формируем жестко типизированный пустой паспорт-бланк
        const blankStruct = {
            slotId: id, 
            componentType: comp, 
            displayIndex: dIdx, 
            activeStackIdx: initialActiveIdx, 
            viewStack: null, 
            advanceFacility: null,
            view: null,
            mdl: null
        };
        
        // Намертво блокируем расширение свойств скрытого класса
        Object.preventExtensions(blankStruct);
        registry[id] = blankStruct;
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/smo/loader_unit/steps/registry_preparer.js
 * Время изменения: 10.09.2026 19:47:05 MSK
 */
