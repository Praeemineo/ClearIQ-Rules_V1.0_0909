sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"lockboxreasoncode/test/integration/pages/ReasonCodesList.gen",
	"lockboxreasoncode/test/integration/pages/ReasonCodesObjectPage.gen"
], function (JourneyRunner, ReasonCodesListGenerated, ReasonCodesObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('lockboxreasoncode') + '/test/flp.html#app-preview',
        pages: {
			onTheReasonCodesListGenerated: ReasonCodesListGenerated,
			onTheReasonCodesObjectPageGenerated: ReasonCodesObjectPageGenerated
        },
        async: true
    });

    return runner;
});

