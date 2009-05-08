
const EXPORT = ['SketchSwitch'];

/*
 * SketchSwitch / - / X
 * Canvas Drawing Tool (overlay window) for Firefox.
 *
 * License: MIT
 * author: Yuichi Tateno 
 *
 * require JSColor.js
 */

var SketchSwitch = function(win) {
    this.sid = SketchSwitch.__sid__++;
    this._win = win || window;
    this.active = true;
    this.brushOptions = {};
    this.init('__sketch_switch_canvas__');
    this.currentBrush = new SketchSwitch.Brushes.Pen();
};

SketchSwitch.__sid__ = 1;

SketchSwitch.prototype = {
    destroy: function() {
        this.win.removeEventListener('keydown', this.keydowHandler, false);
        this.canvas = null;
        this._preview = null;
        this.underCanvas = null;
        this.undoCanvas = null;
        this._win = null;
    },

    get win() {
        return this._win;
    },
    get doc() {
        return this.win.document;
    },
    get width() {
        return this.canvas.width;
    },
    get height() {
        return this.canvas.height;
    },
    get ctx() {
        return this.canvas.ctx;
    },
    init: function(canvasID) {
        this.canvas = this.createCanvas(canvasID);
        this.createUnderCanvas();
        // this.createUndoCanvas();
        SketchSwitch.Utils.initCanvas(this.canvas);

        var self = this;
        this.canvas.addEventListener('mousedown', function(event) {
            self.mousedownHandler(event);
        }, false);

        this.canvas.addEventListener('mousemove', function(event) {
            self.mousemoveHandler(event);
        }, false);

        this.toolMenu = new SketchSwitch.ToolMenu(this);

        this.keydowHandler = function(event) {
            if (self.shownMenu) {
                // event.preventDefault();
                self.toolMenu.callShortcut(event);
            }
        }
        this.win.addEventListener('keydown', this.keydowHandler, false);
    },
    mousemoveHandler: function(event) {
        this.lastPoint = SketchSwitch.Utils.getPoint(event, this.win);
    },
    copyColor: function(point) {
        var ctx = this.ctx;
        var d = (ctx.wrappedJSObject || ctx).getImageData(point.x, point.y, 1,1);
        var data = d.data;

        var bctx = this.underCanvas.ctx;
        var b = (bctx.wrappedJSObject || bctx).getImageData(point.x, point.y, 1,1);
        var bdata = b.data;
        if (data[3] == 0) {
            //
        } else {
            // 本当はスクリーン乗算のアルファブレンディングすべき
            bdata = data;
        }
        this.toolMenu.setColor('rgb(' + [bdata.slice(0,3)].join(',') + ')');
    },
    createUnderCanvas: function() {
        // underCanvas は表示領域におかない
        var underCanvas = this.createCanvas(this.canvas.id + '_under__');
        underCanvas.ctx.drawWindow(this.win, 0, 0, this.width, this.height, 'rgb(255,255,255)');
        this.underCanvas = underCanvas;
    },
    createUndoCanvas: function() {
        var undoCanvas = this.createCanvas(this.canvas.id + '_undo__');
        SketchSwitch.Utils.clearCanvas(undoCanvas);
        this.undoCanvas = undoCanvas;
    },
    createCanvas: function(canvasID) {
        var canvas = this.doc.createElement('canvas');
        canvas.id = canvasID;
        canvas.width = Math.max(this.doc.documentElement.scrollWidth, this.win.innerWidth);
        canvas.height = Math.max(this.doc.documentElement.scrollHeight, this.win.innerHeight);
        with (canvas.style) {
            position = 'absolute';
            top      = '0';
            left     = '0';
            zIndex   = '99990';
        };
        var ctx = canvas.getContext('2d');
        canvas.ctx = ctx;
        return canvas;
    },
    get preview() {
        if (!this._preview) {
            var preview = this.createCanvas(this.canvas.canvasID + '_preview__');
            preview.style.zIndex = parseInt(this.canvas.style.zIndex) + 3;
            this._preview = preview;
        }
        return this._preview;
    },
    addHistory: function(canvas) {
        // this.copyCanvas(canvas, this.undoCanvas);
    },
    copyCanvas: function(from, to) {
        var ctx = from.ctx;
        var d = (ctx.wrappedJSObject || ctx).getImageData(0, 0, from.width, from.height);

        SketchSwitch.Utils.clearCanvas(to);
        var x = to.ctx;

        (x.wrappedJSObject || x).putImageData(d, 0, 0);
    },
    undo: function() {
        // ふつうにやるとメモリ食い過ぎるので 1 回のみ
        // preview を利用してしまう
        // それでも putImageData が重いので、現在は動かしていない
        this.copyCanvas(this.canvas, this.preview);
        this.copyCanvas(this.undoCanvas, this.canvas);
        this.copyCanvas(this.preview, this.undoCanvas);
    },
    mousedownHandler: function(event) {
        if (this.nowDrawing || !this.active) return;
        this.nowDrawing = true;

        var U = SketchSwitch.Utils;
        var brush = this.currentBrush;
        var canvas = this.canvas;

        var preview = this.preview;
        U.clearCanvas(preview);
        this.doc.body.appendChild(preview);

        var win = this.win;

        brush.sketch = this; // XXX 
        brush.setOptions(this.brushOptions);
        brush.start(canvas, preview, this.underCanvas);
        brush.mouseDown(U.getPoint(event, win));

        var moveHandler;
        if (brush.allowMoving) {
            moveHandler = function(event) {
                brush.mouseMove(U.getPoint(event, win));
            };
            preview.addEventListener('mousemove', moveHandler, false);
        }

        var upHandler = function(event) {
            brush.mouseUp(U.getPoint(event, win));
        };

        preview.addEventListener('mouseup',  upHandler, false);
        preview.addEventListener('mouseout', upHandler, false);

        var self = this;
        var completeHandler = function() {
            if (moveHandler)
                preview.removeEventListener('mousemove', moveHandler, false);
            preview.removeEventListener('mouseup', upHandler, false);
            preview.removeEventListener('mouseout', upHandler, false);
            if ( preview.parentNode ) preview.parentNode.removeChild(preview);
            brush.onComplete = function() {};
            self.nowDrawing = false;
        }
        brush.onComplete = completeHandler;
    },
    clear: function() {
        SketchSwitch.Utils.clearCanvas(this.canvas);
    },
    get shown() {
        return !!this.canvas.parentNode;
    },
    get shownMenu() {
        return this.toolMenu.shown;
    },
    hideMenu: function() {
        this.toolMenu.hide();
    },
    showMenu: function() {
        this.toolMenu.show();
    },
    show: function() {
        this.doc.body.appendChild(this.canvas);
        this.toolMenu.show();
    },
    hide: function() {
        if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
        this.toolMenu.hide();
    }
};

