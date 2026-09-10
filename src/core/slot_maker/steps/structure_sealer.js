/**
 * @file src/core/slot_maker/steps/structure_sealer.js
 * @version 1.0.0-RELEASE-SMO-STEP-STRUCTURE-SEALER
 * @description Безаллокационная процедура окончательной фиксации скрытых классов PAC-триад (0% GC).
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / Zero Allocation / 0% GC.
 */

/**
 * Осуществляет послойную заморозку расширений для всех узлов структуры прибора
 * @param {Object} facility Ссылка на собранный абстрактный паспорт прибора СМО
 */
export function deepSealFacilityStructure(facility) {
    if (!facility) return;
    
    const stack = facility.viewStack;
    if (Array.isArray(stack)) {
        const len = stack.length;
        
        for (let i = 0; i < len; i++) {
            const pack = stack[i];
            if (!pack) continue;
            
            // 1. Запечатывание Abstraction (Модели данных)
            if (pack.mdl) {
                if (Array.isArray(pack.mdl._globalTabsNamesCached) && Object.isExtensible(pack.mdl._globalTabsNamesCached)) {
                    Object.preventExtensions(pack.mdl._globalTabsNamesCached);
                }
                if (Object.isExtensible(pack.mdl)) {
                    Object.preventExtensions(pack.mdl);
                }
            }
            
            // 2. Запечатывание Presentation (Вьюхи и локального буфера растра)
            if (pack.view) {
                if (pack.view.localBuffer) {
                    if (Object.isExtensible(pack.view.localBuffer)) {
                        Object.preventExtensions(pack.view.localBuffer);
                    }
                }
                if (Object.isExtensible(pack.view)) {
                    Object.preventExtensions(pack.view);
                }
            }
            
            // 3. Запечатывание Control (Виртуальной таблицы VTABLE триады)
            if (pack.ctl) {
                if (Object.isExtensible(pack.ctl)) {
                    Object.preventExtensions(pack.ctl);
                }
            }
            
            // 4. Запечатывание самого PAC-узла таба
            if (Object.isExtensible(pack)) {
                Object.preventExtensions(pack);
            }
        }
        
        // Запечатываем сам массив вью-стека
        if (Object.isExtensible(stack)) {
            Object.preventExtensions(stack);
        }
    }
    
    // Запечатываем корневой паспорт прибора СМО
    if (Object.isExtensible(facility)) {
        Object.preventExtensions(facility);
    }
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/core/slot_maker/steps/structure_sealer.js
 * Время изменения: 10.09.2026 18:39:00 MSK
 */
