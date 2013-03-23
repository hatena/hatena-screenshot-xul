Components.utils.import("resource://hatenascreenshot/modules/00-utils.jsm");
loadPrecedingModules.call(this);

/*
 * utils 内部では、
 * 頭に _ のついてないローカル変数はすべて EXPORT の対象となる
 */

/*
 * %s, %d, %f のみサポート
 */
const _SPRINTF_HASH = {
    '%s': String,
    '%d': parseInt,
    '%f': parseFloat,
};

var sprintf = function (str) {
    let args = Array.slice(arguments, 1);
    return str.replace(/%[sdf]/g, function(m) _SPRINTF_HASH[m](args.shift()));
};

/*
 * グローバル関数としてエクスポートはしないけど、あったら便利な関数など
 */

var convertStringEncoding = function(str) {
    return decodeURIComponent(escape(str || ''));
}

/*
 * net
 */
var net = {};

net.makeQuery =  function net_makeQuery (data) {
    let pairs = [];
    let regexp = /%20/g;
    let toString = Object.prototype.toString;
    for (let k in data) {
        if (typeof data[k] == 'undefined') continue;
        let n = encodeURIComponent(k);
        let v = data[k];
        if (toString.call(v) === '[object Array]') {
            pairs.push(v.map(function (c) {
                return n + '=' + encodeURIComponent(c).replace(regexp, '+');
            }).join('&'));
        } else {
            pairs.push(n + '=' + encodeURIComponent(v).replace(regexp, '+'));
        }
    }
    return pairs.join('&');
};

net.sync_get = function net__sync_get(url, query, method) {
    if (!method) method == 'GET';
    if (method == 'GET' && query) {
        let q = this.makeQuery(query);
        if (q) {
            url += '?' + q;
        }
    }
    let Y = function(func) {
        let g = func(function(t) {
            try { g.send(t) } catch (e) {};
        });
        return g;
    };
    let xhr;
    let gen = Y(function(next) {
        xhr = new XMLHttpRequest();
        xhr.mozBackgroundRequest = true;
        xhr.open('GET', url, false);
        if (method == 'POST') {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.send(this.makeQuery(query));
        } else {
            xhr.send(null);
        }
        yield xhr;
    });

    return gen.next();
};

net._http = function net__http (url, callback, errorback, async, query, headers, method) {
    var user = shared.get('User').user;
    if (/^https?:\/\/(?:[\w-]+\.)+hatena.ne.jp(?=[:\/]|$)/.test(url) &&
        user && !headers)
        headers = { Cookie: 'rk=' + user.rk };

    let xhr = new XMLHttpRequest();
    xhr.mozBackgroundRequest = true;
    if (async) {
       xhr.onreadystatechange = function() {
           if (xhr.readyState == 4) {
               if (xhr.status == 200) {
                   if (typeof callback == 'function')
                       callback(xhr);
               } else {
                   if (typeof errorback == 'function')
                       errorback(xhr);
               }
           }
       }
    }
    if (method == 'GET') {
        let q = this.makeQuery(query);
        if (q) {
            url += '?' + q;
        }
    }
    xhr.open(method, url, async);

    for (let [field, value] in Iterator(headers || {}))
        xhr.setRequestHeader(field, value);

    if (method == 'POST') {
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send(this.makeQuery(query));
    } else {
        xhr.send(null);
        if (!async) {
            if (typeof callback == 'function') {
                callback(xhr);
            }
        }
    }
    return xhr;
};

net.get = function net_get (url, callback, errorback, async, query, headers)
    this._http(url, callback, errorback, async, query, headers, 'GET');

net.post = function net_post (url, callback, errorback, async, query, headers)
    this._http(url, callback, errorback, async, query, headers, 'POST');


var EXPORTED_SYMBOLS = [m for (m in new Iterator(this, true))
                          if (m[0] !== "_" && m !== "EXPORTED_SYMBOLS")];
