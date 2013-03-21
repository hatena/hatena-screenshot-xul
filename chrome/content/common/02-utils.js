
// 生成される関数の属するグローバルオブジェクトが
// このウィンドウであるように、ここで宣言しなおす
function method(self, methodName) function () self[methodName].apply(self, arguments);

var EXPORT = [m for (m in new Iterator(this, true))
                          if (m[0] !== "_" && m !== "EXPORT")];
