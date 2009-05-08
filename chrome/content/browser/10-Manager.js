
const EXPORT = ['Manager'];

var Manager = {};

Manager.sketch = {
    sketches: {},
    hasSketch: function(sketch) {
        let sketches = this.sketches;
        for (let key in sketches) {
            if (key.__sketch_switch_sid__ == sketch.sid) {
                return key;
            }
        }
        return false;
    },
    removeSketch: function(sketch) {
        let key = this.hasSketch(sketch);
        if (key) {
            delete this.sketches[key];
            return true;
        } else {
            return false;
        }
    },
    addSketch: function(sketch) {
        this.sketches[sketch.win] = sketch;
        sketch.win.__sketch_switch_sid__ = sketch.sid;
    },
    getSketckById: function(sid) {
        if (!sid) return;
        for (let key in sketches) {
            if (key.__sketch_switch_sid__ == sid) {
                return sketch[key];
            }
        }
        return;
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
        sketch = new SketchSwitch(win);
        Manager.sketch.addSketch(sketch);
        var unloader = function(event) {
            p('remove sketch obj: ' + Manager.sketch.removeSketch(sketch));
            win.removeEventListener('unload', unloader, false);
        };
        win.addEventListener('unload', unloader, false);
    }
    sketch.show();
    // var random = Math.random().toString().slice(2);
};

Manager.showPopup = function() {
    let icon = document.getElementById('hFotolife-statusIcon');
    let menu = document.getElementById('hFotolife-menu-popup');
    menu = menu.cloneNode(true);
    icon.parentNode.appendChild(menu);
    menu.openPopup(icon, 'before_end', 0, 0, false, true);
};

Manager.Base = {
    all: function() {
        this.capture('all');
    },
    rect: function() {
        this.capture('rect');
    },
    inner: function() {
        this.capture('inner');
    }
};

Manager.Upload = extend({}, Manager.Base);
extend(Manager.Upload, {
    capture: function(method) {
        p('upload capture: ' + method);
        // method: all, rect, inner
        // XXX: ログインチェックを挟む
        if (!User.user) {
            window.config('フォトライフへのログインが必要です。');
            return;
        }

        if (method == 'rect') {
            let self = this;
            Capture.rect(true, function(data) {
                self._capture(method, data);
            });
        } else {
            this._capture(method);
        }
    },

    _capture: function(method, data) {
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

            // ロード画面とか出した方がよい？
            if (!data) {
                Capture[method](true, function(data) {
                    user.uploadData(data, options);
                });
            } else {
                // rect
                user.uploadData(data, options);
            }
        }   
    },

    configDialog: function() {
        let config = {};
        window.openDialog(
            'chrome://hatenafotolife/content/uploadConfig.xul',
            'アップロードの設定',
            'chrome,modal,resizable=no,centerscreen',
            config 
        ).focus();
        return config;
    },

    callback: function(res) {
        let m;
        p('upload success: ' + res.responseText);
        if (m = res.responseText.match(/:(\d{14})/)) {
            let timestamp = m[1];
            let permalink = User.user.getPermalink(timestamp);
            setTimeout(function() {
                // タイミングによって fotolife の slave に反映されてないため、ちょっと間をおく
                // XXX: 1000 ms でも反映されない場合が…
                p('open link: ' + permalink);
                openUILinkIn(permalink, 'tab');
            }, 1000);
        }
    },

    errorback: function(res) {
        window.alert('フォトライフへののアップロードに失敗しました');
    },
});

Manager.Copy = extend({}, Manager.Base);
extend(Manager.Copy, {
    capture: function(method) {
        p('copy capture: ' + method);
        Capture[method](false, function(data) {
            if (!data) return;
            ExCanvas.prototype.dataURItoClipboard(data);
        });
    },
});

Manager.Save = extend({}, Manager.Base);
extend(Manager.Save, {
    capture: function(method) {
        p('save capture: ' + method);
        Capture[method](false, function(data) {
            if (!data) return;

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
        });
    },
});


