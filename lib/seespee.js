var AssetGraph = require('assetgraph');
var _ = require('lodash');
var urlModule = require('url');
var urlTools = require('urltools');

module.exports = function seespee(url, options) {
    if (url && typeof url === 'object') {
        options = url;
        url = options.url;
    } else {
        options = options || {};
    }
    if (typeof url !== 'string') {
        throw new Error('No url given');
    }

    if (!/^[a-z+-]+:\/\//i.test(url)) {
        url = urlTools.fsFilePathToFileUrl(url);
    }

    var errors = [];
    var warns = [];
    return new AssetGraph({root: options.root})
        .on('error', function (error) {
            errors.push(error);
        })
        .on('warn', function (warn) {
            warns.push(warn);
        })
        .loadAssets(url)
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
        .then(function (assetGraph) {
            var initialHtmlAsset = assetGraph.findAssets({type: 'Html', isInitial: true})[0];

            var htmlContentSecurityPolicies = assetGraph.findRelations({from: initialHtmlAsset, type: 'HtmlContentSecurityPolicy'});
            return {
                originalUrl: url,
                url: initialHtmlAsset.url,
                contentSecurityPolicy: htmlContentSecurityPolicies.map(function (htmlContentSecurityPolicy) {
                    return htmlContentSecurityPolicy.to.text;
                }).join(', '),
                warns: warns,
                errors: errors
            };
        });
};