SketchSwitch.Utils = {
    initCanvas: function(canvas) {
        canvas.ctx.fillStyle = 'rgba(255,255,255,0)';
        canvas.ctx.fillRect(0, 0, canvas.width, canvas.height); 
    },

    clearCanvas: function(canvas) {
        canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    getPoint: function(event, win) {
        return { x: event.clientX - win.pageXOffset, y:event.clientY + win.pageYOffset};
    },

    getRectByPoint: function(point1, point2) {
        return [
            Math.min(point1.x, point2.x), 
            Math.min(point1.y, point2.y), 
            Math.abs(point1.x - point2.x), 
            Math.abs(point1.y - point2.y)
        ];
    },

    /*
     * extend Base on MochiKit -> Tombloo
     */
    extend: function(target, source, overwrite){
        overwrite = overwrite == null ? true : overwrite;
        for(var p in source){
            var getter = source.__lookupGetter__(p);
            if(getter)
                target.__defineGetter__(p, getter);
            
            var setter = source.__lookupSetter__(p);
            if(setter)
                target.__defineSetter__(p, setter);
            
            if(!getter && !setter && (overwrite || !(p in target)))
                target[p] = source[p];
        }
        return target;
    },
    createElement: function(doc, tagName, attributes) {
        var elem = doc.createElement(tagName);
        for (var a in attributes) {
            elem[a] = attributes[a];
        }
        var children = Array.prototype.slice.call(arguments, 3);
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (typeof child == 'string')
                child = doc.createTextNode(child);
            if (!child)
                continue;
            elem.appendChild(child);
        }
        return elem;
    },
};

/* ToolMenu */
SketchSwitch.ToolMenu = function(sketch) {
    this.menu = [];
    this.shortcuts = {};
    this.sketch = sketch;
    this.init();
}

