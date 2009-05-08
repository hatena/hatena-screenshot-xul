
const EXPORT = ['SketchSwitch'];

/*
 * Canvas Drawing Tool (overlay window) for Firefox.
 *
 * License: MIT
 * author: Yuichi Tateno
 *
 * require JSColor.js
 */

var SketchSwitch = function(win, canvasID) {
    this.id = SketchSwitch.__sid__++;
    this._win = win || window;
    this.active = true;
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
        SketchSwitch.Utils.clearCanvas(this.canvas);

        var self = this;
        this.canvas.addEventListener('mousedown', function(event) {
            self.mousedownHandler(event);
        }, false);
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
    mousedownHandler: function(event) {
        if (this.nowDrawing || !this.active) return;
        this.nowDrawing = true;

        var U = SketchSwitch.Utils;
        var brush = this.currentBrush;
        var canvas = this.canvas;

        var preview = this.createCanvas(canvas.canvasID + 'preview');
        U.clearCanvas(canvas);
        preview.style.zIndex = parseInt(canvas.style.zIndex) + 1;
        this.doc.body.appendChild(preview);

        var win = this.win;

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
    clearCanvas: function(canvas) {
        canvas.ctx.fillStyle = 'rgba(255,255,255,0)';
        canvas.ctx.fillRect(0, 0, canvas.width, canvas.height); 
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
};

SketchSwitch.Brushes = {};
SketchSwitch.Brushes.Base = function(options) { this.options = options || {} };

SketchSwitch.Brushes.LineBase = function(options) { 
    this.options = SketchSwitch.Utils.extend({
        color: 'rgba(0,0,0,1)',
        width: 5
    }, options); 
};

SketchSwitch.Brushes.LineBase.prototype = {
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
};


/* */


