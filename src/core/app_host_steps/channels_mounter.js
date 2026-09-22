/**
 * @file src/core/app_host_steps/channels_mounter.js
 * @version 1.0.0-RELEASE-SMO-CHANNELS-MOUNTER
 * @description Наливка базовых приборов и подключение системных оконных контроллеров.
 */
import { registerGpssFacility } from "../smo/bus.js";
import { createAbstractFacility } from "../smo/facility_pipeline.js";
import { createWorkerGateway } from "../smo/worker_gateway.js";

import { processSpecificRootLogic } from "../smo/root_unit.js";
import { processSpecificRenderLogic } from "../smo/render_unit.js";
import { processSpecificResizeLogic } from "../smo/resize_unit.js";
import { assembleMouseUnit } from "../smo/mouse_worker_unit.js";

import { createSystemTabMenuMdlInstance } from "../../system/tab_menu/tab_menu_mdl.js";
import { processSystemTabLogic } from "../../system/tab_menu/tab_menu_ctl.js";
import { createSystemVScrollbarMdlInstance } from "../../system/vscrollbar/vscrollbar_mdl.js";
import { processSystemVScrollbarLogic } from "../../system/vscrollbar/vscrollbar_ctl.js";

import { keyboardBuilder } from "./keyboard_builder.js";

export function channelsMounter(hostState, loaderPlugin) {
    hostState.workerGateway = createWorkerGateway(hostState);
            
    registerGpssFacility("0", createAbstractFacility(hostState, "0", processSpecificRootLogic, "root_unit", 0));
    registerGpssFacility("1", createAbstractFacility(hostState, "1", processSpecificRenderLogic, "render_unit", 1));
    
    // Сборка и монтаж клавиатуры
    const kbdFacility = keyboardBuilder(hostState);
    registerGpssFacility("4", kbdFacility);
    
    registerGpssFacility("9", createAbstractFacility(hostState, "9", processSpecificResizeLogic, "resize_unit", 9));
    
    if (typeof assembleMouseUnit === "function") {
        registerGpssFacility("10", assembleMouseUnit(hostState));
    }
    
    const safeLoaderFn = typeof loaderPlugin === "function" ? loaderPlugin : (f, i, p, tx) => false;
    registerGpssFacility("11", createAbstractFacility(hostState, "11", safeLoaderFn, "loader_unit", 11));
    
    // Монтаж системного управления window_manager
    const tabMenuFacility = createAbstractFacility(hostState, "12", processSystemTabLogic, "system_tab_menu", 12);
    tabMenuFacility.mdl = createSystemTabMenuMdlInstance();
    registerGpssFacility("12", tabMenuFacility);

    const vScrollbarFacility = createAbstractFacility(hostState, "14", processSystemVScrollbarLogic, "system_vscrollbar", 14);
    vScrollbarFacility.mdl = createSystemVScrollbarMdlInstance();
    registerGpssFacility("14", vScrollbarFacility);
}
