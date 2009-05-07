// �������ݡ��Ȥ������ʤ����Ф�̾���ϥ������������(_)����Ϥ���뤳�ȡ�

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;
const EXT_ID = 'bookmark@hatena.ne.jp';

let getService = function getService(name, i) {
    let interfaces = Array.concat(i);
    let service = Cc[name].getService(interfaces.shift());
    interfaces.forEach(function(i) service.QueryInterface(i));
    return service;
};

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
const ThreadManager =
    getService("@mozilla.org/thread-manager;1", Ci.nsIThreadManager);
const HistoryService =
    getService("@mozilla.org/browser/nav-history-service;1", Ci.nsINavHistoryService);
const BookmarksService =
    getService("@mozilla.org/browser/nav-bookmarks-service;1", Ci.nsINavBookmarksService); 
const FaviconService = 
    getService("@mozilla.org/browser/favicon-service;1", Ci.nsIFaviconService);
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

const StorageStatementWrapper =
    Components.Constructor('@mozilla.org/storage/statement-wrapper;1', 'mozIStorageStatementWrapper', 'initialize');

var XMigemoCore, XMigemoTextUtils;
try{
    // XUL migemo
    XMigemoCore = Cc['@piro.sakura.ne.jp/xmigemo/factory;1']
                            .getService(Components.interfaces.pIXMigemoFactory)
                            .getService('ja');
    XMigemoTextUtils = Cc['@piro.sakura.ne.jp/xmigemo/text-utility;1']
                            .getService(Ci.pIXMigemoTextUtils);
}
catch(ex if ex instanceof TypeError){}

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const XBL_NS = "http://www.mozilla.org/xbl";
const XHTML_NS = "http://www.w3.org/1999/xhtml";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

/* utility functions */
var nowDebug = !!Application.prefs.get('extensions.hatenafotolife.debug.log').value;

/*
 * p �ϰ���ǥХå���
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
 * �ʰץ٥���ޡ���
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
    error: function (msg) {
        if (msg instanceof Error) {
            // Cu.reportError(msg);
            Application.console.log('Error: ' + msg.toString() + msg.stack.join("\n"));
        } else {
            Application.console.log('Error: ' + msg.toString());
        }
    },
    info: function (msg) {
        if (nowDebug) {
            Application.console.log((msg || '').toString());
        }
    }
}

p.observe = function Prefs_observe (aSubject, aTopic, aData) {
     if (aTopic != "nsPref:changed") return;

     if (aData == 'extensions.hatenafotolife.debug.log') {
         nowDebug = !!Application.prefs.get('extensions.hatenafotolife.debug.log').value;
     }
}

PrefService.addObserver('', p, false);

var createElementBindDocument = function(doc, ns) {
    return function(name, attr) {
        var children = Array.slice(arguments, 2);
        var e = ns ? doc.createElementNS(ns, name) : doc.createElement(name);
        if (ns) {
        }
        if (attr) for (let key in attr) e.setAttribute(key, attr[key]);
        children.map(function(el) el.nodeType > 0 ? el : doc.createTextNode(el)).
            forEach(function(el) e.appendChild(el));
        return e;
    }
}

var UIEncodeText = function(str) {
    return decodeURIComponent(escape(str));
}


/*
 * elementGetter(this, 'myList', 'my-list-id-name', document);
 * list //=> document.getElementById('my-list-id-name');
 */
var elementGetter = function(self, name, idName, doc, uncache) {
    var element;
    self.__defineGetter__(name, function() {
        if (uncache)
            return doc.getElementById(idName);
        if (!element) {
            element = doc.getElementById(idName);
        }
        return element;
    });
}

var entryURL = function(url) {
    return 'http://b.hatena.ne.jp/entry/' + url.replace('#', '%23');
}

var isInclude = function(val, ary) {
    for (var i = 0;  i < ary.length; i++) {
        if (ary[i] == val) return true;
    }
    return false;
}

var bind = function bind(func, self) function () func.apply(self, Array.slice(arguments));
var method = function method(self, methodName) function () self[methodName].apply(self, Array.slice(arguments));

// XXX model�ؿ���model.jsm���֤��ʤ��ȥ�������Ū�ˤޤ���?
var model = function(name) {
    var m = this.Model[name];
    if (!m) { throw 'model not found' };
    return m;
}

/*
 * ���ѥ����Х��ѿ�
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
 * ʸ�����Ѵ�
 */
function unEscapeURIForUI(charset, string) 
    Cc['@mozilla.org/intl/texttosuburi;1'].getService(Ci.nsITextToSubURI).unEscapeURIForUI(charset, string);

