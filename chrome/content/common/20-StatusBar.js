
var checkStatusBar = function() {
    var v = Prefs.fotolife.get('statusbar');
    var s = getTopWin().document.getElementById('hFotolife-statusBarPanel');
    if (v) {
        s.removeAttribute('hidden');
    } else {
        s.setAttribute('hidden', true);
    }
};

Prefs.fotolife.createListener('statusbar', checkStatusBar);

EventService.createListener('load', function() {
    checkStatusBar();
});

