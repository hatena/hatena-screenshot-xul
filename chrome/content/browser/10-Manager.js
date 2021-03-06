
const EXPORT = ['Manager'];

var Manager = {};
let PS = Cc["@mozilla.org/embedcomp/prompt-service;1"].
         getService(Ci.nsIPromptService);

Manager.sketch = {
    sketches: [],
    hasSketch: function(sid) {
        if (!sid) return false;
        let sketches = this.sketches;
        for (let i = 0;  i < sketches.length; i++) {
            if (sketches[i].sid == sid) {
                return sketches[i];
            }
        }
        return false;
    },
    removeSketch: function(sid) {
        if (!sid) return false;
        let sketches = this.sketches;
        for (let i = 0;  i < sketches.length; i++) {
            if (sketches[i].sid == sid) {
                sketches.splice(i, 1); 
                return true;
            }
        }
        return false;
    },
    addSketch: function(sketch) {
        if (!this.hasSketch(sketch.sid)) {
            this.sketches.push(sketch);
            return true;
        } else {
            return false;
        }
    },
    getSketckById: function(sid) {
        if (!sid) return;
        return this.hasSketch(sid);
    },
};

Manager.draw = function() {
    let win = getTopWin().content;
    if (!win || !win.document) return;

    p('draw!: sid: '  + win.__sketch_switch_sid__);
    let eventType = 'ShowSketch';
    let sketch;
    if (sketch = Manager.sketch.getSketckById(win.__sketch_switch_sid__)) {
        p('has sketch!');
        //
    } else {
        let options = {};
        if (!Prefs.screenshot.get('drawingHardMode')) {
            options.buttons = ['Close', 'RedPen', 'BlackPen', 'Eraser', 'Clear'];
            options.noCreatePalette = true;
        }
        sketch = new SketchSwitch(win, options);
        Manager.sketch.addSketch(sketch);
        win.__sketch_switch_sid__ = sketch.sid;
        var unloader = function(event) {
            p('remove sketch obj: ' + Manager.sketch.removeSketch(win.__sketch_switch_sid__));
            sketch.destroy();
            win.removeEventListener('unload', unloader, false);
        };
        win.addEventListener('unload', unloader, false);
    }
    sketch.hideMenuMoving = Prefs.screenshot.get('hideMenuMoving');
    sketch.show();
    // var random = Math.random().toString().slice(2);
};

Manager.Base = {
    createFinish: function() {
        let sketch;
        if (window.content && 
            (sketch = Manager.sketch.getSketckById(window.content.__sketch_switch_sid__))) {
            if (sketch.shownMenu) {
                sketch.hideMenu();

                return function() {
                    sketch.showMenu();
                    p('capture finish (show menu)');
                }
            }
        }
        return function() {
            p('capture finish');
        };
    },
    all: function() {
        this.capture('all', this.createFinish());
    },
    rect: function() {
        this.capture('rect', this.createFinish());
    },
    inner: function() {
        this.capture('inner', this.createFinish());
    }
};

