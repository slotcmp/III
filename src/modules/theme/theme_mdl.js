/**
 * @file src/modules/theme/theme_mdl.js
 * @version 3.1.1-RELEASE-SMO-THEME-MODEL-JSON-COMPLIANT
 * @description Мономорфная анемичная модель Панели Тем. Изъяты GC-литералы для соблюдения парадигмы Zero Allocation.
 * ИСПРАВЛЕНА СТАТИЧЕСКАЯ АЛЛОКАЦИЯ: Массив очищен, гидратация полностью делегирована ядру хоста.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

export function createThemeMdlInstance() {
    const mdlState = {
        _isDirty: true,
        // Плоские регистры инициализируются пустыми для последующего O(1) инлейн-налива из VFS/JSON
        themesList: [],
        totalThemes: 0,
        selectedIndex: 0,
        
        // Преаллоцированные DOD-координаты интерактивной подзоны клика
        _tabStartX: 0,
        _tabEndX: 0
    };

    // Жестко фиксируем форму скрытого класса для рантайма V8 TurboFan
    Object.preventExtensions(mdlState);
    return mdlState;
}
