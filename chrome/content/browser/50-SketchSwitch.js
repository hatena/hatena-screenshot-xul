
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

var SketchSwitch = function(win, canvasID) {
    this.sid = SketchSwitch.__sid__++;
    this._win = win || window;
    this.active = true;
    this.brushOptions = {};
    this.init(canvasID || '__sketch_switch_canvas__');
    this.currentBrush = new SketchSwitch.Brushes.LineBase();
};
SketchSwitch.__sid__ = 1;

SketchSwitch.prototype = {
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
        SketchSwitch.Utils.initCanvas(this.canvas);

        var self = this;
        this.canvas.addEventListener('mousedown', function(event) {
            self.mousedownHandler(event);
        }, false);

        this.toolMenu = new SketchSwitch.ToolMenu(this);
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
    mousedownHandler: function(event) {
        if (this.nowDrawing || !this.active) return;
        this.nowDrawing = true;

        var U = SketchSwitch.Utils;
        var brush = this.currentBrush;
        var canvas = this.canvas;

        var preview = this.preview;
        this.doc.body.appendChild(preview);

        var win = this.win;

        brush.setOptions(this.brushOptions);
        brush.start(canvas, preview);
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
        var completeHandler = function(event) {
            if (moveHandler)
                preview.removeEventListener('mousemove', moveHandler, false);
            preview.removeEventListener('mouseup', upHandler, false);
            preview.removeEventListener('mouseout', upHandler, false);
            U.clearCanvas(preview);
            if ( preview.parentNode ) preview.parentNode.removeChild(preview);
            brush.onComplete = function() {};
            self.nowDrawing = false;
        }
        brush.onComplete = completeHandler;
    },
    show: function() {
        this.doc.body.appendChild(this.canvas);
    },
    hide: function() {
        if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
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
    this.sketch = sketch;
    this.init();
}

SketchSwitch.ToolMenu.DEFAULT_BUTTONS = [
    'Pen',
    'Eraser'
];


SketchSwitch.ToolMenu.prototype = {
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

        with (this.table.style) {
            position = 'absolute';
            top      = '0';
            left     = '0';
            zIndex = this.sketch.canvas.style.zIndex + 1;
            backgroundColor = 'rgba(255,255,255, 0.7)';
        }

        var buttons = SketchSwitch.ToolMenu.DEFAULT_BUTTONS;
        for (var i = 0;  i < buttons.length; i++) {

            var b = SketchSwitch.Buttons[buttons[i]];
            var button = new b(this);
            this.appendButton(button);
            if (i == 0) {
                this.setCurrentButton(button);
            }
        }
        this.doc.body.appendChild(this.table);
    },
    appendButton: function(button) {
        var E = SketchSwitch.Utils.createElement;
        var doc = this.doc;
        this.menu.push(button);
        var icon = E(doc, 'img', {src:button.icon, alt: button.name});
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
            padding = '3px';
            margin = '5px';
            borderBottom = '1px solid #999';
        }

        this.tbody.appendChild(tr);
        var self = this;
        icon.addEventListener('click', function(event) {
            self.buttonClick(icon);
        }, false);
    },
    buttonClick: function(icon) {
        var button = icon.button;
        this.setCurrentButton(button);
    },
    setCurrentButton: function(button) {
        if (this._currentButton) {
            this._currentButton.unselect();
        }
        this._currentButton = button;
        button.select();
    },
};


/* Buttons */
SketchSwitch.Buttons = {};
SketchSwitch.Buttons.BaseProto = {
    clearBackground: function() {
        this.element.parentNode.style.backgroundColor = '';
    },
    setBackground: function() {
        this.element.parentNode.style.backgroundColor = 'rgba(91,139,212,0.5)';
    },
    select: function() {},
    unselect: function() {},
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAADoSURBVHjalJJNC0VAGIWZhkLKQln5AVZS8//LXjYWlLWNUj7yEdI93bm5wnU5ZWZq3mfmnHeISZIIT0TxaZp2s7ptWyI8FOWTLMuU0u3GPM/jOP4EUB0EwXaDMYbxyOwtsbewAL+78xz4KxFtRZdUVd1ZmqYJY1VVhmE4jiNJ0nmXuCXXdfM8R7XnecMwRFG0D71V13V93y/LYpqmZVloVxiGVwDsoWh11TQN93MOrEkURSmKwvf9uq4BANN1/Rv6+HBQlmVlWSJ0mqZIgjyEkA9w3Up4i+PYtm2cewvY/nyUT/cf7iXAAEwFdZak1p3gAAAAAElFTkSuQmCC',
};

SketchSwitch.Buttons.Pen = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Pen.prototype = SketchSwitch.Utils.extend({
    name: 'Pen',
}, SketchSwitch.Buttons.BaseProto);

SketchSwitch.Buttons.Eraser = function(sketch) { this.sketch = sketch };
SketchSwitch.Buttons.Eraser.prototype = SketchSwitch.Utils.extend({
    name: 'Eraser',
}, SketchSwitch.Buttons.BaseProto);

/* Brushes */
SketchSwitch.Brushes = {};
SketchSwitch.Brushes.BaseProto = {
    setOptions: function(options) {
        this.options = SketchSwitch.Utils.extend(options, this.options); 
    },
};

SketchSwitch.Brushes.LineBase = function(options) { 
    this.options = SketchSwitch.Utils.extend({
        color: 'rgba(0,0,0,1)',
        width: 5
    }, options); 
};

SketchSwitch.Brushes.LineBase.prototype = SketchSwitch.Utils.extend({
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
        ctx.strokeStyle = this.options.color;
        ctx.lineWidth = this.options.width;
    },
    mouseUp: function(point) {
        this.lastPoint = point;
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
        this.onComplete();
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
}, SketchSwitch.Brushes.BaseProto);


/* */


