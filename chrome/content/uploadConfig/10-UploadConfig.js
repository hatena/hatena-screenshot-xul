

const EXPORT = ['UploadConfig'];

function UploadConfig(dialog) {
    this.dialog = dialog;
    this.dialog.manager = this;
    this.restoreOptions();

    this.folders = document.getElementById('folders');
    this.folderMenuList = document.getElementById('folder-menulist');
    this.checkbox = document.getElementById('image-size-checkbox');
    this.imageSize = document.getElementById('image-size');

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
    setFolders: function(folderList, defaultFolder) {
        if (folderList && folderList.length) {
            for (var i = 0;  i < folderList.length; i++) {
                let folder = folderList[i];
                let item = document.createElement('menuitem');
                item.setAttribute('value', folder.folder);
                item.setAttribute('label', folder.folder);
                if (folder.status != 'public') {
                    item.setAttribute('class', 'item-private');
                } else {
                    item.setAttribute('class', 'item-public');
                }
                this.folders.appendChild(item);
                if (defaultFolder && folder.folder == defaultFolder) {
                    this.folderMenuList.selectedItem = item;
                }
            }
        }
    },

    destroy: function () {
        this.dialog.manager = null;
        this.dialog = null;
    },

    onAccept: function (event) {
        let options = {};
        this.config.accept = true;
        this.config.folder = this.folderMenuList.selectedItem.value;
        if (this.config.folder) 
            options.defaultFolder = this.config.folder;
        
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

    checkboxHandler: function(event) {
        setTimeout(function(self) {
            self.checkCheckbox();
        }, 30, this);
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


