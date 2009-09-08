
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
        options.buttons = ['Close', 'Clear', 'RedPen', 'BlackPen', 'Eraser'];
        options.noCreatePalette = true;
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

Manager.showPopup = function(event) {
    if (event.ctrlKey) {
        return Manager.draw();
    }
    let icon = document.getElementById('hScreenshot-statusIcon');
    let menu = document.getElementById('hScreenshot-menu-popup');
    menu = menu.cloneNode(true);
    icon.parentNode.appendChild(menu);
    menu.openPopup(icon, 'before_end', 0, 0, false, true);
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
        // XXX: ログインチェックを挟む
        if (!User.user) {
            if (window.confirm(convertStringEncoding('フォトライフにアップロードするには、はてなへのログインが必要です。'))) {
                openUILinkIn("https://www.hatena.ne.jp/login?location=http%3A%2F%2Ff.hatena.ne.jp%2F%3Fhelp", 'tab');
            }
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

            let options = {
                callback: this.callback,
                errorback: this.errorback,
            };

            if (config.folder) options.folder = config.folder;
            if (config.fotosize) {
                options.fotosize= config.fotosize;
            } else {
                options.fotosize= 100000;
            }

            document.getElementById('hScreenshot-statusIcon').setAttribute('loading', 'true');

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

    callback: function(res) {
        let m;
        p('upload success: ' + res.responseText);
        document.getElementById('hScreenshot-statusIcon').removeAttribute('loading');
        if (m = res.responseText.match(/:(\d{14})/)) {
            let timestamp = m[1];
            let permalink = User.user.getPermalink(timestamp) + '?ref=hatena-screenshot';
            setTimeout(function() {
                // タイミングによって fotolife の slave に反映されてないため、ちょっと間をおく
                // XXX: 1000 ms でも反映されない場合が…
                p('open link: ' + permalink);
                openUILinkIn(permalink, 'tab');
            }, 100);
        }
    },

    errorback: function(res) {
        document.getElementById('hScreenshot-statusIcon').removeAttribute('loading');
        window.alert(convertStringEncoding('フォトライフへののアップロードに失敗しました'));
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
                wbp.saveURI(uri, null, null, null, null, filePicker.file);
            }
            finish();
        });
    },
});


