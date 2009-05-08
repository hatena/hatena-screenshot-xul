

const EXPORT  = ['JSColor'];

/*
 * JSColor 
 * http://github.com/hotchpotch/jscolor/tree/master
 * 
 * JSColor is color library for JavaScript.
 * JSColor code is porting from AS3 Color library ColorSB < http://sketchbook.libspark.org/trac/wiki/ColorSB >.  
 */

var JSColor = function() {
    return this.initialize.apply(this, arguments);
}

JSColor.from = {
    RGB: function(red, green, blue) {
        var col = new JSColor();
        col.setRGB(red, green, blue);
        return col;
    },
    HSB: function(hue, saturation, brightness) {
       var col = new JSColor();
       col.setHSB(hue, saturation, brightness);
       return col;
    },
    Gray: function(gray) {
        var col = new JSColor();
        col.setRGB(gray, gray, gray);
        return col;
    },
    CSSColor: function(str) {
        if (str.match(/#([a-fA-F0-9]{6})/)) {
            return JSColor.from.Shaep6(str);
        } else if(str.match(/#([a-fA-F0-9]{3})/)) {
            return JSColor.from.Shaep3(str);
        } else if(str.match(/rgb\s*\((\d+),\s*(\d+),\s*(\d+)\s*\)/)) {
            return JSColor.from.RGB(RegExp.$1, RegExp.$2, RegExp.$3); 
        }
    },
    Shaep6: function(str) {
        str.match(/#([a-fA-F0-9]{6})/)
        return new JSColor(parseInt('0x' + RegExp.$1));
    },
    Shaep3: function(str) {
        str.match(/#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/)
        var r = parseInt('0x' + RegExp.$1);
        r += (r << 4);
        var g = parseInt('0x' + RegExp.$2);
        g += (g << 4);
        var b = parseInt('0x' + RegExp.$3);
        b += (b << 4);
        return JSColor.from.RGB(r, g, b);
    }
}
    
JSColor.prototype = {
    initialize: function(color) {
        this._value = Math.max(0, parseInt(color || 0));
        
        this._red = this._green = this._blue = this._hue = this._saturation = this._brightness = 0;
        this._hsbUpdate = this._rgbUpdate = true;
        this._holdHue = this._holdSaturation = false;
        this.updateRGB();
        this.updateHSB();
        this.alpha = 1;
        return this;
    }, 

    setRGB: function(r, g, b) {
        r = Math.min(255, Math.max(0, r));
        g = Math.min(255, Math.max(0, g));
        b = Math.min(255, Math.max(0, b));
        
        this.setValue((r << 16) | (g << 8 ) | b);
    },
    
    
    /**
     * 
     * @param hue 0-360;
     * @param saturation 0-100;
     * @param brightness 0-100;
     */
    setHSB: function(hue, saturation, brightness) {
        var rgbInfo = JSColor.Util.HSB2RGB(hue,saturation,brightness);
        this.setRGB(rgbInfo.r, rgbInfo.g, rgbInfo.b);
    },
    
    
    /**
     * Returns copy of instance.
     * 
     * @return The copy of the Color instance;
     */
    clone: function() {
        var c = new JSColor(this.getValue());
        c.setHue(this.getHue());
        c.setBrightness(this.getBrightness());
        c.setSaturation(this.getSaturation());
        return c;
    },
    
    
    /**
     * Hex color value 0xRRGGBB;
     */
    getValue: function() {
        return this._value;
    },
    
    setValue: function(color) {
        if (this._value == color) return;
        this._value = color;
        this._hsbUpdate = true;
        this._rgbUpdate = true;
        if (typeof this.callbackChangeValue == 'function')
            this.callbackChangeValue();
    },
    
    
    /**
     * Returns 32bit color, 0xAARRGGBB;
     * @returns int;
     */
    getValue32: function(alpha) {
        alpha = parseInt(alpha*255);
        var val = (alpha<<24) | this.getValue();
        return val;
    },
    
    
    
    /*
    ---------------------------------------------
    RGB getter / setter;
    ---------------------------------------------
    */
    
    getRed: function() { 
        this.updateRGB();
        return this._red;
    },
    
    getGreen: function() {
        this.updateRGB();
        return this._green;
    },
    
    getBlue: function() {
        this.updateRGB();
        return this._blue;
    },
    
    setRed: function(val) {
        val = Math.min(255, Math.max(0, val));
        if (val!=this._red)
            this.setRGB(val,this.getGreen(),this.getBlue());
    },
    
    setGreen: function(val) {
        val = Math.min(255, Math.max(0, val));
        if (val!=this._green)
            this.setRGB(this.getRed(),val,this.getBlue());
    },
    
    setBlue: function(val) {
        val = Math.min(255, Math.max(0, val));
        if (val!=this._blue)
            this.setRGB(this.getRed(),this.getGreen(),val);
    },
    
    
    /**
     * Returns Sring expression of this color. "RRGGBB"
     * @returns String;
     */
    toString: function(prefix) {
        if (!prefix) prefix = '';
        var hexTable = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"];
        return prefix + [
          hexTable[Math.floor(this.getRed() / 16)],
          hexTable[this._red%16],
          hexTable[Math.floor(this.getGreen() / 16)],
          hexTable[this._green%16],
          hexTable[Math.floor(this.getBlue() / 16)],
          hexTable[this._blue%16]
        ].join('');
    },

    toCSSColor: function() {
        return this.toString('#');
    },

    /*
     * setter/getter shourtcut
     * example:
     *
     *   color.setBrightness(color.getBrightness() + 30);
     *   => color.transform('brightness', 30);
     *
     *   color.setRed(color.getRed() - 10);
     *   => color.transform('red', -10);
     */
    transform: function(_name, value) {
        var name = _name.replace(/^[a-z]/, function(m) { return m.toUpperCase() });
        var getter = 'get' + name;
        var setter = 'set' + name;
        if (typeof this[getter] == 'function' && typeof this[setter] == 'function') {
            this[setter](this[getter]() + value);
        } else {
            alert('setter/getter not found: ' + _name);
        }
    },
    transformMulti: function(_name, value) {
        var name = _name.replace(/^[a-z]/, function(m) { return m.toUpperCase() });
        var getter = 'get' + name;
        var setter = 'set' + name;
        if (typeof this[getter] == 'function' && typeof this[setter] == 'function') {
            this[setter](this[getter]() * value);
        } else {
            alert('setter/getter not found: ' + _name);
        }
    },
    
    transfromRGB: function(r, g, b) {
        if (r) 
            this.transform('red', r);
        if (g) 
            this.transform('green', g);
        if (b) 
            this.transform('blue', b);
    },
    
    transformHSB: function(h, s, b) {
        if (h) 
            this.transform('hue', h);
        if (s) 
            this.transform('saturation', s);
        if (b) 
            this.transform('brightness', b);
    },
    /*
    ------------------------------------------------
    HSB getter / setter;
    ------------------------------------------------
    */
    
    getHue: function() {
        this.updateHSB();
        return this._hue;
    },
    
    getSaturation: function() {
        this.updateHSB();
        return this._saturation;
    },
    
    getBrightness: function() {
        this.updateHSB();
        return this._brightness;
    },
    
    setHue: function(val) {
        val = (val<0)? val % 360+360 : (val>=360)? val%360: val;
        var rgbInfo = JSColor.Util.HSB2RGB(val,this.getSaturation(),this.getBrightness());
        this.setRGB(rgbInfo.r, rgbInfo.g, rgbInfo.b);
        this._hue = val;
    },
    
    setSaturation: function(val) {
        val = Math.min(100, Math.max(0, val));
        var rgbInfo = JSColor.Util.HSB2RGB(this.getHue(),val,this.getBrightness());
        this.setRGB(rgbInfo.r, rgbInfo.g, rgbInfo.b);
        this._saturation = val;
    },
    
    setBrightness: function(val) {
        val = Math.min(100, Math.max(0, val));
        var rgbInfo = JSColor.Util.HSB2RGB(this.getHue(),this.getSaturation(),val);
        this.setRGB(rgbInfo.r, rgbInfo.g, rgbInfo.b);
        this._brightness = val;
    },
    
    /*
    ----------------------------------------------------------------
    gray scale controll;
    ----------------------------------------------------------------
    */
    
    /**
     * 
     * @param value 0-255 gray scale.
     */
    setGray: function(value) {
        this.setRGB(value,value,value);
    },
    
    
    /**
     */
    toGray: function() {
        var value = Math.round(0.299*this.getRed() + 0.114*this.getBlue() + 0.587*this.getGreen() + 0.5);
        this.setGray(value);
        return this;
    },
    
    /*
    ------------------------------------------------
    Internal Use Only;
    ------------------------------------------------
    */
    
    updateRGB: function() {
        if(!this._rgbUpdate) return;
        this._red= this._value>>16 & 0xff;
        this._green= this._value>> 8 & 0xff;
        this._blue= this._value& 0xff;
        this._rgbUpdate = false;
    },
    
    updateHSB: function() {
        if(!this._hsbUpdate) return;
        
        var hsb = JSColor.Util.RGB2HSB(this.getRed(),this.getGreen(),this.getBlue());
        
        if(hsb.b != 0 && hsb.s != 0 )
            this._hue = hsb.h;
        
        if(hsb.b != 0)
            this._saturation = hsb.s;
        
        this._brightness = hsb.b;
        this._hsbUpdate = false;
    }
}


JSColor.Util = {
    getHSB: function(uint) {
        var rgb = this.getRGB(uint);
        return this.RGB2HSB(rgb.r, rgb.g, rgb.b);
    },
    getHLS: function(uint) {
        var rgb = this.getRGB(uint);
        return this.RGB2HLS(rgb.r, rgb.g, rgb.b);
    },
    getRGB: function(uint) {
        return {
            r: uint >> 16 & 0xFF,
            g: uint >> 8  & 0xFF,
            b: uint       & 0xFF
        }
    },
    setHSB: function(rgb, h, s, b) {
        var t = this.HSB2RGB(h, s, b);
        this.setRGB(rgb, t.r, t.g, t.b);
        return rgb;
    },
    setHLS:  function(rgb, h, l, s) {
        var t = this.HLS2RGB(h, l, s);
        this.setRGB(rgb, t.r, t.g, t.b);
        return rgb;
    },
    setRGB: function(rgb, r, g, b) {
        r = (r < 0) ? 0 : (r > 255) ? 255 : Math.round(r);
        g = (g < 0) ? 0 : (g > 255) ? 255 : Math.round(g);
        b = (b < 0) ? 0 : (b > 255) ? 255 : Math.round(b);
        rgb.r = r << 16;
        rgb.g = g << 8;
        rgb.b = b;
        return rgb;
    },
    HLS2HSB: function(h, l, s) {
        var rgb = this.HLS2RGB(h, l, s);
        return 
    },
    HLS2RGB: function(h, l, s) {
        var max, min;
        h = (h < 0) ? (h % 360 + 360) : (h >= 360 ? h % 360 : h);
        l = (l < 0) ? 0 : (l > 100) ? 100 : l;
        s = (s < 0) ? 0 : (s > 100) ? 100 : s;

        l *= 0.01;
        s *= 0.01;

        if (s == 0) {
            var val = l * 255;
            return {
                r: val,
                g: val,
                b: val
            }
        }

        if (l < 0.5) {
            max = l * (1 + s) * 255
        } else {
            max = (l * (1 - s) + s) * 255
        }
        min = (2 * l) * 255 - max;

        return this._hMinMax2RGB(h, min, max);
    },
    HSB2HLS: function(h, s, b) {
        var rgb = this.HSB2RGB(h, s, b);
        return this.RGB2HLS(rgb.r, rgb.g, rgb.b);
    },
    HSB2RGB: function(hue, sat, bri) {
        hue = (hue<0)? hue % 360+360 : (hue>=360)? hue%360: hue;
        sat = (sat<0)? 0 : (sat>100)? 100: sat;
        bri = (bri<0)? 0 : (bri>100)? 100: bri;     

        sat *= 0.01;
        bri *= 0.01;

        if(sat == 0){
            var val = bri*255;
            return {r:val, g:val, b:val};
        }

        var max = bri*255;
        var min = max*(1-sat);

        return this._hMinMax2RGB(hue, min, max);
    },
    RGB2HSB: function(r, g, b) {
        r = (r < 0)? 0 : (r>255)? 255: Math.round(r);
        g = (g < 0)? 0 : (g>255)? 255: Math.round(g);
        b = (b < 0)? 0 : (b>255)? 255: Math.round(b);

        var min = Math.min(r, g, b);
        var max = Math.max(r, g, b);
        var sat;

        //saturation
        if (max==0) {
            return {h:0, s: 0, b: 0}
        } else {
            sat = (max - min)/max * 100;
        }

        var bri = max / 255 * 100;

        var hue = this._getHue(r, b, g, max, min);
        return {h:hue, s:sat, b:bri}
    },
    RGB2HLS: function(r, g, b) {
        r = (r < 0)? 0 : (r>255)? 255: Math.round(r);
        g = (g < 0)? 0 : (g>255)? 255: Math.round(g);
        b = (b < 0)? 0 : (b>255)? 255: Math.round(b);

        var min = Math.min(r,g,b);
        var max = Math.max(r,g,b);
        var l = (max + min)*0.5 / 255 * 100;

        var dist = (max - min);
        var h;
        var s;
        if(dist==0){
            h = 0;
            s = 0;
        }else{
            if( l < 127.5){
                s = dist/(max+min)*100;
            }else{
                s = dist/(510-max-min)*100;
            }

            h = 360 - this._getHue(r,g,b,max, min);
        }

        return {h:h, l:l, s:s}
    },
    getLuminous: function(color) {
        var r = color >> 16 & 0xff;
        var g = color >> 8 & 0xff;
        var b = color & 0xff;

        var min = Math.min(r,g,b);
        var max = Math.max(r,g,b);
        var l = (max + min)*0.5 / 255 * 100;


        return l;
    },
    _hMinMax2RGB: function(h, min, max) {
        var r,g,b;
        var area = Math.floor(h / 60);
        // why case 0 not match Firefox 3.0?
        if (area == 0) {
            r = max;
            //0 - 0, 60-255
            g = min+h * (max-min)/ 60;
            b = min;
        } else {
            switch (area) {
                //case 0:
                //    r = max;
                //    //0 - 0, 60-255
                //    g = min+h * (max-min)/ 60;
                //    b = min;
                //    break;
                case 1:
                    r = max-(h-60) * (max-min)/60;
                    g = max;
                    b = min;
                    break;
                case 2:
                    r = min ;
                    g = max;
                    b = min+(h-120) * (max-min)/60;
                    break;
                case 3:
                    r = min;
                    g = max-(h-180) * (max-min)/60;
                    b = max;
                    break;
                case 4:
                    r = min+(h-240) * (max-min)/60;
                    g = min;
                    b = max;
                    break;
                case 5:
                    r = max;
                    g = min;
                    b = max-(h-300) * (max-min)/60;
                    break;
                case 6:
                    r = max;
                    //0 - 0, 60-255
                    g = min+h  * (max-min)/ 60;
                    b = min;
                    break;
            }
        }

        r = Math.min(255, Math.max(0, Math.round(r)));
        g = Math.min(255, Math.max(0, Math.round(g)));
        b = Math.min(255, Math.max(0, Math.round(b)));

        return {
            r: r, 
            g: g, 
            b: b
        };
    },
    _getHue: function(r, g, b, max, min) {
        var range = max - min;
        if (range==0){
            return 0;
        }

        var rr = (max - r);
        var gg = (max - g);
        var bb = (max - b);

        var h;
        switch(max){
            case r:
                h = bb - gg;
                break;
            case g:
                h = 2 *range+ rr - bb;
                break;
            case b:
                h = 4 *range+ gg - rr;
                break;
        }

        h*=-60;
        h/=range;
        h = (h<0)? h+360: h;

        return h;
    }
}


