
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
    this._win = win || window;
    this.active = true;
    this.init(canvasID || '__sketch_switch_canvas__');
    this.currentBrush = new SketchSwitch.Brushes.LineBase();
};

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
        this.clearCanvas();

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
        this.clearCanvas(preview.ctx);
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
    clearCanvas: function(ctx) {
        if (!ctx) ctx = this.ctx;
        ctx.fillStyle = 'rgba(255,255,255,0)';
        ctx.fillRect(0, 0, this.width, this.height); 
    },
    show: function() {
        this.doc.body.appendChild(this.canvas);
    },
    hide: function() {
        if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    }
};

SketchSwitch.Utils = {
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

SketchSwitch.Brushes.LineBase = function(options) { this.options = options || {} };
SketchSwitch.Brushes.LineBase.prototype = {
    allowMoving: true,
    start: function(canvas, preview) {
        this.canvas = canvas;
        this.preview = preview;
        this.ctx = canvas.ctx;
        this.pctx = preview.ctx;
        this.setColor(this.ctx);
        this.setColor(this.pctx);
    },
    setColor: function(ctx) {
        ctx.strokeStyle = 'rgb(0,0,0)';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;
    },
    mouseUp: function(point) {
        this.drawLine(point);
        this.pctx = this.preview = null;
        this.ctx = this.canvas = null;
        this.onComplete();
    },
    mouseDown: function(point) {
        this.lastPoint = point;
    },
    mouseMove: function(point) {
        this.drawLine(point);
        this.lastPoint = point;
    },
    drawLine: function(point) {
        var ctx = this.pctx;
        ctx.beginPath();
        ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
    }
};




