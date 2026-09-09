sap.ui.define([
    "sap/ui/core/Component"
], function (Component) {
    "use strict";

    return {

        onManageToleranceKeys: function (oEvent, aContexts, oListBinding) {
            var oModel = oListBinding.getModel();

            var oComponent = Component.registry.filter(function (oComp) {
                return oComp.getModel && oComp.getModel() === oModel;
            })[0];

            if (!oComponent || !oComponent.getRouter) {
                // eslint-disable-next-line no-console
                console.error("onManageToleranceKeys: could not resolve owning UIComponent for router navigation");
                return;
            }

            // Force all active bindings (including the ToleranceKeys List
            // Report table, which stays alive in the background) to re-fetch,
            // so newly created/edited rows show up immediately instead of
            // looking blank until a manual page reload.
            oModel.refresh();

            oComponent.getRouter().navTo("ToleranceKeysList");
        }

    };

});