// �����Ʊ�����Ȥ��Ǥ��� XPCOM ����ݡ��ͥ�ȤϤʤ���?
function decodeReferences(string)
    string.replace(/&(?:#([xX]?\d+)|([\w-]+));/g, _referenceReplacement);

function _referenceReplacement(reference, number, name) {
    return number ? String.fromCharCode("0" + number)
                  : (_referenceMap[name] || reference);
}

let _referenceMap = {
    amp:   "&",
    lt:    "<",
    gt:    ">",
    quot:  '"',
    apos:  "'",
    nbsp:  "\u00a0",
    copy:  "\u00a9",
    reg:   "\u00ae",
    trade: "\u2122",
    laquo: "\u00ab",
    raquo: "\u00bb",
    __proto__: null
};

/*
 * JSON �ǥ�����/���󥳡���
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

/*
 * favicon ����
 */

function getFaviconURI (url) {
    let faviconURI;
    let iurl = IOService.newURI(url, null, null);
    try {
        try {
            faviconURI = FaviconService.getFaviconImageForPage(iurl);
        } catch(e) {
            faviconURI = FaviconService.getFaviconForPage(iurl);
        }
    } catch(e) {
        faviconURI = FaviconService.defaultFavicon;
    }
    return faviconURI;
}

// ����Υ�����ɥ���°���ʤ������ѥ��֥������Ȥκ���
function DictionaryObject() ({ __proto__: null });

const _MODULE_BASE_URI = "resource://hatenafotolife/modules/"

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
    var uris = [];
    var files = __LOCATION__.parent.directoryEntries;
    while (files.hasMoreElements()) {
        var file = files.getNext().QueryInterface(Ci.nsIFile);
        if (/\.jsm$/.test(file.leafName))
            uris.push(_MODULE_BASE_URI + file.leafName);
    }
    return uris.sort();
}

/*
 * original code by tombloo
 * http://github.com/to/tombloo
 * �ʲ��Υ����ɤΥ饤���󥹤� Tombloo �Υ饤���󥹤˽����ޤ�
 */

/**
 * ���֥������ȤΥץ�ѥƥ��򥳥ԡ����롣
 * ���å���/���å����δؿ����оݤ˴ޤޤ�롣
 * 
 * @param {Object} target ���ԡ��衣
 * @param {Object} source ���ԡ�����
 * @return {Object} ���ԡ��衣
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

/**
 * �᥽�åɤ��ƤФ�����˽������ɲä��롣
 * ���ܺ٤ʥ���ȥ��뤬ɬ�פʾ���addAround��Ȥ����ȡ�
 * 
 * @param {Object} target �оݥ��֥������ȡ�
 * @param {String} name �᥽�å�̾��
 * @param {Function} before ��������
 *        �оݥ��֥������Ȥ�this�Ȥ��ơ����ꥸ�ʥ�ΰ����������Ϥ���ƸƤӽФ���롣
 */
function addBefore(target, name, before) {
    var original = target[name];
    target[name] = function() {
        before.apply(this, arguments);
        return original.apply(this, arguments);
    }
}

/**
 * �᥽�åɤإ��饦��ɥ��ɥХ������ɲä��롣
 * �������֤��������������ѷ��䡢�֤��ͤβù���Ǥ���褦�ˤ��롣
 * 
 * @param {Object} target �оݥ��֥������ȡ�
 * @param {String || Array} methodNames 
 *        �᥽�å�̾��ʣ�����ꤹ�뤳�Ȥ�Ǥ��롣
 *        set*�Τ褦�˥磻��ɥ����Ȥ�ȤäƤ�褤��
 * @param {Function} advice 
 *        ���ɥХ�����proceed��args��target��methodName��4�Ĥΰ������Ϥ���롣
 *        proceed���оݥ��֥������Ȥ˥Х���ɺѤߤΥ��ꥸ�ʥ�Υ᥽�åɡ�
 */
function addAround(target, methodNames, advice){
    methodNames = [].concat(methodNames);
    
    // �磻��ɥ����ɤ�Ÿ��
    for(var i=0 ; i<methodNames.length ; i++){
        if(methodNames[i].indexOf('*')==-1) continue;
        
        var hint = methodNames.splice(i, 1)[0];
        hint = new RegExp('^' + hint.replace(/\*/g, '.*'));
        for(var prop in target) {
            if(hint.test(prop) && typeof(target[prop]) == 'function')
                methodNames.push(prop);
        }
    }
    
    methodNames.forEach(function(methodName){
        var method = target[methodName];
        target[methodName] = function() {
            var self = this;
            return advice(
                function(args){
                    return method.apply(self, args);
                }, 
                arguments, self, methodName);
        };
        target[methodName].overwrite = (method.overwrite || 0) + 1;
    });
}

var update = function (self, obj/*, ... */) {
    if (self === null) {
        self = {};
    }
    for (var i = 1; i < arguments.length; i++) {
        var o = arguments[i];
        if (typeof(o) != 'undefined' && o !== null) {
            for (var k in o) {
                self[k] = o[k];
            }
        }
    }
    return self;
};
var EXPORTED_SYMBOLS = [m for (m in new Iterator(this, true))
                          if (m[0] !== "_" && m !== "EXPORTED_SYMBOLS")];

/* Debug
EXPORTED_SYMBOLS.push.apply(EXPORTED_SYMBOLS,
                            [m for (m in new Iterator(this, true))
                               if (m[0] === "_")]);
//*/
