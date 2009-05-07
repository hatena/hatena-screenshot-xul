

const EXPORT = ['UploadConfig'];

function UploadConfig(dialog) {
    this.dialog = dialog;
    this.dialog.manager = this;
    // this.tagList = new TagList(document.getElementById("tag-list"));
    // this.tagList.treeBody.addEventListener(
    //     "click", method(this, "onTagListClick"), false);
    this.argument = window.arguments[0] || {};
}

extend(UploadConfig.prototype, {
    destroy: function () {
        this.dialog.manager = null;
        this.dialog = null;
        // this.tagList = null;
    },

    onAccept: function (event) {
        // this.argument.tag = this.tagList.selectedTag;
        return true;
    },

    onTagListClick: function (event) {
        if (event.button === 0 && event.detail === 2)
            this.dialog.acceptDialog();
    }
});


