
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
    this.createCanvas(canvasID || '__sketch_switch_canvas__');
    this.currentBrush = new SketchSwitch.Brushes.LineBase();
};

SketchSwitch.prototype = {
    get win() {
        return this._win;
    },
    get doc() {
        return this.win.document;
    },
    get canvas() {
        return this._canvas;
    },
    get ctx() {
        return this._ctx;
    },
    get width() {
        return this.canvas.width;
    },
    get height() {
        return this.canvas.height;
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
        this._canvas = canvas;
        canvas.ctx = this._ctx = ctx;

        this.clearCanvas();
        var self = this;
        canvas.addEventListener('mousedown', function(event) {
            self.mousedownHandler(event);
        }, false);
    },
    mousedownHandler: function(event) {
        if (this.nowDrawing) return;
        this.nowDrawing = true;

        var U = SketchSwitch.Utils;
        var brush = this.currentBrush;
        var canvas = this.canvas;
        var win = this.win;

        brush.start(canvas);
        brush.mouseDown(U.getPoint(event, win));

        var moveHandler;
        if (brush.allowMoving) {
            moveHandler = function(event) {
                brush.mouseMove(U.getPoint(event, win));
            };
            canvas.addEventListener('mousemove', moveHandler, false);
        }

        var upHandler = function(event) {
            brush.mouseUp(U.getPoint(event, win));
        };

        canvas.addEventListener('mouseup',  upHandler, false);
        canvas.addEventListener('mouseout', upHandler, false);

        var self = this;
        var completeHandler = function(event) {
            if (moveHandler)
                canvas.removeEventListener('mousemove', moveHandler, false);
            canvas.removeEventListener('mouseup', upHandler, false);
            canvas.removeEventListener('mouseout', upHandler, false);
            brush.onComplete = function() {};
            self.nowDrawing = false;
        }
        brush.onComplete = completeHandler;
    },
    clearCanvas: function(ctx) {
        this.ctx.fillStyle = 'rgba(255,255,255,0)';
        this.ctx.fill(0, 0, this.width, this.height); 
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
    start: function(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.ctx;
        p(this.ctx);
        this.setColor();
    },
    setColor: function() {
        var ctx = this.ctx;
        ctx.strokeStyle = 'rgb(0,0,0)';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;
    },
    mouseUp: function(point) {
        p('up');
        this.drawLine(point);
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
        var ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
    }
};




