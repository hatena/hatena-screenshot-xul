
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
        this._ctx = ctx;

        this.clearCanvas();
    },
    clearCanvas: function() {
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

SketchSwitch.Tools = {};
SketchSwitch.Tools.PenBase = function(size, color) {
    this.size = size;
    this.color = color;
};


