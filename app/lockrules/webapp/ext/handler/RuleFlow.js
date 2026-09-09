sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/IconPool",
    "sap/ui/core/theming/Parameters"
], function (Fragment, JSONModel, IconPool, ThemeParameters) {
    "use strict";

    var RuleFlow = {

        // Fiori Elements calls custom header-action handlers as
        // (aContexts, mExtensionAPI) — NOT as a UI5 press event. aContexts
        // is the array of contexts relevant to the page (for an Object
        // Page header action this is the single object's context).
        onViewFlow: function (aContexts, mExtensionAPI) {
            var oContext = Array.isArray(aContexts) ? aContexts[0] : aContexts;

            if (!oContext || !oContext.getModel) {
                console.error("onViewFlow: no binding context received from Fiori Elements");
                return;
            }

            var oModel = oContext.getModel();
            var sRuleId = oContext.getProperty("ruleId");

            if (!sRuleId) {
                console.error("onViewFlow: ruleId not available on context");
                return;
            }

            // getStepsByRule returns "many MergedStep" — a COLLECTION, not
            // a single entity/complex type. Collection-valued function
            // imports must be read via bindList + requestContexts, not
            // bindContext + execute (that pattern only works for
            // single-value functions/actions). OData literal strings need
            // single quotes doubled if the value itself contains one.
            var sEscapedRuleId = String(sRuleId).replace(/'/g, "''");
            var sPath = "/getStepsByRule(ruleId='" + sEscapedRuleId + "')";
            var oListBinding = oModel.bindList(sPath);

            oListBinding.requestContexts(0, 1000).then(function (aResultContexts) {
                var aSteps = aResultContexts.map(function (oCtx) {
                    return oCtx.getObject();
                });
                RuleFlow._openDialog(mExtensionAPI, aSteps, sRuleId);
            }).catch(function (oError) {
                console.error("getStepsByRule failed:", oError);
            });
        },

        _openDialog: function (mExtensionAPI, aSteps, sRuleId) {
            // Give the fragment an explicit, unique id so nested controls
            // (like "flowHtml") can be resolved later via Fragment.byId.
            // Without an explicit id here, control ids are NOT prefixed,
            // so Fragment.byId(dialog.getId(), "flowHtml") would silently
            // return undefined and setContent() would be a no-op.
            var sFragmentId = "ruleFlowDialog-" + Date.now();

            Fragment.load({
                id: sFragmentId,
                name: "lockrules.ext.RuleFlowDialog",
                controller: RuleFlow
            }).then(function (oDialog) {
                oDialog.setModel(new JSONModel({
                    ruleId: sRuleId,
                    steps: aSteps
                }), "flow");

                var oSize = RuleFlow._renderSvg(sFragmentId, aSteps);
                RuleFlow._sizeDialog(oDialog, oSize);

                oDialog.attachAfterClose(function () {
                    oDialog.destroy();
                });
                oDialog.open();
            }).catch(function (oError) {
                console.error("Failed to load RuleFlowDialog fragment:", oError);
            });
        },

        // Sizes the dialog to fit the rendered content (card width x
        // total flow height), capped to a comfortable fraction of the
        // viewport so a rule with many steps scrolls instead of forcing
        // the dialog off-screen, and a rule with few steps doesn't leave
        // a mostly-empty oversized box.
        _sizeDialog: function (oDialog, oSize) {
            var CHROME_W = 56;   // dialog padding/borders around content
            var CHROME_H = 130;  // header + footer + padding
            var MIN_W = 320;
            var MIN_H = 200;

            var iViewportW = window.innerWidth || 1024;
            var iViewportH = window.innerHeight || 768;

            var iWantedW = (oSize.width || MIN_W) + CHROME_W;
            var iWantedH = (oSize.height || MIN_H) + CHROME_H;

            var iFinalW = Math.max(MIN_W, Math.min(iWantedW, Math.floor(iViewportW * 0.9)));
            var iFinalH = Math.max(MIN_H, Math.min(iWantedH, Math.floor(iViewportH * 0.85)));

            oDialog.setContentWidth(iFinalW + "px");
            oDialog.setContentHeight(iFinalH + "px");
        },

        // stepType -> label + SAP icon name (Fiori-native, no per-type
        // color coding — differentiation comes from the icon, not hue).
        _STEP_META: {
            APPROVAL:        { label: "Approval",         icon: "sap-icon://thumb-up" },
            CHECK_CONDITION: { label: "Check Condition",  icon: "sap-icon://filter" },
            SET_VARIABLES:   { label: "Set Variables",    icon: "sap-icon://settings" },
            API_MAPPING:     { label: "API Mapping",      icon: "sap-icon://connected" },
            AI_MAPPING:      { label: "AI Mapping",       icon: "sap-icon://synchronize" },
            FIELD_MAPPING:   { label: "Field Mapping",    icon: "sap-icon://chain-link" },
            CALL_ACTION:     { label: "Call Action",      icon: "sap-icon://action" },
            CONFIGURATION:   { label: "Configuration",    icon: "sap-icon://action-settings" },
            TOLERANCE_LIMIT: { label: "Tolerance Limit",  icon: "sap-icon://measuring-point" }
        },

        // Reads a Horizon theme parameter with a safe hardcoded fallback,
        // so the diagram still renders sensibly if the parameter name
        // changes in a future theme version or isn't loaded yet.
        _themeColor: function (sParamName, sFallback) {
            try {
                var sVal = ThemeParameters.get({ name: sParamName });
                return sVal || sFallback;
            } catch (e) {
                return sFallback;
            }
        },

        // Resolves an SAP icon URI to its font glyph + font-family for
        // inline SVG <text> rendering. Falls back to a generic document
        // icon if the requested icon name isn't registered.
        _iconGlyph: function (sIconUri) {
            var oInfo;
            try {
                oInfo = IconPool.getIconInfo(sIconUri);
            } catch (e) {
                oInfo = null;
            }
            if (!oInfo) {
                try {
                    oInfo = IconPool.getIconInfo("sap-icon://document");
                } catch (e2) {
                    oInfo = null;
                }
            }
            return oInfo
                ? { char: oInfo.content, fontFamily: oInfo.fontFamily }
                : { char: "", fontFamily: "SAP-icons" };
        },

        _renderSvg: function (sFragmentId, aSteps) {
            var oHtml = Fragment.byId(sFragmentId, "flowHtml");

            if (!oHtml) {
                console.error("_renderSvg: could not resolve 'flowHtml' control for fragment id " + sFragmentId);
                return;
            }

            // Theme-aware palette — pulled live from the active Horizon
            // theme so the diagram adapts automatically to light, dark,
            // and high-contrast modes instead of using fixed hex values.
            var sBoxFill      = RuleFlow._themeColor("sapUiTileBackground", "#FFFFFF");
            var sBoxBorder     = RuleFlow._themeColor("sapUiButtonLiteBorderColor", "#89919A");
            var sTitleColor    = RuleFlow._themeColor("sapUiBaseText", "#1D2D3E");
            var sSubtitleColor = RuleFlow._themeColor("sapUiContentLabelColor", "#6A6D70");
            var sAccentColor   = RuleFlow._themeColor("sapUiHighlight", "#0A6ED1");
            var sAccentText    = RuleFlow._themeColor("sapUiContentContrastTextColor", "#FFFFFF");
            var sLineColor     = RuleFlow._themeColor("sapUiContentForegroundBorderColor", "#89919A");
            var sPillFill      = RuleFlow._themeColor("sapUiListBackground", "#F5F6F7");

            if (!aSteps.length) {
                var oEmptyIcon = RuleFlow._iconGlyph("sap-icon://message-information");
                oHtml.setContent(
                    '<div style="padding:32px 24px;text-align:center;color:' + sSubtitleColor + ';">' +
                    '<span style="font-family:' + oEmptyIcon.fontFamily + ';font-size:28px;display:block;margin-bottom:8px;">' +
                    oEmptyIcon.char + '</span>' +
                    'No steps configured for this rule yet.</div>'
                );
                return { width: 320, height: 140 };
            }

            var boxW = 260, boxH = 64, gapY = 40, startX = 24, startY = 24;
            var iconR = 18, pad = 16;
            var width = boxW + startX * 2;
            var height = startY + aSteps.length * (boxH + gapY) - gapY + startY;

            var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">';

            aSteps.forEach(function (s, i) {
                var y = startY + i * (boxH + gapY);
                var meta = RuleFlow._STEP_META[s.stepType] || { label: s.stepType, icon: "sap-icon://document" };
                var icon = RuleFlow._iconGlyph(meta.icon);
                var cx = startX + pad + iconR;
                var cy = y + boxH / 2;
                var textX = cx + iconR + 14;
                var orderLabel = "Order " + s.stepOrder;
                var pillW = 14 + orderLabel.length * 6;
                var pillX = startX + boxW - pillW - 12;

                svg +=
                    // Card
                    '<rect x="' + startX + '" y="' + y + '" width="' + boxW + '" height="' + boxH +
                    '" rx="8" fill="' + sBoxFill + '" stroke="' + sBoxBorder + '" stroke-width="1"/>' +
                    // Icon badge
                    '<circle cx="' + cx + '" cy="' + cy + '" r="' + iconR + '" fill="' + sAccentColor + '"/>' +
                    '<text x="' + cx + '" y="' + (cy + 1) + '" text-anchor="middle" dominant-baseline="central" ' +
                    'font-family="' + icon.fontFamily + '" font-size="18" fill="' + sAccentText + '">' + icon.char + '</text>' +
                    // Title + subtitle
                    '<text x="' + textX + '" y="' + (cy - 9) + '" font-family="72,Arial,sans-serif" font-size="14" ' +
                    'font-weight="600" fill="' + sTitleColor + '">' + RuleFlow._escape(meta.label) + '</text>' +
                    '<text x="' + textX + '" y="' + (cy + 11) + '" font-family="72,Arial,sans-serif" font-size="12" ' +
                    'fill="' + sSubtitleColor + '">' + RuleFlow._escape(s.stepName) + '</text>' +
                    // Order pill
                    '<rect x="' + pillX + '" y="' + (y + 10) + '" width="' + pillW + '" height="18" rx="9" fill="' + sPillFill + '" stroke="' + sBoxBorder + '" stroke-width="0.5"/>' +
                    '<text x="' + (pillX + pillW / 2) + '" y="' + (y + 19) + '" text-anchor="middle" dominant-baseline="central" ' +
                    'font-family="72,Arial,sans-serif" font-size="10" fill="' + sSubtitleColor + '">' + orderLabel + '</text>';

                if (i < aSteps.length - 1) {
                    var lineX = startX + boxW / 2;
                    var y1 = y + boxH, y2 = y + boxH + gapY;
                    svg += '<line x1="' + lineX + '" y1="' + y1 + '" x2="' + lineX + '" y2="' + (y2 - 8) +
                        '" stroke="' + sLineColor + '" stroke-width="1.5" marker-end="url(#ruleFlowArrow)"/>';
                }
            });

            svg +=
                '<defs><marker id="ruleFlowArrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">' +
                '<path d="M1,1 L9,5 L1,9 Z" fill="' + sLineColor + '"/></marker></defs></svg>';

            oHtml.setContent(svg);
            return { width: width, height: height };
        },

        _escape: function (sText) {
            return String(sText == null ? "" : sText)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        },

        onCloseFlow: function (oEvent) {
            oEvent.getSource().getParent().close();
        }
    };

    return RuleFlow;

});