SketchSwitch.ToolMenu.DEFAULT_BUTTONS = [
    'Close',
    'Clear',
    'Pen1',
    'Pen2',
    'Pen3',
    'Pen4',
    'Rect',
    'RectEraser',
    'Eraser',
    'Pipet',
    // 'Undo',
    'HidePipet',
    'Alpha'
];

SketchSwitch.ToolMenu.DEFAULT_COLORS = [
    '#000000',
    '#FFFFFF',
    '#9ea1a3',
    // R
    '#D9333F',
    '#F5B199', //*
    '#FFDB4F',
    // G
    '#7EBEAB',
    '#2F5D50',
    // B
    '#706CAA'
];

SketchSwitch.ToolMenu.prototype = {
    hide: function() {
        if (this.table.parentNode) this.table.parentNode.removeChild(this.table);
    },
    show: function() {
        this.doc.body.appendChild(this.table);
    },
    get shown() {
        return !!this.table.parentNode;
    },
    get win () {
        return this.sketch.win;
    },
    get doc () {
        return this.sketch.doc;
    },
    init: function() {
        var E = SketchSwitch.Utils.createElement;
        var doc = this.doc;
        this.table = E(doc, 'table', {
        }, this.tbody = E(doc, 'tbody'));

        this.table.style.borderCollapse = 'collapse';
        with (this.table.style) {
            position = 'fixed';
            top      = '2px';
            left     = '2px';
            border = '3px solid #000000';
            zIndex = this.sketch.canvas.style.zIndex + 1;
            backgroundColor = 'rgba(255,255,255, 0.9)';
        }
        this.table.style.borderColor = '#000000';
        this.setColor(this.table.style.borderColor);

        var buttons = SketchSwitch.ToolMenu.DEFAULT_BUTTONS;
        for (var i = 0;  i < buttons.length; i++) {

            var b = SketchSwitch.Buttons[buttons[i]];
            var button = new b(this.sketch);
            this.appendButton(button);
            if (i == 3) { // XXX
                this.current(button);
            }
        }
        this.createColorPalette();
    },
    createColorPalette: function() {
        var E = SketchSwitch.Utils.createElement;
        var doc = this.doc;
        var tbody;
        var table = E(doc, 'table', {
        }, tbody = E(doc, 'tbody')
        );
        table.style.borderCollapse = 'collapse';
        this.table.appendChild(
            E(doc, 'tr', {}, E(doc, 'td', {}, table))
        );
        var colors = SketchSwitch.ToolMenu.DEFAULT_COLORS;
        for (var i = 0;  i < colors.length; i++) {
            var color = colors[i];
            var td;
            tbody.appendChild(E(doc, 'tr', {}, td = E(doc, 'td', {})));
            td.style.cursor = 'pointer';
            td.style.backgroundColor = color;
            td.width = '20px';
            td.height = '12px';
            var self = this;
            td.addEventListener('click', function(event) {
                self.setColor(event.target.style.backgroundColor);
            }, false);
        }
    },
    callShortcut: function(event) {
        var key = null;
        if (event.ctrlKey) {
            key = 'ctrlKey';
        } else {
            key = String.fromCharCode(event.keyCode).toLowerCase();
        }
        var s = this.shortcuts;
        if (s[key]) 
             this.current(s[key]);
    },
    setColor: function(color) {
        this.sketch.brushOptions.color = color;
        this.table.style.borderColor = color;
    },
    appendButton: function(button) {
        var E = SketchSwitch.Utils.createElement;
        var doc = this.doc;
        this.menu.push(button);
        if (button.shortcut) {
            this.shortcuts[button.shortcut] = button;
        }
        if (button.icon) {
            var icon = E(doc, 'img', {src:button.icon, title: button.name, alt: button.name});
            icon.button = button;
            button.element = icon;
            with(icon.style) {
                cursor = 'pointer';
            }
            var td;
            var tr = E(doc, 'tr', {}, 
                         td = E(doc, 'td', {}, icon)
            );

            with (td.style) {
                padding = '2px 4px 1px 4px';
                borderBottom = '1px solid #CCC';
            }

            this.tbody.appendChild(tr);
            var self = this;
            icon.addEventListener('click', function(event) {
                self.buttonClick(icon);
            }, false);
        };
    },
    buttonClick: function(icon) {
        var button = icon.button;
        this.current(button);
    },
    current: function(button) {
        if (button.clickOnly) {
            button.select();
        } else {
            if (this._currentButton) {
                this._currentButton.unselect();
                this._currentButton.clearBackground();
            }
            this._currentButton = button;
            button.setBackground();
            button.select();
        }
    },
};


