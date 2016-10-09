var AssetGraph = require('assetgraph');

module.exports = function (options) {
    options = options || {};
    var console = options.console || global.console;
    return function (assetGraph) {
        return assetGraph
            .queue(function (assetGraph) {
                assetGraph.findAssets({type: 'Html', isInitial: true}).forEach(function (htmlAsset) {
                    var existingHtmlContentSecurityPolicies = assetGraph.findRelations({from: htmlAsset, type: 'HtmlContentSecurityPolicy'});
                    if (options.ignoreExisting && existingHtmlContentSecurityPolicies.length > 0) {
                        existingHtmlContentSecurityPolicies.forEach(function (existingHtmlContentSecurityPolicy) {
                            existingHtmlContentSecurityPolicy.detach();
                        });
                        existingHtmlContentSecurityPolicies = [];
                    }
                    if (existingHtmlContentSecurityPolicies.length === 0) {
                        var emptyCsp = new AssetGraph.ContentSecurityPolicy({
                            text: options.include || ''
                        });
                        assetGraph.addAsset(emptyCsp);
                        new AssetGraph.HtmlContentSecurityPolicy({
                            from: htmlAsset,
                            to: emptyCsp
                        }).attach(htmlAsset, 'first').inline();
                    }
                });
            })
            .populate({
                followRelations: AssetGraph.query.and({
                    type: AssetGraph.query.not(['HtmlAnchor', 'SvgAnchor', 'HtmlFrame', 'HtmlIFrame', 'JavaScriptSourceUrl', 'JavaScriptSourceMappingUrl', 'CssSourceUrl', 'CssSourceMappingUrl'])
                }, AssetGraph.query.or({
                    crossorigin: false
                }, {
                    from: {
                        incoming: {
                            crossorigin: false
                        }
                    }
                }))
            })
            .reviewContentSecurityPolicy({type: 'Html', isInitial: true}, {update: true})
            .queue(function (assetGraph) {
                var initialHtmlAssets = assetGraph.findAssets({type: 'Html', isInitial: true});

                initialHtmlAssets.forEach(function (htmlAsset) {
                    var htmlContentSecurityPolicies = assetGraph.findRelations({from: htmlAsset, type: 'HtmlContentSecurityPolicy'});
                    if (htmlContentSecurityPolicies.length > 0) {
                        if (initialHtmlAssets.length > 1) {
                            console.log(htmlAsset.urlOrDescription);
                        }
                        htmlContentSecurityPolicies.forEach(function (htmlContentSecurityPolicy) {
                            console.log('Content-Security-Policy: ' + htmlContentSecurityPolicy.to.text);
                        });
                    }
                });
            });
    };
};
