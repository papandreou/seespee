var AssetGraph = require('assetgraph');
var _ = require('lodash');
var urlModule = require('url');

module.exports = function (options) {
    options = options || {};
    var console = options.console || global.console;
    return function (assetGraph) {
        return assetGraph
            .populate({
                followRelations: {
                    type: AssetGraph.query.not(['HtmlAnchor', 'SvgAnchor', 'HtmlFrame', 'HtmlIFrame', 'JavaScriptSourceUrl', 'JavaScriptSourceMappingUrl', 'CssSourceUrl', 'CssSourceMappingUrl'])
                }
            })
            .queue(function (assetGraph) {
                assetGraph.findRelations({type: 'HttpRedirect'}).sort(function (a, b) {
                    return a.id - b.id;
                }).forEach(function (relation) {
                    if (relation.from.isInitial) {
                        console.warn('Redirected to', relation.to.url);
                        relation.to.isInitial = true;
                        relation.from.isInitial = false;
                    }
                });
                var origins = _.uniq(assetGraph.findAssets({type: 'Html', isInitial: true}).map(function (asset) {
                    var urlObj = urlModule.parse(asset.url);
                    return urlObj.protocol + '//' + urlObj.host;
                }));
                if (origins.length === 1 && /^http/.test(origins[0]) && /^file:/.test(assetGraph.root)) {
                    assetGraph.root = origins[0] + '/';
                }
            })
            .queue(function (assetGraph) {
                assetGraph.findAssets({type: 'Html', isInitial: true}).forEach(function (htmlAsset) {
                    var existingHtmlContentSecurityPolicies = assetGraph.findRelations({from: htmlAsset, type: 'HtmlContentSecurityPolicy'});
                    if (options.ignoreMeta && existingHtmlContentSecurityPolicies.length > 0) {
                        existingHtmlContentSecurityPolicies.forEach(function (existingHtmlContentSecurityPolicy) {
                            existingHtmlContentSecurityPolicy.detach();
                        });
                        existingHtmlContentSecurityPolicies = [];
                    }
                    if (existingHtmlContentSecurityPolicies.length === 0) {
                        var emptyCsp = new AssetGraph.ContentSecurityPolicy({
                            text: options.include || "default-src 'none'"
                        });
                        assetGraph.addAsset(emptyCsp);
                        new AssetGraph.HtmlContentSecurityPolicy({
                            from: htmlAsset,
                            to: emptyCsp
                        }).attach(htmlAsset, 'first').inline();
                    }
                });
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