/* Buttons */
SketchSwitch.Buttons = {};
SketchSwitch.Buttons.BaseProto = {
    clickOnly: false,
    clearBackground: function() {
        this.element.parentNode.style.backgroundColor = '';
    },
    setBackground: function() {
        this.element.parentNode.style.backgroundColor = 'rgba(91,139,212,0.8)';
    },
    select: function() {},
    unselect: function() {},
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAADoSURBVHjalJJNC0VAGIWZhkLKQln5AVZS8//LXjYWlLWNUj7yEdI93bm5wnU5ZWZq3mfmnHeISZIIT0TxaZp2s7ptWyI8FOWTLMuU0u3GPM/jOP4EUB0EwXaDMYbxyOwtsbewAL+78xz4KxFtRZdUVd1ZmqYJY1VVhmE4jiNJ0nmXuCXXdfM8R7XnecMwRFG0D71V13V93y/LYpqmZVloVxiGVwDsoWh11TQN93MOrEkURSmKwvf9uq4BANN1/Rv6+HBQlmVlWSJ0mqZIgjyEkA9w3Up4i+PYtm2cewvY/nyUT/cf7iXAAEwFdZak1p3gAAAAAElFTkSuQmCC',
};

SketchSwitch.Buttons.Pen1 = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Pen1.prototype = SketchSwitch.Utils.extend({
    shortcut: '1',
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABmJLR0T///////8JWPfcAAAACXBIWXMAAABIAAAASABGyWs+AAAACXZwQWcAAAAQAAAAEABcxq3DAAAAJUlEQVRIx2P4P8CAYdQBow4YdQCcAQb0o0ejYNQBow4YdQAMAADfFKS+zzforwAAAABJRU5ErkJggg==',
    name: 'Pen',
    select: function() {
        this.sketch.currentBrush = new SketchSwitch.Brushes.Pen();
        this.sketch.brushOptions.width = 1;
    },
}, SketchSwitch.Buttons.BaseProto, false);

SketchSwitch.Buttons.Pen2 = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Pen2.prototype = SketchSwitch.Utils.extend({
    shortcut: '2',
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABmJLR0T///////8JWPfcAAAACXBIWXMAAABIAAAASABGyWs+AAAACXZwQWcAAAAQAAAAEABcxq3DAAAAJklEQVRIx2P4P8CAYdQBow4YNA4IBQP60aMOGE2Eow4YdcCgcQAAFDhREu/qhckAAAAASUVORK5CYII=',
    name: 'Pen',
    select: function() {
        this.sketch.currentBrush = new SketchSwitch.Brushes.Pen();
        this.sketch.brushOptions.width = 5;
    },
}, SketchSwitch.Buttons.BaseProto, false);

SketchSwitch.Buttons.Pen3 = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Pen3.prototype = SketchSwitch.Utils.extend({
    shortcut: '3',
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABmJLR0T///////8JWPfcAAAACXBIWXMAAABIAAAASABGyWs+AAAACXZwQWcAAAAQAAAAEABcxq3DAAAAJklEQVRIx2P4P8CAYdQBg8YBoWBAP3rUAaMOGHXAaEE06oBB4wAATHVx41cZkq0AAAAASUVORK5CYII=',
    name: 'Pen',
    select: function() {
        this.sketch.currentBrush = new SketchSwitch.Brushes.Pen();
        this.sketch.brushOptions.width = 10;
    },
}, SketchSwitch.Buttons.BaseProto, false);

SketchSwitch.Buttons.Pen4 = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Pen4.prototype = SketchSwitch.Utils.extend({
    shortcut: '4',
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABmJLR0T///////8JWPfcAAAACXBIWXMAAABIAAAASABGyWs+AAAACXZwQWcAAAAQAAAAEABcxq3DAAAAJ0lEQVRIx2P4P8CAYdA4IBQM6EePOmDUAaMOGHXAqAMGX10wYh0AAISykrTatvf9AAAAAElFTkSuQmCC',
    name: 'Pen',
    select: function() {
        this.sketch.currentBrush = new SketchSwitch.Brushes.Pen();
        this.sketch.brushOptions.width = 30;
    },
}, SketchSwitch.Buttons.BaseProto, false);

