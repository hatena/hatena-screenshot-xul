
/*
 * Canvas Drawer for Firefox.
 *
 * License: MIT
 * author: Yuichi Tateno
 */

const EXPORT = ['SketchSwitch'];

/*
 * Pure JavaScript で使えるような実装に
 * JS 1.6 互換に
 */
var SketchSwitch = function(win) {
    this.win = win || window;
};


