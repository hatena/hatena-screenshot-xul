if (!hScreenshot)
    var hScreenshot = {};

Components.utils.import("resource://hatenascreenshot/modules/00-utils.jsm",
                        hScreenshot);

/**
 * 指定されたURIのスクリプトを読み込む。
 * 
 * @param {String} uri スクリプトのURI。"/"で終わっていた場合は
 *                     そのディレクトリ直下のすべてのスクリプトを読み込む。
 */
hScreenshot.load = function (uri) {
    if (uri.charAt(uri.length - 1) === "/") {
        var load = arguments.callee;
        load.getScriptURIs(uri)
            .forEach(function (uri) load.call(this, uri), this);
        return;
    }

    var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                 .getService(Components.interfaces.mozIJSSubScriptLoader);
    var env = { __proto__: this };
    loader.loadSubScript(uri, env);
    if (env.EXPORT)
        env.EXPORT.forEach(function (name) this[name] = env[name], this);
};

hScreenshot.load.getScriptURIs = function (dirURI) {
    const Cc = Components.classes;
    const Ci = Components.interfaces;
    const EXTENSION_ID = "fotolife@hatena.ne.jp";
    var uris = [];
    var dirPath = dirURI.replace(/^[\w-]+:\/\/[\w.:-]+\//, "");
    var em = Cc["@mozilla.org/extensions/manager;1"]
                 .getService(Ci.nsIExtensionManager);
    var baseURI = 'chrome://hatenascreenshot/' + dirPath;
    // XXX jarファイルに固めるのならnsIZipReaderを使ってごにょごにょする。
    var dir = em.getInstallLocation(EXTENSION_ID)
                .getItemFile(EXTENSION_ID, "chrome/" + dirPath);
    if (!dir.exists() || !dir.isDirectory()) return uris;
    var files = dir.directoryEntries;
    while (files.hasMoreElements()) {
        var file = files.getNext().QueryInterface(Ci.nsIFile);
        if (/\.js$/.test(file.leafName))
            uris.push(baseURI + file.leafName);
    }
    return uris.sort();
};

if (!("autoload" in hScreenshot) || hFotolife.autoload) {
    hScreenshot.loadModules();
    hScreenshot.load("chrome://hatenascreenshot/content/common/");
    hScreenshot.load(location.href.replace(/\.\w+$/, "/"));
}
