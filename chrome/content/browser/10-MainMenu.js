
const EXPORT = ['MainMenu'];

var MainMenu = {};

MainMenu.draw = function() {
};

MainMenu.Upload = {
    all: function() {
        let config = {};
        window.openDialog(
            'chrome://hatenafotolife/content/uploadConfig.xul',
            'アップロードの設定',
            'chrome,modal,resizable=no,centerscreen',
            config 
        ).focus();

        p('config');
        p.e(config);
        // let dataURI = Capture.all(true);
    },
    rect: function() {
        //let dataURI = Capture.rect();
    },
    inner: function() {
        // let inner = Capture.rect();
    },
};

MainMenu.Copy = {
    all: function() {
    },
    rect: function() {
    },
    inner: function() {
    },
};

MainMenu.Copy = {
    all: function() {
    },
    rect: function() {
    },
    inner: function() {
    },
};

