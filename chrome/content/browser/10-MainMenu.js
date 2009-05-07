
const EXPORT = ['MainMenu'];

var MainMenu = {};

MainMenu.draw = function() {
};

MainMenu.Base = {
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

MainMenu.Upload = extend({}, MainMenu.Base);
extend(MainMenu.Upload, {
    capture: function(method) {
        p('upload capture: ' + method);
        // method: all, rect, inner
        // XXX: ログインチェックを挟む
        let config = this.configDialog();
        if (config.accept) {
            p('capture accept (config):' + uneval(config));
            let data = Capture[method](true);
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
            user.uploadData(data, options);
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
                // タイミングによって slave に反映されてないため、ちょっと間をおく
                openUILinkIn(permalink, 'tab');
            }, 500);
        }
    },

    errorback: function(res) {
        window.alert('フォトライフへののアップロードに失敗しました');
    },
});

MainMenu.Copy = extend({}, MainMenu.Base);
extend(MainMenu.Copy, {
    capture: function(method) {
        p('copy capture: ' + method);
        let data = Capture[method](false);
        ExCanvas.prototype.dataURItoClipboard(data);
    },
});

MainMenu.Save = extend({}, MainMenu.Base);
extend(MainMenu.Save, {
    capture: function(method) {
        p('save capture: ' + method);
        let data = Capture[method](false);

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
    },
});



