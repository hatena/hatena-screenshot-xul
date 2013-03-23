(function () { "use strict";

window.addEventListener("load", function el(evt) {
    if (evt.target !== window.document) return;
    window.removeEventListener("load", el, false);

    var manager = new hScreenshot.UploadConfig(document.documentElement);

    var elem = document.getElementById("image-size-checkbox");
    elem.addEventListener("command", function (evt) {
        manager.checkCheckbox();
    }, false);
}, false);
window.addEventListener("unload", function el(evt) {
    if (evt.target !== window.document) return;
    window.removeEventListener("unload", el, false);

    document.documentElement.manager.destroy();
}, false);

}).call(this);