Manager.Upload = extend({}, Manager.Base);
extend(Manager.Upload, {
    capture: function(method, finish) {
        p('upload capture: ' + method);
        // method: all, rect, inner
        if (!User.user) {
            openUILinkIn("http://www.hatena.ne.jp/tool/hatenascreenshot?ref=login", 'tab');
            finish();
            return;
        }

        if (method == 'rect') {
            let self = this;
            Capture.rect(true, function(data) {
                self._capture(method, data, finish);
            });
        } else {
            this._capture(method, null, finish);
        }
    },

    _capture: function(method, data, finish) {
        let config = this.configDialog();
        if (config.accept) {
            p('capture accept (config):' + uneval(config));
            let user = User.user;

            let params = {
                application: config.application,
            };
            let that = this;
            let options = {
                callback: function (res) {
                    return that.callback(res, params);
                },
                errorback: function (res) {
                    return that.errorback(res);
                },
            };

            if (config.folder) options.folder = config.folder;
            if (config.fotosize) {
                options.fotosize= config.fotosize;
            } else {
                options.fotosize= 100000;
            }

            this._showLoadingStatus();

            if (!data) {
                Capture[method](true, function(data) {
                    user.uploadData(data, options);
                    finish();
                });
            } else {
                // rect
                user.uploadData(data, options);
                finish();
            }
        } else {
            finish();
        }
    },

    configDialog: function() {
        let config = {};
        window.openDialog(
            'chrome://hatenascreenshot/content/uploadConfig.xul',
            'アップロードの設定',
            'chrome,modal,resizable=yes,centerscreen',
            config 
        ).focus();
        return config;
    },

    callback: function(res, params) {
        let m;
        p('upload success: ' + res.responseText);
        this._hideLoadingStatus();

        let fotolifeNotation = res.responseText;
        if (m = fotolifeNotation.match(/:(\d{14})/)) {
            let timestamp = m[1];
            if (params.application == 'haiku') {
                let permalink = 'http://h.hatena.ne.jp/?_charset_=utf-8&body=' + encodeURIComponent(fotolifeNotation + "\n");
                openUILinkIn(permalink, 'tab');
            } else if (params.application == 'diary') {
                let permalink = 'http://d.hatena.ne.jp/refer?appendbody=' + encodeURIComponent(fotolifeNotation + "\n");
                openUILinkIn(permalink, 'tab');
            } else if (params.application == 'twitter') {
                let permalink = 'http://twitter.com/?status=' + encodeURIComponent(User.user.getPermalink(timestamp) + "\n");
                openUILinkIn(permalink, 'tab');
            } else { // fotolife
                let permalink = User.user.getPermalink(timestamp) + '?ref=hatena-screenshot';
                setTimeout(function() {
                    // タイミングによって fotolife の slave に反映されてないため、ちょっと間をおく
                    p('open link: ' + permalink);
                    openUILinkIn(permalink, 'tab');
                }, 100);
            }
        }
    },

    errorback: function(res) {
        this._hideLoadingStatus();
        window.alert(convertStringEncoding('フォトライフへのアップロードに失敗しました'));
    },

    // UI 操作
    _hideLoadingStatus: function () {
        var e = document.getElementById("hScreenshot-toolbar-button");
        if (e) e.removeAttribute("loading");
    },
    _showLoadingStatus: function () {
        var e = document.getElementById("hScreenshot-toolbar-button");
        if (e) e.setAttribute("loading", "true");
    },
});

Manager.Copy = extend({}, Manager.Base, false);
extend(Manager.Copy, {
    capture: function(method, finish) {
        p('copy capture: ' + method);
        Capture[method](false, function(data) {
            if (data) {
                ExCanvas.prototype.dataURItoClipboard(data);
            }
            finish();
        });
    },
});

Manager.Base64 = extend({}, Manager.Base, false);
extend(Manager.Base64, {
    capture: function(method, finish) {
        p('copy capture: ' + method);
        Capture[method](false, function(data) {
            if (data) {
                openUILinkIn(data, 'tab');
            }
            finish();
        });
    },
});

Manager.Save = extend({}, Manager.Base);
extend(Manager.Save, {
    capture: function(method, finish) {
        p('save capture: ' + method);
        Capture[method](false, function(data) {
            if (data) {
                let uri = IOService.newURI(data, null, null);
                let filePicker = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
                filePicker.init(window, UIEncodeText('ファイルに保存'), filePicker.modeSave);
                filePicker.appendFilters(filePicker.filterImages);
                // filePicker.appendFilters(UIEncodeText('png 画像ファイル'), "*.png;");
                filePicker.defaultString = (window.content.document.title || 'screenshot') + '.png';
                if ((filePicker.show() == filePicker.returnCancel) || !filePicker.file) return;

                let wbp = Cc['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
                  .createInstance(Ci.nsIWebBrowserPersist);

                // 第 7 引数は関連するウィンドウやドキュメントから引き出されるコンテキスト
                // プライベート情報が流出しないようにするために使われる
                var privacyContext =
                        window.QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIWebNavigation)
                              .QueryInterface(Ci.nsILoadContext);
                wbp.saveURI(uri, null, null, null, null, filePicker.file, privacyContext);
            }
            finish();
        });
    },
});


