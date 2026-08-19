// 1. Добавьте импорт в верхнюю часть src/io/terminal/blit.js
import { inject_v_slider_raster } from "../../modules/v_slider/v_slider_ctl.js";

export function executeViewportBlit(virtualCanvasState, host, geoMap) {
    if (!virtualCanvasState || !host || !geoMap) return false;

    const rootDisplayNode = synchronizeDisplayTree(virtualCanvasState, host, geoMap);
    if (!rootDisplayNode || !rootDisplayNode.matrix) return false;

    const maxRows = Math.floor(rootDisplayNode.h || 30);
    const maxCols = Math.floor(rootDisplayNode.w || 120);

    // 2. КРИТИЧЕСКИЙ ИНЖЕКТ: Накатываем растр слайдера поверх флекс-карты дерева перед флешем
    inject_v_slider_raster(rootDisplayNode.matrix, maxCols, maxRows);

    // Отправляем модифицированную матрицу в оригинальный рабочий флушер
    flushVirtualCanvasToTty(virtualCanvasState, rootDisplayNode.matrix, maxRows, maxCols);
    return true;
}
