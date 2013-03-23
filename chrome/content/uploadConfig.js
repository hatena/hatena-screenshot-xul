(function () { "use strict";

window.addEventListener("load", function el(evt) {
    if (evt.target !== window.document) return;
    window.removeEventListener("load", el, false);

    var manager = new hScreenshot.UploadConfig(document.documentElement);

    var elem = document.getElementById("image-size-checkbox");
    // なんで mouseup なんだろう
    elem.addEventListener("mouseup", function (evt) {
        manager.checkboxHandler(evt);
    }, false);
}, false);
window.addEventListener("unload", function el(evt) {
    if (evt.target !== window.document) return;
    window.removeEventListener("unload", el, false);

    document.documentElement.manager.destroy();
}, false);

}).call(this);
