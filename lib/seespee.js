var AssetGraph = require('assetgraph');
var _ = require('lodash');
var urlModule = require('url');
var urlTools = require('urltools');

module.exports = async function seespee(url, options) {
    if (url && typeof url === 'object') {
        options = url;
        url = options.url;
    } else {
        options = options || {};
    }
    if (typeof url !== 'string') {
        throw new Error('No url given');
    }
    var root = options.root;
    if (!/^[a-z+-]+:\/\//i.test(url)) {
        url = urlTools.fsFilePathToFileUrl(url);
        // If no root is given, assume it's the directory containing the HTML file
        root = root || url.replace(/\/[^/]+$/, '/');
    }

    var errors = [];
    var warns = [];
    var infoObject = {};
    const assetGraph = new AssetGraph({root: root});
    assetGraph
        .on('error', function (error) {
            errors.push(error);
        })
        .on('warn', function (warn) {
            warns.push(warn);
        });
    await assetGraph.loadAssets(url);

    await assetGraph.populate({
        followRelations: {
            type: AssetGraph.query.not([
                'HtmlAnchor', 'SvgAnchor', 'JavaScriptSourceUrl', 'JavaScriptSourceMappingUrl',
                'CssSourceUrl', 'CssSourceMappingUrl',
                'HtmlPreconnectLink', 'HtmlPrefetchLink', 'HtmlPreloadLink', 'HtmlPrerenderLink', 'HtmlResourceHint', 'HtmlSearchLink'
            ])
        }
    });

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

    var initialAssets = assetGraph.findAssets({isInitial: true});
    if (!initialAssets.some(function (asset) {return asset.type === 'Html';})) {
        throw new Error('No HTML assets found (' + initialAssets.map(function (asset) {
            return asset.urlOrDescription;
        }).join(' ') + ')');
    }

    assetGraph.findAssets({type: 'Html', isInitial: true}).forEach(function (htmlAsset) {
        if (htmlAsset.contentSecurityPolicy) {
            htmlAsset.addRelation({
                type: 'HtmlContentSecurityPolicy',
                to: {
                    type: 'ContentSecurityPolicy',
                    text: htmlAsset.contentSecurityPolicy
                }
            }, 'first');
        }
        if (htmlAsset.contentSecurityPolicyReportOnly) {
            var htmlContentSecurityPolicy = htmlAsset.addRelation({
                type: 'HtmlContentSecurityPolicy',
                to: {
                    type: 'ContentSecurityPolicy',
                    text: htmlAsset.contentSecurityPolicyReportOnly
                }
            }, 'first');
            htmlContentSecurityPolicy.node.setAttribute('http-equiv', 'Content-Security-Policy-Report-Only');
        }
        var existingHtmlContentSecurityPolicies = assetGraph.findRelations({from: htmlAsset, type: 'HtmlContentSecurityPolicy'});
        if (options.ignoreMeta && existingHtmlContentSecurityPolicies.length > 0) {
            existingHtmlContentSecurityPolicies.forEach(function (existingHtmlContentSecurityPolicy) {
                existingHtmlContentSecurityPolicy.detach();
            });
            existingHtmlContentSecurityPolicies = [];
        }
        if (existingHtmlContentSecurityPolicies.length === 0) {
            htmlAsset.addRelation({
                type: 'HtmlContentSecurityPolicy',
                to: {
                    type: 'ContentSecurityPolicy',
                    text: options.include || "default-src 'none'"
                }
            }, 'first');
        }
    });

    await assetGraph.reviewContentSecurityPolicy({type: 'Html', isInitial: true}, {
        update: true,
        infoObject: infoObject,
        level: options.level,
        includePath: options.level >= 2 ?
            ['script-src', 'style-src', 'frame-src', 'object-src', 'manifest-src', 'child-src'] :
            false
    });

    var initialHtmlAsset = assetGraph.findAssets({type: 'Html', isInitial: true})[0];

    var htmlContentSecurityPolicies = assetGraph.findRelations({from: initialHtmlAsset, type: 'HtmlContentSecurityPolicy'});
    return {
        originalUrl: url,
        url: initialHtmlAsset.url,
        contentSecurityPolicy: htmlContentSecurityPolicies
            .filter(function (htmlContentSecurityPolicy) {
                return htmlContentSecurityPolicy.node.getAttribute('http-equiv') === 'Content-Security-Policy';
            })
            .map(function (htmlContentSecurityPolicy) {
                return htmlContentSecurityPolicy.to.text;
            }).join(', ') || undefined,
        contentSecurityPolicyReportOnly: htmlContentSecurityPolicies
            .filter(function (htmlContentSecurityPolicy) {
                return htmlContentSecurityPolicy.node.getAttribute('http-equiv') === 'Content-Security-Policy-Report-Only';
            })
            .map(function (htmlContentSecurityPolicy) {
                return htmlContentSecurityPolicy.to.text;
            }).join(', ') || undefined,
        warns: warns,
        errors: errors,
        assetGraph: assetGraph,
        policies: htmlContentSecurityPolicies.map(function (htmlContentSecurityPolicy) {
            return _.defaults({
                asset: htmlContentSecurityPolicy.to
            }, infoObject[htmlContentSecurityPolicy.to.id]);
        })
    };
};
