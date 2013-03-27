
const EXPORT = ['ExCanvas'];

var ExCanvas = function(doc) {
    if (!doc) doc = document;
    this._doc = doc;
    this.clearCanvas();
};

ExCanvas.prototype = {
    clearCanvas: function(doc) {
        if (!doc) 
            doc = this._doc || document;
        this.canvas = doc.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
    },

    // return DataURI
    capture: function(win, pos, dim, scale, ext) {
        let canvas = this.canvas;
        let ctx = canvas.getContext('2d');
        p('capture pos, dim:' + uneval([pos, dim]));
        canvas.width = dim.width;
        canvas.height = dim.height;
        
        if (scale) {
            canvas.width = dim.width * scale;
            canvas.height = dim.height * scale;
            ctx.scale(scale, scale);
        }
        
        ctx.drawWindow(win, pos.x, pos.y, dim.width, dim.height, 'rgb(255,255,255)');
        ctx.restore();

        return canvas.toDataURL('image/' + (ext || 'png'), ext == 'jpeg' ? 'quality=95' : '');
    },

    captureContent: function(content, options) {
        if (!options) options = {};

        let pos = {
            x: content.scrollX,
            y: content.scrollY,
        };

        let dim = {
            width: content.innerWidth,
            height: content.innerHeight,
        };

        if (options.all) {
            let html = content.document.getElementsByTagName('html')[0];
            let win = content;
            let doc = win.document;
            let origOverflow = doc.body.style.overflow;
            doc.body.style.overflow = 'hidden';
            dim.width = Math.max(doc.documentElement.scrollWidth, win.innerWidth);
            dim.height= Math.max(doc.documentElement.scrollHeight, win.innerHeight);
            doc.body.style.overflow = origOverflow;

            pos = {x: 0, y:0};
        } else {
            [pos, dim] = this.getInlineContentPos(content);
        }

        let ext = options.ext ? options.ext : 'png';
        let scale = options.scale ? parseFloat(options.scale) : 1;
        let dataURI = this.capture(content, pos, dim, scale, ext);
        if (options.cutBase64) {
            dataURI = this.cutBase64(dataURI);
        }
        return dataURI;
    },

    cutBase64: function(dataURI) {
        return dataURI.replace(/^.*?,/, '');
    },

    dataURItoClipboard: function dataURItoClipboard(uri, content) {
        if (!content) content = window.content;
        let img = new content.Image();
        img.addEventListener('load', function() {
            document.popupNode = img;
            goDoCommand('cmd_copyImage');
            if (img.parentNode) img.parentNode.removeChild(img);
        }, false);
        img.setAttribute('style', 'display: none');
        let body = content.document.body.appendChild(img);
        img.setAttribute('src', uri);
    },

    getInlineContentPos: function(content) {
        let pos = {
            x: content.scrollX,
            y: content.scrollY,
        };

        let dim = {
            // content.documentElement.clientWidth とか使った方が良さそう
            // http://www.w3.org/TR/cssom-view/
            // content.documentElement.clientWidth と content.documentElement.offsetWidth は同じ?
            width: content.innerWidth,
            height: content.innerHeight,
        };
        return [pos, dim];
    },

    elementRect: function elementRect(el, content) {
        let rect = el.getBoundingClientRect();
        if (rect.wrappedJSObject) rect = rect.wrappedJSObject;

        let pos = {
            x: parseInt(content.scrollX + rect.left), 
            y: parseInt(content.scrollY + rect.top)
        };
        let dim = {
            width: parseInt(rect.right - rect.left), 
            height: parseInt(rect.bottom - rect.top)
        };
        return [pos, dim];
    },
};