SketchSwitch.Buttons.Eraser = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Eraser.prototype = SketchSwitch.Utils.extend({
    shortcut: 'e',
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAACESURBVHjanJMNCoAwCIU3z9gtgjpLUKeoOxoGxjaeqBOE8fRzP05i5uL5dt4sjmJUHNuvh9FajaKwpVEGRjHKwmNOlYfIwq11BbJwd4UZ+FiXSmXSBP5PILuLoGIU/goojIIebLbRKoJ0EhE94JhsnqwdGDRE3qCZQAQWN39itCOvAAMA87rRSihWbbsAAAAASUVORK5CYII=',
    name: 'Eraser',
    select: function() {
        this.sketch.currentBrush = new SketchSwitch.Brushes.Eraser();
    },
}, SketchSwitch.Buttons.BaseProto, false);

SketchSwitch.Buttons.RectEraser = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.RectEraser.prototype = SketchSwitch.Utils.extend({
    shortcut: 'e',
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAACESURBVHjanJMNCoAwCIU3z9gtgjpLUKeoOxoGxjaeqBOE8fRzP05i5uL5dt4sjmJUHNuvh9FajaKwpVEGRjHKwmNOlYfIwq11BbJwd4UZ+FiXSmXSBP5PILuLoGIU/goojIIebLbRKoJ0EhE94JhsnqwdGDRE3qCZQAQWN39itCOvAAMA87rRSihWbbsAAAAASUVORK5CYII=',
    name: 'RectEraser',
    select: function() {
        this.sketch.currentBrush = new SketchSwitch.Brushes.RectEraser();
    },
}, SketchSwitch.Buttons.BaseProto, false);

SketchSwitch.Buttons.Rect = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Rect.prototype = SketchSwitch.Utils.extend({
    shortcut: 'r',
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAACESURBVHjanJMNCoAwCIU3z9gtgjpLUKeoOxoGxjaeqBOE8fRzP05i5uL5dt4sjmJUHNuvh9FajaKwpVEGRjHKwmNOlYfIwq11BbJwd4UZ+FiXSmXSBP5PILuLoGIU/goojIIebLbRKoJ0EhE94JhsnqwdGDRE3qCZQAQWN39itCOvAAMA87rRSihWbbsAAAAASUVORK5CYII=',
    name: 'Rect',
    select: function() {
        this.sketch.currentBrush = new SketchSwitch.Brushes.Rect();
    },
}, SketchSwitch.Buttons.BaseProto, false);

SketchSwitch.Buttons.Pipet = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Pipet.prototype = SketchSwitch.Utils.extend({
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAB+SURBVHjaYvr//z8DqThvyur/IAxiM4IIUkD+1DUoGggaANMwMTuEEV0zCDCRazPMUCYGMgFIM0EXgGwFKYQpRteM1wCYZmyakL1DthdggIWUQET3Ck4DYIqRnYpNMxhgS2XINCFMkWYUA8jRDDeAXM1gAyjRjOECcjBAgAEA7BN6BCKFNf0AAAAASUVORK5CYII=',
    name: 'Pipet',
    select: function() {
        this.sketch.currentBrush = new SketchSwitch.Brushes.Pipet();
    },
}, SketchSwitch.Buttons.BaseProto, false);

SketchSwitch.Buttons.HidePipet = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.HidePipet.prototype = SketchSwitch.Utils.extend({
    clickOnly: true,
    shortcut: 'ctrlKey',
    icon: null,
    name: 'HidePipet',
    select: function() {
        if (this.sketch.lastPoint)
            this.sketch.copyColor(this.sketch.lastPoint);
    },
}, SketchSwitch.Buttons.BaseProto, false);

SketchSwitch.Buttons.Close = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Close.prototype = SketchSwitch.Utils.extend({
    shortcut: 'x',
    clickOnly: true,
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAABUSURBVHjaYvz//z8DJYCJgUIwCA3Ys2fPfxAmVhynC5AVY9MIA4zYYgGXBhcXF0aiXIBNITYx2sUCrkAkOhaQnY3sdJJiAVkjLv/jjIURlhcAAgwAI+Ax4b11fyQAAAAASUVORK5CYII=',
    name: 'Close',
    select: function() {
        this.sketch.hide();

    },
}, SketchSwitch.Buttons.BaseProto, false);

