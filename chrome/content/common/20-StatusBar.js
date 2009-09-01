
var checkStatusBar = function() {
    var v = Prefs.screenshot.get('statusbar');
    var s = getTopWin().document.getElementById('hScreenshot-statusBarPanel');
    if (v) {
        s.removeAttribute('hidden');
    } else {
        s.setAttribute('hidden', true);
    }
};

Prefs.screenshot.createListener('statusbar', checkStatusBar);

EventService.createListener('load', function() {
    checkStatusBar();
});

