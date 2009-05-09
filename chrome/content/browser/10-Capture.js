
const EXPORT = ['Capture'];

var Capture = {
    all: function(cutBase64, onFinish) {
         let ex = new ExCanvas(document);
         onFinish(ex.captureContent(window.content, {
             all: true,
             cutBase64: cutBase64
         }));
    },

    inner: function(cutBase64, onFinish) {
         let ex = new ExCanvas(document);
         onFinish(ex.captureContent(window.content, {
             all: false,
             cutBase64: cutBase64
         }));
    },

    rect: function(cutBase64, onFinish) {
        if (!onFinish) onFinish = function() {};

        if (!window.content) return onFinish();

        let [win, doc] = [window.content, window.content.document];
        let origOverflow = doc.body.style.overflow;
        doc.body.style.overflow = 'hidden';
        let width = Math.max(doc.documentElement.scrollWidth, win.innerWidth);
        let height= Math.max(doc.documentElement.scrollHeight, win.innerHeight);
        doc.body.style.overflow = origOverflow;

        p.e('rect size:' + [width, height].join(','));
        let canvas = document.createElementNS(XHTML_NS, 'canvas');

        canvas.width = width;
        canvas.height = height;

        with (canvas.style) {
            position = 'absolute';
            top      = '0';
            left     = '0';
            zIndex   = '99995';
            opacity  = '0.7';
        };

        let ctx = canvas.getContext('2d');
        let clear = function() {
            // ctx.fillStyle = 'rgba(141, 161, 191, 0.7)';
            // alpha で塗りつぶすと、どんどん濃くなるため
            // clearRect して塗りつぶせばおｋ
            ctx.fillStyle = 'rgb(141, 161, 191)';
            ctx.fillRect(0, 0, width, height);
        };

        clear();

        let getPoint = function(event) {
            return { x: event.clientX + win.pageXOffset, y:event.clientY + win.pageYOffset};
        }

        let getRectByPoint = function(point1, point2) {
            return [
                Math.min(point1.x, point2.x), 
                Math.min(point1.y, point2.y), 
                Math.abs(point1.x - point2.x), 
                Math.abs(point1.y - point2.y)
            ];
        };

        canvas.addEventListener('mousedown', function(event) {
            event.preventDefault();
            let point = getPoint(event);

            canvas.addEventListener('mousemove', function(event) {
                event.preventDefault();
                let nowPoint = getPoint(event);

                clear();
                // ctx.fillStyle = 'rgb(255,255,255)';
                ctx.clearRect.apply(ctx, getRectByPoint(nowPoint, point));
            }, false);

            canvas.addEventListener('mouseup', function(event) {
                event.preventDefault();
                let nowPoint = getPoint(event);
                let pos = {};
                let dim = {};
                [pos.x, pos.y, dim.width, dim.height] = getRectByPoint(nowPoint, point);
                p('get rect: ' + uneval([pos.x, pos.y, dim.width, dim.height]));

                if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
                canvas = null;

                let ex = new ExCanvas(document);
                let dataURI = ex.capture(win, pos, dim, 1, 'png');
                if (cutBase64) {
                    dataURI = ex.cutBase64(dataURI);
                }
                onFinish(dataURI);
            }, false);
        }, false);

        doc.body.appendChild(canvas);
    },

};

// 
// EventService.createListener('load', function() {
//     setTimeout(function() {
//         return;
//         let ex = new ExCanvas(document);
//         let dataURI = ex.captureContent(window.content, {
//             all: true,
//             cutBase64: true
//         });
// 
//         var api = 'http://f.hatena.ne.jp/thirdlife/haiku'
// 
//         if (!User.user) {
//             p('not user');
//             return;
//         }
// 
//         let user = User.user;
//         p('post');
//         let options = {
//             folder: 'bar',
//             fotosize: 10000,
//         };
//         options.callback = function() {
//         };
//         options.errorback = function() {
//         };
//         user.uploadData(dataURI, options);
//     }, 2000);
// });

