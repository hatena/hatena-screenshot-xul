
const EXPORT = ['SketchSwitch'];


var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
             .getService(Ci.mozIJSSubScriptLoader);

var tmp = {};
loader.loadSubScript('chrome://hatenascreenshot/content/lib/SketchSwitch.js', tmp);
var SketchSwitch = tmp.SketchSwitch;

