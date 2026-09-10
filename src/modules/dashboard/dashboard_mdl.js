/**
 * @file src/modules/dashboard/dashboard_mdl.js
 * @version 3.2.0-RELEASE-DOD-PENNER-TWINNING-PREALLOCATED
 * @description Анемичная модель данных Дашборда (PAC / Abstraction-контур).
 * ИСПРАВЛЕН ТВИННИНГ: Преаллоцированы вещественные регистры позиционирования каретки ▲ Роберта Пеннера.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Фабрика аллокации запечатанного мономорфного состояния модели системного дашборда
 * @returns {Object} Запечатанный JS-литерал
 */
export function createDashboardMdlInstance() {
    const mdlState = {
        _ramTotalMb: 16384,
        _ramUsedMb: 0,
        _ramPercent: 0,
        
        _cpuPercent: 0,
        _cpuCores: 1,
        
        totalTransactions: 0,
        _clockPrescaler: 0, 

        // =================================================================
        // РЕГИСТРЫ ТВИННИНГА ИНТЕРПОЛЯЦИИ РОБЕРТА ПЕННЕРА (0% OOP)
        // =================================================================
        _targetTriangleX: 3,   // Целевая абсцисса догона (куда был совершен клик мыши)
        _currentTriangleX: 3,  // Текущая вещественная координата каретки ▲ на линейке

        _isDirty: true
    };

    // Запечатываем форму для TurboFan JIT-оптимизации Fast Properties
    Object.preventExtensions(mdlState);
    return mdlState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/dashboard/dashboard_mdl.js
 * Время исправления: 03.09.2026 14:10:12 MSK
 */
