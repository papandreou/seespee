const AssetGraph = require('assetgraph');
const _ = require('lodash');
const urlModule = require('url');
const urlTools = require('urltools');

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
    let root = options.root;
    if (!/^[a-z+-]+:\/\//i.test(url)) {
        url = urlTools.fsFilePathToFileUrl(url);
        // If no root is given, assume it's the directory containing the HTML file
        root = root || url.replace(/\/[^/]+$/, '/');
    }

    const errors = [];
    const warns = [];
    const assetGraph = new AssetGraph({root: root});
    assetGraph
        .on('error', error => errors.push(error))
        .on('warn', warn => warns.push(warn));

    await assetGraph.loadAssets(url);

    await assetGraph.populate({
        followRelations: {
            type: {
                $nin: [
                    'HtmlAnchor', 'SvgAnchor', 'JavaScriptSourceUrl', 'JavaScriptSourceMappingUrl',
                    'CssSourceUrl', 'CssSourceMappingUrl',
                    'HtmlPreconnectLink', 'HtmlPrefetchLink', 'HtmlPreloadLink', 'HtmlPrerenderLink', 'HtmlResourceHint', 'HtmlSearchLink'
                ]
            }
        }
    });

    for (const relation of assetGraph.findRelations({type: 'HttpRedirect'}).sort((a, b) => a.id - b.id)) {
        if (relation.from.isInitial) {
            relation.to.isInitial = true;
            relation.from.isInitial = false;
        }
    }

    const origins = _.uniq(assetGraph.findAssets({type: 'Html', isInitial: true}).map(asset => {
        const urlObj = urlModule.parse(asset.url);
        return urlObj.protocol + '//' + urlObj.host;
    }));
    if (origins.length === 1 && /^http/.test(origins[0]) && /^file:/.test(assetGraph.root)) {
        assetGraph.root = origins[0] + '/';
    }

    const initialAssets = assetGraph.findAssets({isInitial: true});
    if (!initialAssets.some(asset => asset.type === 'Html' && asset.isLoaded)) {
        throw new Error('No HTML assets found (' + initialAssets.map(
            asset => asset.urlOrDescription
        ).join(' ') + ')');
    }

    const originalPolicies = [];
    for (const htmlAsset of assetGraph.findAssets({type: 'Html', isInitial: true, isLoaded: true})) {
        originalPolicies.push(...assetGraph.findRelations({from: htmlAsset, type: 'HtmlContentSecurityPolicy'}).map(
            (relation) => ({
                type: 'meta',
                name: relation.node.getAttribute('http-equiv'),
                value: relation.to.text
            })
        ));
        if (!options.ignoreExisting) {
            if (htmlAsset.contentSecurityPolicy) {
                htmlAsset.addRelation({
                    type: 'HtmlContentSecurityPolicy',
                    to: {
                        type: 'ContentSecurityPolicy',
                        text: htmlAsset.contentSecurityPolicy
                    }
                }, 'first');
                originalPolicies.push({
                    type: 'header',
                    name: 'Content-Security-Policy',
                    value: htmlAsset.contentSecurityPolicy
                });
            }
            if (htmlAsset.contentSecurityPolicyReportOnly) {
                const htmlContentSecurityPolicy = htmlAsset.addRelation({
                    type: 'HtmlContentSecurityPolicy',
                    to: {
                        type: 'ContentSecurityPolicy',
                        text: htmlAsset.contentSecurityPolicyReportOnly
                    }
                }, 'first');
                htmlContentSecurityPolicy.node.setAttribute('http-equiv', 'Content-Security-Policy-Report-Only');
                originalPolicies.push({
                    type: 'header',
                    name: 'Content-Security-Policy-Report-Only',
                    value: htmlAsset.contentSecurityPolicyReportOnly
                });
            }
        }
        let existingHtmlContentSecurityPolicies = assetGraph.findRelations({from: htmlAsset, type: 'HtmlContentSecurityPolicy'});
        if (options.ignoreExisting && existingHtmlContentSecurityPolicies.length > 0) {
            for (const existingHtmlContentSecurityPolicy of existingHtmlContentSecurityPolicies) {
                existingHtmlContentSecurityPolicy.detach();
            }
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
    }

    const infoObject = await assetGraph.reviewContentSecurityPolicy({type: 'Html', isInitial: true}, {
        update: true,
        level: options.level,
        includePath: options.level >= 2 ?
            ['script-src', 'style-src', 'frame-src', 'object-src', 'manifest-src', 'child-src'] :
            false
    });

    const initialHtmlAsset = assetGraph.findAssets({type: 'Html', isInitial: true})[0];

    const htmlContentSecurityPolicies = assetGraph.findRelations({from: initialHtmlAsset, type: 'HtmlContentSecurityPolicy'});
    return {
        originalPolicies,
        originalUrl: url,
        url: initialHtmlAsset.url,
        contentSecurityPolicy: htmlContentSecurityPolicies
            .filter(
                htmlContentSecurityPolicy => htmlContentSecurityPolicy.node.getAttribute('http-equiv') === 'Content-Security-Policy'
            )
            .map(htmlContentSecurityPolicy => htmlContentSecurityPolicy.to.text)
            .join(', ') || undefined,
        contentSecurityPolicyReportOnly: htmlContentSecurityPolicies
            .filter(
                htmlContentSecurityPolicy => htmlContentSecurityPolicy.node.getAttribute('http-equiv') === 'Content-Security-Policy-Report-Only'
            )
            .map(htmlContentSecurityPolicy => htmlContentSecurityPolicy.to.text)
            .join(', ') || undefined,
        warns,
        errors,
        assetGraph,
        policies: htmlContentSecurityPolicies.map(
            htmlContentSecurityPolicy =>
                _.defaults({
                    asset: htmlContentSecurityPolicy.to
                }, infoObject[htmlContentSecurityPolicy.to.id])
        )
    };
};
