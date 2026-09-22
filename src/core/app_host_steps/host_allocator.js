/**
 * @file src/core/app_host_steps/host_allocator.js
 * @version 1.0.0-RELEASE-SMO-HOST-ALLOCATOR
 * @description Выделение Fast Properties памяти под каркас ядра и UHD-матрицу.
 */
import { preallocateVirtualDisplayMatrix } from "../app_host_canvas.js";

export function hostAllocator() {
    const hostState = {
        width: 120,
        height: 30,
        layoutTopologyTree: null,
        calculatedGeoMap: Object.create(null),
        workerGateway: null,
        
        virtualCanvasState: {
            isDirty: true,
            virtualMatrix: { matrix: null }
        },
        
        model: {
            width: 120,
            height: 30,
            logicalState: {
                focusedSlotId: "105",
                appSettings: null,
                panelRegistry: Object.create(null),
                activeSubZonesRegistry: Object.create(null)
            }
        },
        boot: null,
        updateGeometryMap: null,
        executeViewportBlit: null
    };

    hostState.virtualCanvasState.virtualMatrix.matrix = preallocateVirtualDisplayMatrix();
    return hostState;
}
