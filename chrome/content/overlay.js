(function () { "use strict";
// 初回実行時にアドオンバーにツールバーボタンの配置する

var Cu = Components.utils;

var modules = {};
Cu.import("resource://hatenascreenshot/modules/53-Prefs.js", modules);
var appPrefs = modules.Prefs.screenshot;

function checkWhetherScreenshotToolbarbuttonInstallationIsNeeded() {
    // statusbar にアイコンを表示する設定になっているかどうか
    // 元々 statusbar にアイコンを表示する設定にしていない人に対してはアドオンバーにも表示しない
    var isShownOnStatusbar = appPrefs.get("statusbar");
    // 過去の起動時にインストール操作が行われているかどうか
    var isAlreadyInstalled = appPrefs.get("_installationToAddonBarWasProcessed");
    return (isShownOnStatusbar && !isAlreadyInstalled);
}

// window の load イベント以降で呼ばないとおかしくなる
function installScreenshotToolbarbuttonIfNeeded() {
    var needed = checkWhetherScreenshotToolbarbuttonInstallationIsNeeded();
    // 次回起動時以降は addonbar へのインストールを行わないように
    appPrefs.set("_installationToAddonBarWasProcessed", true);

    if (!needed) return;
    installButton("addon-bar", "hScreenshot-toolbar-button");
}

function installButton(toolbarId, id, afterId) {
    var doc = window.document;
    // 既にどこかに配置されている場合はアドオンバーには配置しない
    if (!doc.getElementById(id)) {
        var toolbar = doc.getElementById(toolbarId);

        // If no afterId is given, then append the item to the toolbar
        var before = null;
        if (afterId) {
            var elem = doc.getElementById(afterId);
            if (elem && elem.parentNode == toolbar)
            before = elem.nextElementSibling;
        }

        // 1 回実行すれば, 次に別のウィンドウを開くときにはこの設定が使われる

        toolbar.insertItem(id, before);
        toolbar.setAttribute("currentset", toolbar.currentSet);
        doc.persist(toolbar.id, "currentset"); // 属性値の永続化

        // 追加先のツールバーが非表示なっている可能性があるので, 表示する
        toolbar.setAttribute("collapsed", "false");
        doc.persist(toolbar.id, "collapsed"); // 属性値の永続化
    }
}

window.addEventListener("load", function el(evt) {
    if (evt.target !== window.document) return;
    window.removeEventListener("load", el, false);

    installScreenshotToolbarbuttonIfNeeded();
}, false);

}).call(this);


(function () {

with(hScreenshot) {
    if (hScreenshot.nowDebug) {
        toErrorConsole();
    }

    EventService.dispatch('preload', window);

    window.addEventListener('load', function(e) {
        EventService.dispatch('load', window);

        if (!shared.get('firstPreload')) {
            EventService.dispatch('firstPreload', window);
            shared.set('firstPreload', true);
        }

        // window.setTimeout(function() {
        //     Manager.draw();
        // }, 1000);
    }, false);

    window.addEventListener('unload', function(e) {
        EventService.dispatch('unload', window);
    }, false);
}

}).call(this);
