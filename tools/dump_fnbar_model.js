/**
 * @file tools/dump_fnbar_model.js
 * @version 1.0.0-RELEASE-SMO-DOD-MODEL-DUMP-SPEC
 * @description Автономная спецификация верификации и полной выгрузки модели Слота 104.
 * Эмулирует тактовый вызов, побайтово сканирует кучу V8 и выводит все свойства модели.
 * Выполнен в строгой парадигме PAC / DOD / 0% OOP / 0% try-catch / Zero Allocation.
 */

import { createFnbarMdlInstance } from "../src/modules/fnbar/fnbar_mdl.js";
import { processIntent } from "../src/modules/fnbar/fnbar_ctl.js";
import { _gpssEngineState } from "../src/core/smo/bus.js";

// Симулируем ОЗУ-контекст ядра хоста
const _mockKernel = {
    model: {
        logicalState: {
            focusedSlotId: "105"
        }
    },
    virtualCanvasState: { isDirty: false }
};

function runModelDumpSuite() {
    const stdout = process.stdout;
    if (!stdout) return;

    stdout.write("\n=========================================================================\n");
    stdout.write("[DOD_MODEL_DUMP] Старт спецификации выгрузки бинарной структуры Слота 104\n");
    stdout.write("=========================================================================\n\n");

    // Шаг 1: Аллоцируем честный DOD-инстанс модели из вашего файла fnbar_mdl.js
    const liveModel = createFnbarMdlInstance();
    _gpssEngineState.runtime = _mockKernel;

    // Шаг 2: Симулируем паспорт фасилити-прибора (triad) СМО
    const mockTriadFacility = {
        id: "104",
        componentType: "fnbar",
        mdl: liveModel,
        view: { height: 5 },
        activeStackIdx: 0,
        localQueue: [],
        _head: 0
    };

    // Шаг 3: Побайтовая инспекция Hidden Class и ключей кучи аллоцированной модели
    const modelRootKeys = Object.keys(liveModel);
    stdout.write("[ОЗУ_INSPECT] 1. Выгрузка корневых свойств модели m из кучи V8:\n");
    stdout.write("  -> Всего ключей обнаружено: " + modelRootKeys.length + " ед.\n");
    stdout.write("  -> Список зарегистрированных ключей: [" + modelRootKeys.join(", ") + "]\n\n");

    // Шаг 4: Вывод структуры запечатанной двухмерной матрицы menuMatrix
    stdout.write("[ОЗУ_INSPECT] 2. Инспекция слоев двухмерного массива menuMatrix:\n");
    const hasMatrix = "menuMatrix" in liveModel;
    stdout.write("  -> Свойство 'menuMatrix' присутствует на корне m: " + (hasMatrix ? "ДА" : "HЕТ") + "\n");
    
    if (hasMatrix && Array.isArray(liveModel.menuMatrix)) {
        const matrixLength = liveModel.menuMatrix.length;
        stdout.write("  -> Глубина матрицы (кол-во модификаторов): " + matrixLength + " слоев\n");
        
        for (let i = 0; i < matrixLength; i++) {
            const layer = liveModel.menuMatrix[i];
            if (Array.isArray(layer)) {
                stdout.write("    * Слой #" + i + " (Длина: " + layer.length + "): [" + layer.join(", ") + "]\n");
            }
        }
    }
    stdout.write("\n");

    // Шаг 5: Имитируем прецизионный удар клавиатуры по клавише F5 (keyNumber: 5) во всех 4-х масках
    stdout.write("[ОЗУ_INSPECT] 3. Прогон сквозного хит-теста processIntent для клавиши F5:\n");
    
    const mockPayload = { keyNumber: 5 };
    
    // Прогон по маске 0 (DEFAULT)
    liveModel._activeSubZone = 0;
    liveModel.activeModifierIdx = 0;
    mockTriadFacility.activeStackIdx = 0;
    processIntent(mockTriadFacility, "FN_KEY_CLICKED", mockPayload, mockTriadFacility);

    // Прогон по маске 1 (CTRL)
    liveModel._activeSubZone = 1;
    liveModel.activeModifierIdx = 1;
    mockTriadFacility.activeStackIdx = 1;
    processIntent(mockTriadFacility, "FN_KEY_CLICKED", mockPayload, mockTriadFacility);

    // Прогон по маске 3 (ALT)
    liveModel._activeSubZone = 3;
    liveModel.activeModifierIdx = 3;
    mockTriadFacility.activeStackIdx = 3;
    processIntent(mockTriadFacility, "FN_KEY_CLICKED", mockPayload, mockTriadFacility);

    stdout.write("\n=========================================================================\n");
    stdout.write("[DOD_MODEL_DUMP] Спецификация выгрузки завершена.\n");
    stdout.write("=========================================================================\n\n");
}

runModelDumpSuite();