SketchSwitch.Buttons.Clear = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Clear.prototype = SketchSwitch.Utils.extend({
    shortcut: 'c',
    clickOnly: true,
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABmJLR0T///////8JWPfcAAAACXBIWXMAAABIAAAASABGyWs+AAAACXZwQWcAAAAQAAAAEABcxq3DAAAAO0lEQVRIx2P4TyYIBQMETS5gGLIOoBZgoJUPidU/eB0w4FFANwdQKzWTGzUD74DRNDBaEA3ZgmjY1IYAITF46q7bt7IAAAAASUVORK5CYII=',
    name: 'Clear',
    confirmText: decodeURIComponent(escape('クリアします。よろしいですか? ')),
    select: function() {
        if (this.sketch.win.confirm(this.confirmText)) {
            this.sketch.clear();
        }
    },
}, SketchSwitch.Buttons.BaseProto, false);

SketchSwitch.Buttons.Undo = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Undo.prototype = SketchSwitch.Utils.extend({
    shortcut: 'g',
    clickOnly: true,
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABmJLR0T///////8JWPfcAAAACXBIWXMAAABIAAAASABGyWs+AAAACXZwQWcAAAAQAAAAEABcxq3DAAAAO0lEQVRIx2P4TyYIBQMETS5gGLIOoBZgoJUPidU/eB0w4FFANwdQKzWTGzUD74DRNDBaEA3ZgmjY1IYAITF46q7bt7IAAAAASUVORK5CYII=',
    name: 'Undo',
    select: function() {
        this.sketch.undo();
    },
}, SketchSwitch.Buttons.BaseProto, false);


SketchSwitch.Buttons.Alpha = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Alpha.prototype = SketchSwitch.Utils.extend({
    shortcut: 'a',
    clickOnly: true,
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABmJLR0T///////8JWPfcAAAACXBIWXMAAABIAAAASABGyWs+AAAACXZwQWcAAAAQAAAAEABcxq3DAAAAL0lEQVRIx2P4P8CAYdQBg94BoWBAPk01B1wCA+LpUQeMOmD4OWDAsuFoSTjsHQAAJOJi4rb9Z5MAAAAASUVORK5CYII=',
    name: 'Alpha',
    select: function() {
        var o = this.sketch.brushOptions;
        if (o.alpha) {
            delete o.alpha;
            this.clearBackground();
        } else {
            o.alpha = '0.5';
            this.setBackground();
        }
    },
}, SketchSwitch.Buttons.BaseProto, false);

/* Brushes */
SketchSwitch.Brushes = {};
SketchSwitch.Brushes.BaseProto = {
    setOptions: function(options) {
        this.options = SketchSwitch.Utils.extend(this.options, options); 
    },
    get color() {
        var color = this.options.color;
        if ((typeof this.options.alpha != 'undefined') || (this.options.alpha != null)) {
            // rgb(); zentei
            color = color.replace('rgb(', 'rgba(');
            color = color.replace(')', ',' + this.options.alpha + ')');
        }
        return color;
    },
    mouseDown: function() {},
    mouseUp: function() {},
    mouseMove: function() {},
    start: function() {},
};

SketchSwitch.Brushes.Pen = function(options) { 
    this.options = SketchSwitch.Utils.extend({
        color: 'rgba(0,0,0,1)',
        width: 5
    }, options); 
};

SketchSwitch.Brushes.Pen.prototype = SketchSwitch.Utils.extend({
    allowMoving: true,
    start: function(canvas, preview) {
        this.stack = [];
        this.canvas = canvas;
        this.preview = preview;
        this.ctx = canvas.ctx;
        this.pctx = preview.ctx;
        this.setColor(this.ctx);
        this.setColor(this.pctx);
    },
    set lastPoint (point) {
        this.stack.push(point);
    },

    get lastPoint () {
        return this.stack[this.stack.length - 1];
    },

    setColor: function(ctx) {
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.options.width;
    },
    mouseUp: function(point) {
        this.lastPoint = point;
        this.sketch.addHistory(this.canvas); // XXX
        var ctx = this.ctx;

        var pPoint = this.stack.pop();
        ctx.beginPath();
        ctx.moveTo(pPoint.x, pPoint.y);
        while (point = this.stack.pop()) {
            ctx.lineTo(point.x, point.y);
        };
        ctx.stroke();

        this.pctx = this.preview = null;
        this.ctx = this.canvas = null;
        this.onComplete(true);
    },
    mouseDown: function(point) {
        this.lastPoint = point;
    },
    mouseMove: function(point) {
        this.drawLine(this.pctx, this.lastPoint, point);
        this.lastPoint = point;
    },
    drawLine: function(ctx, lastPoint, point) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
    }
}, SketchSwitch.Brushes.BaseProto, false);

