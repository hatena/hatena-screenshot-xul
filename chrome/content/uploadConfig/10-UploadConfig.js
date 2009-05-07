

const EXPORT = ['UploadConfig'];

function UploadConfig(dialog) {
    this.dialog = dialog;
    this.dialog.manager = this;
    this.folders = document.getElementById('folders');
    this.folderMenuList = document.getElementById('folder-menulist');
    this.checkbox = document.getElementById('image-size-checkbox');
    this.imageSize = document.getElementById('image-size');
    document.getElementById('username').value = sprintf(UIEncodeText('現在、%s でログインしています。'), User.user.name);

    let info = User.user.info;
    if (info.fotosize)
        this.imageSize.value = info.fotosize;

    this.setFolders(info.folder_list);
    this.checkCheckbox();
    this.config = window.arguments[0] || {};
}

extend(UploadConfig.prototype, {
    setFolders: function(folderList) {
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
            }
        }
    },

    destroy: function () {
        this.dialog.manager = null;
        this.dialog = null;
    },

    onAccept: function (event) {
        this.config.accept = true;
        this.config.folder = this.folderMenuList.selectedItem.value;
        if (this.checkbox.checked) {
            this.config.fotosize = parseInt(this.imageSize.value);
        }
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


