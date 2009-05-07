
const EXPORT = ["User"];
const MY_NAME_URL = 'http://b.hatena.ne.jp/my.name';

var User;

if (shared.has('User')) {
    User = shared.get('User');
} else {
    /*
     * User オブジェクトは一つだけ
     */
    User = function User_constructor (name, options) {
        this._name = name;
        this.options = options || {};
    };

    extend(User, {
        login: function User_loginCheck () {
            net.post(MY_NAME_URL, User._login, User.loginErrorHandler, true);
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
        }
    });
    
    User.prototype = {
        get name() this._name,
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
                 model: 'oekaki', // XXX
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

            let cookie = aSubject.QueryInterface(Ci.nsICookie2);
            if (cookie.host != '.hatena.ne.jp' || cookie.name != 'rk') return;
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
            if (aTopic == "network:offline-status-changed" && aState != "offline")
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

    User.LoginChecker = new Timer(1000 * 60 * 15); // 15 分
    User.LoginChecker.createListener('timer', function() {
        if (!User.user) {
            User.login();
        }
    });
    User.LoginChecker.start();

    EventService.createListener('firstPreload', function() {
        // 初回時はログインチェックする
        User.login();
        let preloadTimer = new Timer(5000, 5);
        preloadTimer.createListener('timer', function() {
            if (User.user) {
                preloadTimer.stop();
            } else {
                User.login();
            }
        });
        preloadTimer.stop();
    }, null, 10);

    shared.set('User', User);
};

