/**
 * @file src/modules/theme/theme_mdl.js
 * @version 3.0.0-RELEASE-DOD-FORK
 * @description Мономорфная модель Панели Тем (PAC / Abstraction-контур).
 * Хранит плоский массив эталонных цветовых масок для TUI-интерфейса.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% RegExp.
 */

/**
 * Фабрика аллокации запечатанного мономорфного состояния модели тем оформления
 * @returns {Object} Запечатанный объект состояния модели
 */
export function createThemeMdlInstance() {
    const mdlState = {
        _isDirty: false,
        themesList: [
            { id: 0, name: "1. CLASSIC STEEL", borderColorMsk: "gray" },
            { id: 1, name: "2. COBALT OCEAN",  borderColorMsk: "blue" },
            { id: 2, name: "3. AMETHYST NEON", borderColorMsk: "purple" },
            { id: 3, name: "4. MATRIX OLIVE",  borderColorMsk: "olive" },
            { id: 4, name: "5. DEEP CRIMSON",  borderColorMsk: "maroon" },
            { id: 5, name: "6. MIDNIGHT NAVY", borderColorMsk: "navy" }
        ],
        totalThemes: 6,
        selectedIndex: 0
    };

    const len = mdlState.themesList.length;
    for (let i = 0; i < len; i++) {
        Object.preventExtensions(mdlState.themesList[i]);
    }

    Object.preventExtensions(mdlState);
    return mdlState;
}

/** 
 * ПАСПОРТ ЛИСТИНГА:
 * Путь: src/modules/theme/theme_mdl.js
 * Время модификации: 18.08.2026 18:05:10 MSK
 */
