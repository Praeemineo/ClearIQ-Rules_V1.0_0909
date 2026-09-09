sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"configuration/test/integration/pages/ConfigurationList.gen",
	"configuration/test/integration/pages/ConfigurationObjectPage.gen"
], function (JourneyRunner, ConfigurationListGenerated, ConfigurationObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('configuration') + '/test/flp.html#app-preview',
        pages: {
			onTheConfigurationListGenerated: ConfigurationListGenerated,
			onTheConfigurationObjectPageGenerated: ConfigurationObjectPageGenerated
        },
        async: true
    });

    return runner;
});

