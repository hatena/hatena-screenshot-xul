
const Export = ['Capture'];

var Capture = {
};

EventService.createListener('load', function() {
    setTimeout(function() {
        let ex = new ExCanvas(document);
        let dataURI = ex.captureContent(window.content, {
            all: true,
            cutBase64: true
        });

        var api = 'http://f.hatena.ne.jp/thirdlife/haiku'

        if (!User.user) {
            p('not user');
            return;
        }

        let user = User.user;
        p('post');
        let options = {
            folder: 'bar',
            fotosize: 10000,
        };
        options.callback = function() {
        };
        options.errorback = function() {
        };
        user.uploadData(dataURI, options);
    }, 1000);
});

