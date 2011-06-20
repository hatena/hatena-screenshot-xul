Components.utils.import("resource://hatenascreenshot/modules/00-utils.jsm");
loadPrecedingModules.call(this);

const EXPORTED_SYMBOLS = ["User"];
const MY_NAME_URL = 'http://b.hatena.ne.jp/my.name';

var User = function User_constructor (name, options) {
    this._name = name;
    this.options = options || {};
};

extend(User, {
    login: function User_loginCheck () {
        net.post(MY_NAME_URL, User._login, User.loginErrorHandler,
                 true, null, { Cookie: 'rk=' + User.rk });
    },
    _login: function User__login(res) {
        res = decodeJSON(res.responseText);
        if (res.login) {
            User.setUser(res);
            return User.user;
        } else {
            User.clearUser();
            return false;
        }
    },
    loginErrorHandler: function User_loginErrorHandler(res) {
        p('login errro...');
    },
    logout: function User_clearUser () {
        this.clearUser();
    },
    clearUser: function() {
        if (this.user) {
            this.user.clear();
            delete this.user;
        }
    },
    setUser: function User_setCurrentUser (res) {
        let current = this.user;
        if (current) {
            if (current.name == res.name) {
                current.options.rks = res.rks;
                current.options.rkm = res.rkm;
                return current;
            }
        }
        let user = new User(res.name, res);
        this.user = user;
        EventService.dispatch('UserChange', this);
    },
    rk: (function User_getRk() {
        let cookies = getService("@mozilla.org/cookiemanager;1",
                                 Ci.nsICookieManager).enumerator;
        while (cookies.hasMoreElements()) {
            let cookie = cookies.getNext().QueryInterface(Ci.nsICookie);
            if (cookie.host === ".hatena.ne.jp" && cookie.name === "rk")
                return cookie.value;
        }
        return "";
    })()
});

User.prototype = {
    get name() this._name,
    get rk() User.rk,
    get rks() this.options.rks,
    get rkm() this.options.rkm,
    get info() {
        // XXX: キャッシュクリアをどうする？
        if (!this._info) {
            let res = net.get(this.infoAPI);
            this._info = decodeJSON(res.responseText);
        }
        return this._info;
    },

    getAsyncInfo: function(callback) {
        if (this._info) {
            callback(this._info);
        } else {
            var self = this;
            var tmp = function(res) {
                self._info = decodeJSON(res.responseText);
                callback(self._info);
            }
            let res = net.get(this.infoAPI, tmp, function() {
                callback({});
            }, true);
        }
    },

    get infoAPI() this.getPermalink('api/info?mode=detail'),
    get haikuAPI() this.getPermalink('haiku'),

    getPermalink: function(url) {
        return 'http://f.hatena.ne.jp/' + this.name + '/' + (url || '');
    },

    getProfileIcon: function user_getProfileIcon(isLarge) {
        return UserUtils.getProfileIcon(this.name, isLarge);
    },

    clear: function user_clear() {
    },

    uploadData: function(image, options) {
        if (!options) options = {};

        let params = {
             name: this.name,
             rkm: this.rkm,
             ext: 'png',
             model: 'capture', // XXX
             image: image,
        };
        if (options.fotosize) params.fotosize = options.fotosize;
        if (options.folder) params.folder = options.folder; 

        net.post(this.haikuAPI, options.callback, options.errorback, true, params);
    }
};

/*
 * cookie observe
 */
User.LoginObserver = {
    observe: function(aSubject, aTopic, aData) {
        if (aTopic != 'cookie-changed') return;

        let cookie = aSubject;
        if (!(cookie instanceof Ci.nsICookie2) ||
            cookie.host != '.hatena.ne.jp' ||
            cookie.name != 'rk') return;
        /*
         * logout: deleted
         * login: added
         */
        switch (aData)
        {
            case 'added':
            case 'changed':
                User.login();
                break;
            case 'deleted':
            case 'cleared':
                User.logout();
                break;
            default:
                break;
        }
    },
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),
}
User.OfflineObserver = {
    observe: function(aSubject, aTopic, aData) {
        if (aTopic == "network:offline-status-changed" && aData != "offline")
            User.login();
    },
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),
}
User.ApplicationObserver = {
    observe: function(aSubject, aTopic, aData) {
        if (aTopic == "quit-application-granted")
            User.logout();
    },
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),
}
ObserverService.addObserver(User.ApplicationObserver, 'quit-application-granted', false);
ObserverService.addObserver(User.LoginObserver, 'cookie-changed', false);
ObserverService.addObserver(User.OfflineObserver, 'network:offline-status-changed', false);

User.LoginChecker = new BuiltInTimer({
    observe: function() {
        if (!User.user) {
            User.login();
        }
    },
}, 15 * 60 * 1000, Ci.nsITimer.TYPE_REPEATING_SLACK);

EventService.createListener('firstPreload', function() {

    // 初回時はログインチェックする
    User.login();
    let count = 3;
    let preloadTimer = new BuiltInTimer({
        observe: function() {
            if (User.user || --count < 0) {
                preloadTimer.cancel();
                preloadTimer = null;
            } else {
                User.login();
            }
        },
    }, 5000, Ci.nsITimer.TYPE_REPEATING_SLACK);
}, null, 10);

shared.set('User', User);
