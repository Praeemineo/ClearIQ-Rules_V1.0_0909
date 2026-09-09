sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"lockrules/test/integration/pages/RulesList.gen",
	"lockrules/test/integration/pages/RulesObjectPage.gen"
], function (JourneyRunner, RulesListGenerated, RulesObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('lockrules') + '/test/flp.html#app-preview',
        pages: {
			onTheRulesListGenerated: RulesListGenerated,
			onTheRulesObjectPageGenerated: RulesObjectPageGenerated
        },
        async: true
    });

    return runner;
});

