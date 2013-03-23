

const EXPORT = ['UploadConfig'];

function UploadConfig(dialog) {
    this.dialog = dialog;
    this.dialog.manager = this;
    this.restoreOptions();

    this.folders = document.getElementById('folders');
    this.folderMenuList = document.getElementById('folder-menulist');
    this.checkbox = document.getElementById('image-size-checkbox');
    this.imageSize = document.getElementById('image-size');
    this.applications = document.getElementById('applications');
    this.applicationMenuList = document.getElementById('application-menulist');

    document.getElementById('username').value = sprintf(UIEncodeText('現在、%s でログインしています。'), User.user.name);

    this.config = window.arguments[0] || {};
    var self = this;
    User.user.getAsyncInfo(function(info) {
        p(info);
        //let info = User.user.info;
        if (info.fotosize)
            self.imageSize.value = info.fotosize;

        if (self.options.fotosize) 
            self.imageSize.value = self.options.fotosize;

        if (self.options.checkCheckbox)
            self.checkbox.checked = true;

        self.setFolders(info.folder_list, self.options.defaultFolder);
        let appName = self.options.defaultApplication || 'fotolife';
        let appItems = self.applications.childNodes;
        for (var i = 0; i < appItems.length; i++) {
            let appItem = appItems[i];
            if (appItem.localName == 'menuitem' && appItem.value == appName) {
                self.applicationMenuList.selectedItem = appItem;
                break;
            }
        }
        self.checkCheckbox();
    });
}

extend(UploadConfig.prototype, {
    restoreOptions: function() {
        let options = {};
        try {
            options = decodeJSON(Prefs.screenshot.get('uploadConfig'));
        } catch(e) {
        }
        this.options = options || {}; 
    },
    __createFolderMenuitemElem: function (folderName, isPrivateFolder) {
        var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        let item = document.createElementNS(XUL_NS, "menuitem");
        item.setAttribute("value", folderName);
        item.setAttribute("label", folderName);
        item.className = (isPrivateFolder ? "item-private" : "item-public");
        return item;
    },
    setFolders: function(folderList, defaultFolder) {
        if (!folderList) return;
        if (!folderList.length) return;

        var that = this;
        folderList.forEach(function (folder) {
            var folderName = folder.folder;
            var isPrivateFolder = (folder.status !== "public");

            var item = that.__createFolderMenuitemElem(folderName, isPrivateFolder);
            that.folders.appendChild(item);
            if (defaultFolder && folderName === defaultFolder) {
                that.folderMenuList.selectedItem = item;
            }
        });
    },

    destroy: function () {
        this.dialog.manager = null;
        this.dialog = null;
    },

    onAccept: function (event) {
        let options = {};
        this.config.accept = true;
        this.config.folder = this.folderMenuList.selectedItem.value;
        this.config.application = this.applicationMenuList.selectedItem.value;
        if (this.config.folder) 
            options.defaultFolder = this.config.folder;
        if (this.config.application) 
            options.defaultApplication = this.config.application;
        
        options.fotosize = parseInt(this.imageSize.value);
        if (this.checkbox.checked) {
            this.config.fotosize = parseInt(this.imageSize.value);
            options.checkCheckbox = true;
        } else {
            options.checkCheckbox = false;
        }
        try {
            Prefs.screenshot.set('uploadConfig', encodeJSON(options));
        } catch(e) {};
        return true;
    },

    checkCheckbox: function() {
        if (this.checkbox.checked) {
            this.imageSize.removeAttribute('disabled');
        } else {
            this.imageSize.setAttribute('disabled', true);
        }
    },

    onCancel: function(event) {
        this.config.cancel = true;
        return true;
    },
});