SketchSwitch.Brushes.Rect = function(options) { 
    this.options = SketchSwitch.Utils.extend({
        color: 'rgba(0,0,0,1)',
        width: 5
    }, options); 
};

SketchSwitch.Brushes.Rect.prototype = SketchSwitch.Utils.extend({
    allowMoving: true,
    start: function(canvas, preview) {
        this.canvas = canvas;
        this.preview = preview;
    },

    mouseUp: function(point) {
        this.sketch.addHistory(this.canvas); // XXX
        this.drawRect(this.canvas, point);
        this.preview = this.canvas = null;
        this.onComplete(true);
    },
    mouseDown: function(point) {
        this.startPoint = point;
    },
    mouseMove: function(point) {
        SketchSwitch.Utils.clearCanvas(this.preview);
        this.drawRect(this.preview, point);
    },
    drawRect: function(canvas, point) {
        var ctx = canvas.ctx;
        var color = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect.apply(ctx, SketchSwitch.Utils.getRectByPoint(this.startPoint, point)); 
    }
}, SketchSwitch.Brushes.BaseProto, false);

SketchSwitch.Brushes.RectEraser = function(options) { 
    this.options = SketchSwitch.Utils.extend({
        color: 'rgba(0,0,0,1)',
        width: 5
    }, options); 
};

SketchSwitch.Brushes.RectEraser.prototype = SketchSwitch.Utils.extend({
    allowMoving: true,
    start: function(canvas, preview) {
        this.canvas = canvas;
        this.preview = preview;
    },

    mouseUp: function(point) {
        this.sketch.addHistory(this.canvas); // XXX
        this.drawRect(this.canvas, point);
        this.preview = this.canvas = null;
        this.onComplete(true);
    },
    mouseDown: function(point) {
        this.startPoint = point;
    },
    mouseMove: function(point) {
        SketchSwitch.Utils.clearCanvas(this.preview);
        this.drawRect(this.preview, point, true);
    },
    drawRect: function(canvas, point, isPreview) {
        var ctx = canvas.ctx;
        var color = this.color;
        if (isPreview) {
            ctx.fillStyle = 'rgba(255,0,0, 0.7)';
            ctx.fillRect.apply(ctx, SketchSwitch.Utils.getRectByPoint(this.startPoint, point)); 
        } else {
            ctx.clearRect.apply(ctx, SketchSwitch.Utils.getRectByPoint(this.startPoint, point)); 
        }
    }
}, SketchSwitch.Brushes.BaseProto, false);

SketchSwitch.Brushes.Eraser = function(options) { 
    this.options = SketchSwitch.Utils.extend({
        width: 5
    }, options); 
};

SketchSwitch.Brushes.Eraser.prototype = SketchSwitch.Utils.extend({
    allowMoving: true,
    start: function(canvas, preview) {
        this.canvas = canvas;
        this.ctx = canvas.ctx;
        this.sketch.addHistory(this.canvas); // XXX
    },
    mouseUp: function(point) {
        this.erase(point);
        this.ctx = this.canvas = null;
        this.onComplete(true);
    },
    mouseDown: function(point) {
        this.erase(point);
    },
    mouseMove: function(point) {
        this.erase(point);
    },
    erase: function(point) {
        var ctx = this.ctx;
        var w =  10;

        ctx.clearRect(point.x - (w), point.y - (w), w * 2, w * 2);
    }
}, SketchSwitch.Brushes.BaseProto, false);

SketchSwitch.Brushes.Pipet = function(options) { 
    this.options = SketchSwitch.Utils.extend({
        width: 5
    }, options); 
};

SketchSwitch.Brushes.Pipet.prototype = SketchSwitch.Utils.extend({
    allowMoving: false,
    start: function(canvas, preview, baseLayer) {
    },
    mouseUp: function(point) {
        this.pipet(point);
        this.onComplete();
    },
    mouseDown: function(point) {
        this.pipet(point);
    },
    pipet: function(point) {
        this.sketch.copyColor(point);
    }
}, SketchSwitch.Brushes.BaseProto, false);



