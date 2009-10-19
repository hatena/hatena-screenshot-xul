
EventService.createListener('firstPreload', function() {
    if (!Prefs.screenshot.get('installComplete')) {
       Prefs.screenshot.set('installComplete', true);
       setTimeout(function() {
           openUILinkIn("http://www.hatena.ne.jp/tool/hatenascreenshot?ref=install", 'tab');
       }, 1000);
    }
});
