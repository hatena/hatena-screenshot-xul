// エクスポートしたくないメンバの名前はアンダースコア(_)からはじめること。

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

let getService = function getService(name, i) {
    let interfaces = Array.concat(i);
    let service = Cc[name].getService(interfaces.shift());
    interfaces.forEach(function(i) service.QueryInterface(i));
    return service;
};

// See https://developer.mozilla.org/en/OS_TARGET for OS_TARGET values.
const OS_TARGET = getService('@mozilla.org/xre/app-info;1', Ci.nsIXULRuntime).OS;
const IS_WIN = OS_TARGET.indexOf("WIN") === 0;
const IS_MAC = OS_TARGET === "Darwin";
const IS_OSX = IS_MAC;

// ここら辺でサービスの取得などをしているが Services.jsm を使うと良さそう
// https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Services.jsm

const Application =
    getService("@mozilla.org/fuel/application;1", Ci.fuelIApplication);
const PrefetchService =
    getService("@mozilla.org/prefetch-service;1", Ci.nsIPrefetchService);
const DirectoryService =
    getService('@mozilla.org/file/directory_service;1', Ci.nsIProperties);

const ObserverService =
    getService("@mozilla.org/observer-service;1", Ci.nsIObserverService);
const StorageService =
    getService("@mozilla.org/storage/service;1", Ci.mozIStorageService);
const IOService =
    getService("@mozilla.org/network/io-service;1", Ci.nsIIOService);
const HistoryService =
    getService("@mozilla.org/browser/nav-history-service;1", Ci.nsINavHistoryService);
const BookmarksService =
    getService("@mozilla.org/browser/nav-bookmarks-service;1", Ci.nsINavBookmarksService); 
const PrefService = 
    getService("@mozilla.org/preferences-service;1", [Ci.nsIPrefService, Ci.nsIPrefBranch, Ci.nsIPrefBranch2]);
const CookieManager =
     getService("@mozilla.org/cookiemanager;1", Ci.nsICookieManager);
const CookieService=
     getService("@mozilla.org/cookieService;1", Ci.nsICookieService);
const PromptService =
    getService("@mozilla.org/embedcomp/prompt-service;1", Ci.nsIPromptService);

const CryptoHash = 
    Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const XBL_NS = "http://www.mozilla.org/xbl";
const XHTML_NS = "http://www.w3.org/1999/xhtml";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

/* utility functions */
var nowDebug = !!Application.prefs.get('extensions.hatenascreenshot.debug.log').value;

// window.XMLHttpRequest が存在しなくても大丈夫なように
var XMLHttpRequest = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1");

var BuiltInTimer = Components.Constructor("@mozilla.org/timer;1", "nsITimer", "init");

/*
 * p は一時デバッグ用
 */
var p = function (value) {
    log.info(''+value);
    return value;
}

p.e = function(value) {
    log.info(uneval(value));
    return value;
}

/*
 * 簡易ベンチマーク
 */
p.b = function (func, name) {
    name = 'Benchmark ' + (name || '') + ': ';
    let now = new Date * 1;
    func();
    let t = (new Date * 1) - now;
    p(name + t);
    return t;
}

var log = {
    info: function (msg) {
        if (nowDebug) {
            Application.console.log((msg || '').toString());
        }
    }
}

p.observe = function Prefs_observe (aSubject, aTopic, aData) {
     if (aTopic != "nsPref:changed") return;

     if (aData == 'extensions.hatenascreenshot.debug.log') {
         nowDebug = !!Application.prefs.get('extensions.hatenascreenshot.debug.log').value;
     }
}

PrefService.addObserver('', p, false);

var UIEncodeText = function(str) {
    return decodeURIComponent(escape(str));
}

var method = function method(self, methodName) function () self[methodName].apply(self, Array.slice(arguments));

/*
 * 共用グローバル変数
 */
let _shared = {};
var shared = {
    get: function shared_get (name) {
        return _shared[name];
    },
    set: function shared_set (name, value) {
        _shared[name] = value;
    },
    has: function shared_has (name) {
        return !(typeof _shared[name] == 'undefined');
    }
};

/*
 * JSON デコード/エンコード
 */
function decodeJSON(json) {
    try {
        return (typeof JSON === "object")
            ? JSON.parse(json)
            : Cc['@mozilla.org/dom/json;1'].createInstance(Ci.nsIJSON)
                                           .decode(json);
    } catch (ex) {
        return null;
    }
}

function encodeJSON(object) {
    try {
        return (typeof JSON === "object")
            ? JSON.stringify(object)
            : Cc['@mozilla.org/dom/json;1'].createInstance(Ci.nsIJSON)
                                           .encode(object);
    } catch (ex) {
        return "";
    }
}

const _MODULE_BASE_URI = "resource://hatenascreenshot/modules/"

function loadModules() {
    var uris = _getModuleURIs();
    uris.forEach(function (uri) Cu.import(uri, this), this);
}

function loadPrecedingModules() {
    var uris = _getModuleURIs();
    var self = _MODULE_BASE_URI + this.__LOCATION__.leafName;
    var i = uris.indexOf(self);
    if (i === -1) return;
    uris.slice(0, i).forEach(function (uri) Cu.import(uri, this), this);
}

function _getModuleURIs() {
    if (_getModuleURIs.uris) return _getModuleURIs.uris;
    var uris = [];
    var files = __LOCATION__.parent.directoryEntries;
    while (files.hasMoreElements()) {
        var file = files.getNext().QueryInterface(Ci.nsIFile);
        if (/\.jsm?$/.test(file.leafName))
            uris.push(_MODULE_BASE_URI + file.leafName);
    }
    return _getModuleURIs.uris = uris.sort();
}

/*
 * original code by tombloo
 * http://github.com/to/tombloo
 * 以下のコードのライセンスは Tombloo のライセンスに従います
 */

/**
 * オブジェクトのプロパティをコピーする。
 * ゲッター/セッターの関数も対象に含まれる。
 * 
 * @param {Object} target コピー先。
 * @param {Object} source コピー元。
 * @return {Object} コピー先。
 */
var extend = function extend(target, source, overwrite){
    overwrite = overwrite == null ? true : overwrite;
    for(var p in source){
        var getter = source.__lookupGetter__(p);
        if(getter)
            target.__defineGetter__(p, getter);
        
        var setter = source.__lookupSetter__(p);
        if(setter)
            target.__defineSetter__(p, setter);
        
        if(!getter && !setter && (overwrite || !(p in target)))
            target[p] = source[p];
    }
    return target;
}

var EXPORTED_SYMBOLS = [m for (m in new Iterator(this, true))
                          if (m[0] !== "_" && m !== "EXPORTED_SYMBOLS")];

/* Debug
EXPORTED_SYMBOLS.push.apply(EXPORTED_SYMBOLS,
                            [m for (m in new Iterator(this, true))
                               if (m[0] === "_")]);
//*/
