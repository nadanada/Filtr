( function() {
    /*
    Author:  Markus Nix <mnix@markusnix.com>

    BSD License
    -----------

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

        * Redistributions of source code must retain the above copyright
          notice, this list of conditions and the following disclaimer.
        * Redistributions in binary form must reproduce the above copyright
          notice, this list of conditions and the following disclaimer in the
          documentation and/or other materials provided with the distribution.
        * Neither the name of the organization nor the
          names of its contributors may be used to endorse or promote products
          derived from this software without specific prior written permission.

    THIS SOFTWARE IS PROVIDED BY MARKUS NIX ``AS IS'' AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
    WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
    DISCLAIMED. IN NO EVENT SHALL MARKUS NIX BE LIABLE FOR ANY
    DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
    (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
    LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
    ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
    SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    */

    /*
    TODO:
    
    - filter modularization
    - add advanced filters like bevel, edge, corner
    - experimental video support
    - performance optimization
    */
 
    var LIBRARY = 'Filtr';
    var VERSION = '0.9.1';


    // common

    function $empty() {
    };

    function $extend( original, extended ) {
        for ( var key in ( extended || {} ) ) {
            original[key] = extended[key];
        }

        return original;
    };

    function $lambda( value ) {
        return ( typeof value == 'function' )? value : function() {
            return value;
        };
    };
    
    function $bound( val, min, max ) {
        if ( ( typeof min != 'undefined' ) && ( val < min ) ) {
            val = min;
        }
        
        if ( ( typeof max != 'undefined' ) && ( val > max ) ) {
            val = max;
        }
        
        return val;
    }
    
    function $within( val, min, max ) {
        return ( ( val >= min ) && ( val <= max ) );
    };

    function $splat( obj ) {
        var type = $type( obj );
        return type? ( ( type != 'array' )? [obj] : obj ) : [];
    };
    
    function $each( iterable, fn ) {
        var type = $type( iterable );

        if ( type == 'object' ) {
            for ( var key in iterable ) {
                fn( iterable[key], key );
            }
        } else {
            for ( var i = 0; i < iterable.length; i++ ) {
                fn( iterable[i], i );
            }
        }
    };

    function $merge() {
        var mix = {};

        for ( var i = 0, l = arguments.length; i < l; i++ ) {
            var object = arguments[i];

            if ( $type( object ) != 'object' ) {
                continue;
            }

            for ( var key in object ) {
                var op = object[key], mp = mix[key];
                mix[key] = ( mp && ( $type( op ) == 'object' ) && ( $type( mp ) == 'object' ) )? $merge( mp, op ) : $unlink( op );
            }
        }

        return mix;
    };

    function $unlink( object ) {
        var unlinked;

        switch ( $type( object ) ) {
            case 'object':
                unlinked = {};

                for ( var p in object ) {
                    unlinked[p] = $unlink( object[p] );
                }

                break;

            case 'array':
                unlinked = [];

                for ( var i = 0, l = object.length; i < l; i++ ) {
                    unlinked[i] = $unlink( object[i] );
                }

                break;

            default:
                return object;
        }

        return unlinked;
    };

    function $destroy( elem ) {
        $clean( elem );

        if ( elem.parentNode ) {
            elem.parentNode.removeChild( elem );
        }

        if ( elem.clearAttributes ) {
            elem.clearAttributes();
        }
    };

    function $clean( elem ) {
        for ( var ch = elem.childNodes, i = 0; i < ch.length; i++ ) {
            $destroy( ch[i] );
        }
    };

    function $insertAfter( parent, node, referenceNode ) {
        parent.insertBefore( node, referenceNode.nextSibling );
    };

    function $addEvent( elm, evType, fn, useCapture ) {
        if ( elm.addEventListener ) {
            elm.addEventListener( evType, fn, useCapture || false );
        } else if ( elm.attachEvent ) {
            elm.attachEvent( 'on' + evType, fn );
        } else {
            elm['on' + evType] = fn;
        }
    };

    function $console( text, level ) {
        var level = level || 'log';

        try {
            if ( window.console && ( level in console ) ) {
                console[level]( LIBRARY + ': ', text );
            }
        } catch ( ex ) {
        }
    };
    
    function $parseQuery( str, equalsChar ) {
        var str    = str || location.search || '';
        var result = {};

        if ( str.charAt( 0 ) == '?' ) {
            str = str.substring( 1 );
        }

        str = str.replace( /\+/g, ' ' );
        var parts = str.split( /[&;]/g );

        for ( var i = 0; i < parts.length; i++ ) {
            var keyValuePair = parts[i].split( equalsChar || '=' );
            var key = decodeURIComponent( keyValuePair[0] );
            var val = decodeURIComponent( keyValuePair[1] );

            result[key] = val;
        }

        return result;
    };

    function $( id ) {
        return document.getElementById( id );
    };
    
    function $c( v, properties, styles ) {
        var e = document.createElement( v );
        
        if ( properties ) {
            $each( properties, function( val, key ) {
                e[key] = val;
            } );
        }
        
        if ( styles ) {
            $each( styles, function( val, key ) {
                e.style[key] = val;
            } );
        }
        
        return e;
    };

    function $elementsByClass( searchClass, node, tag ) {
        var result  = new Array();
        var node    = node || document;
        var tag     = tag  || '*';
        var els     = node.getElementsByTagName( tag );
        var pattern = new RegExp( "(^|\\s)" + searchClass + "(\\s|$)" );

        for ( i = 0, j = 0; i < els.length; i++ ) {
            if ( pattern.test( els[i].className ) ) {
                result[j] = els[i];
                j++;
            }
        }

        return result;
    };

    function $hasClass( obj, klass ) {
        return ( ' ' + obj.className + ' ' ).indexOf( ' ' + klass + ' ' ) > -1;
    };

    function $addClass( obj, klass ) {
        if ( !$hasClass( obj, klass ) ) {
            obj.className = (obj.className + " " + klass);
        }
    };

    function $removeClass( obj, klass ) {
        obj.className = obj.className.replace( new RegExp( '(^|\\s)' + klass + '(?:\\s|$)'), '$1' );
    };

    Function.prototype.$bind = function( context ) {        var self = this;        
        return function() {            return self.apply( context, arguments );        };    };
    
    Array.prototype.$in = function( value ) {
        for ( var i = 0; i < this.length; i++ ) {
            if ( this[i] === value ) {
                return true;
            }
        }

        return false;
    };
    
    Array.prototype.$fill = function( count, value ) {
        this.length = 0;
        
        for ( var i = 0; i < count; i++ ) {
            this[i] = value;
        }
        
        return this;
    };
    
    Array.prototype.$max = function() {
        var m = 0;
        
        for ( var i = 0; i < this.length; i++ ) {
            if ( this[i] > m ) {
                m = this[i];
            }
        }
        
        return m;
    };

    Array.prototype.$insertAt = function( pos, d ) {
        if ( ( pos == 0 ) && !this.length ) {
            this.push( d );
            return;
        }
     
        if ( pos > this.length - 1 ) {
            return;
        }

        var tmp = this.slice( pos, this.length );
        this[pos] = d;

        for ( var a = 0; a <= tmp.length - 1; a++ ) {
            this[a + pos + 1] = tmp[a];
        }
    };

    var $type = function( ele ) {
        return $type.s.call( ele ).match( /^\[object\s(.*)\]$/ )[1].toLowerCase();
    };

    $type.s = Object.prototype.toString;


    // library

    if ( typeof mn == 'undefined' ) {
        mn = {};
    }
    
    
    // util object
    
    mn.filtrutil = ( function() {
        var createCanvas = function( w, h, returnCanvas ) {
            var c    = $c( 'canvas' );
            c.width  = w || 1;
            c.height = h || 1;
            
            return ( returnCanvas || false )? c : c.getContext( '2d' );
        };

        var rgbToHex = function( srcArray, arr ) {
            if ( srcArray.length < 3 ) {
                return null;
            }
    
            if ( ( srcArray.length == 4 ) && ( srcArray[3] == 0 ) && !arr ) {
                return 'transparent';
            }
            
            var hex = [];
    
            for ( var i = 0; i < 3; i++ ) {
                var bit = ( srcArray[i] - 0 ).toString( 16 );
                hex.push( ( bit.length == 1 )? '0' + bit : bit );
            }
            
            return arr? hex : '#' + hex.join( '' );
        };
        
        var hexToRGB = function( str ) {
            if ( str.indexOf( '#' ) == 0 ) {
                str = str.substring( 1 );
            }
    
            var red   = str.substring( 0, 2 );
            var green = str.substring( 2, 4 );
            var blue  = str.substring( 4, 6 );
   
            return {
                r: parseInt( red,   16 ),
                g: parseInt( green, 16 ),
                b: parseInt( blue,  16 )
            };
        };
        
        return {
            rgbToHex:     rgbToHex,
            hexToRGB:     hexToRGB,
            createCanvas: createCanvas,
                    
            createBlurCanvas: function( params, radius ) {
                var bc   = createCanvas( params.width, params.height, true );
                var bctx = bc.getContext( '2d' );
                bctx.drawImage( params.canvas, 0, 0 );

                var sw = Math.round( params.width  / 2 );
                var sh = Math.round( params.height / 2 );

                var c    = createCanvas( sw, sh, true );
                var cctx = c.getContext( '2d' );
            
                var ws, hs;
                for ( var i = 0; i < Math.round( radius ); i++ ) {
                    ws = Math.max( 1, Math.round( sw - i ) );
                    hs = Math.max( 1, Math.round( sh - i ) );

                    cctx.clearRect( 0, 0, sw, sh );
                    cctx.drawImage( bc, 0, 0, params.width, params.height, 0, 0, ws, hs );

                    bctx.clearRect( 0, 0, params.width, params.height );
                    bctx.drawImage( c, 0, 0, ws, hs, 0, 0, params.width, params.height );
                }
                
                return bc;
            },
            
            getCanvasData: function( params, getCopy ) {
                var ctx      = params.canvas.getContext( '2d' );
                var rect     = params.options.rect;
                var dataDesc = ctx.getImageData( rect.left, rect.top, rect.width, rect.height );
                var data     = dataDesc.data;

                if ( !getCopy ) {
                    params.canvasData = dataDesc;
                }

                return data;
            },

            hsbToRGB: function( h, s, b ) {
                var f, u, p, q, t, c = mn.client.isProper? Math.round( b / 100 * 255 ) : Math.min( 255, Math.max( 0, Math.round( b / 100 * 255 ) ) );
            
                if ( s == 0 ) {
                    return {r: c, g: c, b: c};
                } else {
                    u = h % 360;
                    f = u % 60;
                    p = mn.client.isProper? Math.round( ( b * (  100 - s ) ) / 10000 * 255 )               : Math.min( 255, Math.max( 0, Math.round( ( b * (  100 - s ) ) / 10000 * 255 ) ) );
                    q = mn.client.isProper? Math.round( ( b * ( 6000 - s * f ) ) / 600000 * 255 )          : Math.min( 255, Math.max( 0, Math.round( ( b * ( 6000 - s * f ) ) / 600000 * 255 ) ) );
                    t = mn.client.isProper? Math.round( ( b * ( 6000 - s * ( 60 - f ) ) ) / 600000 * 255 ) : Math.min( 255, Math.max( 0, Math.round( ( b * ( 6000 - s * ( 60 - f ) ) ) / 600000 * 255 ) ) );
                
                    switch ( Math.floor( u / 60 ) ) {
                        case 0: return {r: c, g: t, b: p};
                        case 1: return {r: q, g: c, b: p};
                        case 2: return {r: p, g: c, b: t};
                        case 3: return {r: p, g: q, b: c};
                        case 4: return {r: t, g: p, b: c};
                        case 5: return {r: c, g: p, b: q};
                    }
                }
            
                return {r: 0, g: 0, b: 0};
            },
        
            rgbToHSB: function( r, g, b ) {
                var rr, gr, br, h, a = Math.max( r, g, b ), i = Math.min( r, g, b ), d = a - i, n = a / 255, s = ( a != 0 )? d / a : 0;
            
                if ( s == 0 ) {
                    h = 0;
                } else {
                    rr  = ( a - r ) / d;
                    gr  = ( a - g ) / d;
                    br  = ( a - b ) / d;
                    h   = ( ( r == a )? br - gr : ( ( g == a )? 2 + rr - br : 4 + gr - rr ) );
                    h  /= 6;
                
                    if ( h < 0 ) {
                        h++;
                    }
                }
            
                return {
                    h: Math.round( h * 360 ),
                    s: Math.round( s * 100 ),
                    b: Math.round( n * 100 )
                };
            },
        
            yuvToRGB: function( y, u, v ) {
                return {
                    r: Math.min( 255, Math.max( 0, Math.round( y + v / 0.877 ) ) ),
                    g: Math.min( 255, Math.max( 0, Math.round( y - 0.39466 * u - 0.5806 * v ) ) ),
                    b: Math.min( 255, Math.max( 0, Math.round( y + u / 0.493 ) ) )
                };
            },
        
            rgbToYUV: function( r, g, b ) {
                var y = 0.299 * r + 0.587 * g + 0.114 * b;
                
                return {
                    y: y,
                    u: ( b - y ) * 0.493,
                    v: ( r - y ) * 0.877
                };
            },
            
            reduceColor: function( r, g, b, average ) {
                return ( average || true )?
                    ( ( r + g + b ) / 3 ) :
                    ( r * 0.3 + g * 0.59 + b * 0.11 );
            },
        
            randomInt: function( val1, val2 ) {
                return ( val2 > val1 )?
                    ( Math.round( Math.random() * ( val2 - val1 ) ) + val1 ) :
                    ( Math.round( Math.random() * ( val1 - val2 ) ) + val2 );
            },
        
            tupelize: function( arr, steps ) {
                steps = steps || 4;
            
                if ( arr.length % steps != 0 ) {
                    return false;
                }
            
                var result = [];
                for ( var i = 0; i < arr.length; i += steps ) {
                    result.push( arr.slice( arr[i], arr[i + steps] ) );
                }
            
                return result;
            },
        
            processKernel: function( arr ) {
                for ( var i = 0, w = 0; i < 3; i++ ) {
                    for ( var j = 0; j < 3; j++ ) {
                        w += arr[i][j];
                    }
                }
            
                return w;
            },
            
            parseFilter: function( str ) {
                var str     = str || '';
                var options = {};
                
                if ( str.indexOf( '[' ) > -1 ) {
                    var tmp  = str;
                    str      = tmp.substr( 0, tmp.indexOf( '[' ) );
                    var arg  = tmp.match( /\[(.*?)\]/ );
                    var cast = function( val ) {
                        var arg;

                        if ( val.match( /^(false|off|disabled)$/ ) ) {
                            return new Boolean( false );
                        } else if ( val.match( /^(true|on|enabled)$/ ) ) {
                            return new Boolean( true );
                        } else if ( arg = val.match( /^(\#[0-9A-Fa-f]{6})$/ ) ) {
                            return hexToRGB( arg[1] );
                        } else if ( arg = val.match( /^([0-9\.\-]*)$/ ) ) {
                            return parseFloat( arg[1] );
                        } else if ( arg = val.match( /^([0-9\-]*)$/ ) ) {
                            return parseInt( arg[1], 10 );
                        } else if ( val.indexOf( ':' ) > -1 ) {
                            return $parseQuery( val, ':' );
                        } else if ( val.indexOf( ',' ) > -1 ) {
                            return val.split( ',' );
                        }
                        
                        return val;
                    };

                    if ( arg[1] ) {
                        $each( $parseQuery( arg[1] ), function( val, key ) {
                            switch ( key ) {
                                case 'rect':
                                    var tmp = val.split( ',' );
                                    options[key] = {
                                        left:   parseInt( tmp[0], 10 ) || 0,
                                        top:    parseInt( tmp[1], 10 ) || 0,
                                        width:  parseInt( tmp[2], 10 ) || 0,
                                        height: parseInt( tmp[3], 10 ) || 0
                                    };
                                    
                                    break;
                                    
                                default:
                                    options[key] = cast( val );
                            }
                        } );
                    }
                }
                
                return {
                    filter:  str,
                    options: options
                };
            }
        }
    } )();
    
    
    // client object

    mn.client = ( function() {
        var hasCanvas = ( function() {
            var c = $c( 'canvas' ), val = false;

            try {
                val = !!( ( typeof c.getContext == 'function' ) && c.getContext( '2d' ) );
            } catch( ex ) {
            }

            return $lambda( val );
        } )();

        var hasCanvasData = ( function() {
            var c = $c( 'canvas'), val = false, ctx;

            try {
                if ( ( typeof c.getContext == 'function' ) && ( ctx = c.getContext( '2d' ) ) ) {
                    val = ( typeof ctx.getImageData == 'function' );
                }
            } catch ( ex ) {
            }

            return $lambda( val );
        } )();

        var hasAlpha = ( function() {
            var val = false;

            if ( hasCanvas() && hasCanvasData() ) {
                var redctx = mn.filtrutil.createCanvas( 1, 1 );
                redctx.fillStyle = 'rgba(255,0,0,0.5)';
                redctx.fillRect( 0, 0, 1, 1 );
                var reddata = redctx.getImageData( 0, 0, 1, 1 ).data;
 
                val = ( reddata[0] == 255 );
            }

            return $lambda( val );
        } )();

        var hasAlphaGlobal = ( function() {
            var val = false;

            if ( hasCanvas() && hasCanvasData() ) {
                var redctx = mn.filtrutil.createCanvas( 1, 1 );
                redctx.fillStyle = 'rgb(255,0,0)';
                redctx.fillRect( 0, 0, 1, 1 );

                var blue    = mn.filtrutil.createCanvas( 1, 1, true );
                var bluectx = blue.getContext( '2d' );
                bluectx.fillStyle = 'rgb(0,0,255)';
                bluectx.fillRect( 0, 0, 1, 1 );

                redctx.globalAlpha = 0.5;
                redctx.drawImage( blue, 0, 0 );
                var reddata = redctx.getImageData( 0, 0, 1, 1 ).data;

                val = ( reddata[2] != 255 );
            }

            return $lambda( val );
        } )();

        var ua       = navigator.userAgent;
        var isOpera  = ( Object.prototype.toString.call( window.opera ) == '[object Opera]' );
        var isWebKit = ( ua.indexOf( 'AppleWebKit/' ) > -1 );
        var isChrome = ( ua.indexOf( 'Chrome'       ) > -1 );
        var isIE     = !!window.attachEvent && !isOpera;
        
        /* FOR FUTURE USE
        if ( isIE && ( document.namespaces['v'] == null ) ) {
            for ( var i = 0, s = document.createStyleSheet(), e = 'shape shapetype group background path formulas handles fill stroke shadow textbox textpath imagedata line polyline curve roundrect oval rect arc image'.split( ' ' ); i < e.length; i++ ) {
                s.addRule( "v\\:" + e[i], "behavior: url(#default#VML);");
            }
                
            document.namespaces.add( 'v', 'urn:schemas-microsoft-com:vml' );
        }
        */
        
        return {
            hasCanvas:      hasCanvas(),
            hasCanvasData:  hasCanvasData(),
            hasAlpha:       hasAlpha(),
            hasAlphaGlobal: hasAlphaGlobal(),
            isProper:       ( isOpera || isChrome || isWebKit ),

            Opera:          isOpera,
            WebKit:         isWebKit,
            Chrome:         isChrome,
            IE:             isIE,
            Gecko:          ( ua.indexOf( 'Gecko' ) > -1 ) && ( ua.indexOf( 'KHTML' ) === -1 )
        };
    } )();
    
    
    // history object
    
    mn.filtrhistory = function() {
        var stack = [];
    
        this.push = function( data ) {
            return ( stack.$insertAt( 0, data ) );
        };
        
        this.shift = function() { 
            if ( stack.length == 0 ) {
                return false;            
            }
            
            stack.reverse();
            var last = stack.pop();
            stack.reverse();

            return last;
        };
    };


    // iterator object
    
    mn.filtriterator = ( function() {
        var getOffsetPrev = function( w, h, x, y ) {
            return ( ( ( ( y == 1 )? 0 : y - 2 ) * w * 4 ) + ( ( x == 1 )? 0 : x - 2 ) * 4 );
        };
        
        var getOffsetNext = function( w, h, x, y ) {
            return ( ( ( ( y == h )? y - 1 : y ) * w * 4 ) + ( ( x == w )? x - 1 : x ) * 4 );
        };
        
        return {
            linear: function( params, callback ) {
                if ( typeof callback != 'function' ) {
                    return false;
                }
            
                var p       = params.width * params.height;
                var offset1 = p * 4;
                var offset2 = offset1 + 1;
                var offset3 = offset1 + 2;
                var offset4 = offset1 + 3;
            
                while ( p-- ) {
                    callback( offset1 -= 4, offset2 -= 4, offset3 -= 4, offset4 -= 4 );
                }
            
                return true;
            },
        
            block: function( params, blocksize, callback ) {
                if ( typeof callback != 'function' ) {
                    return false;
                }
            
                var rect = params.options.rect;
                var w    = rect.width;
                var h    = rect.height;
                var w4   = w * 4;
                var pctx = mn.filtrutil.createCanvas( 1, 1 );
                var c    = mn.filtrutil.createCanvas( w, h, true );
                var cctx = c.getContext( '2d' );
                cctx.drawImage( params.canvas, rect.left, rect.top, w, h, 0, 0, w, h );

                for ( var y = 0; y < h; y += blocksize ) {
                    for ( var x = 0; x < w; x += blocksize ) {
                        if ( blocksize + x > w ) {
                            blocksize = w - x;
                        }
                    
                        if ( blocksize + y > h ) {
                            blocksize = h - y;
                        }
                    
                        callback( x, y, c, pctx, rect );
                    }
                }
        
                return true;
            },
            
            radial: function( params, radius, density, callback ) {
                if ( typeof callback != 'function' ) {
                    return false;
                }
                
                var rect = params.options.rect;
                var w    = rect.width;
                var h    = rect.height;
                var pctx = mn.filtrutil.createCanvas();
                var dist = 1 / density;
                var dia  = radius * 2;
            
                for ( var y = 0; y < h + radius; y += dia * dist ) {
                    for ( var x = 0; x < w + radius; x += dia * dist ) {
                        callback( x, y, pctx, rect );
                    }
                }
                
                return true;        
            },
        
            matrix: function( params, callback ) {
                if ( typeof callback != 'function' ) {
                    return false;
                }

                var w  = params.width;
                var h  = params.height;
                var w4 = w * 4;
                var y  = h;
            
                do {
                    var offsetY = ( y - 1 ) * w4, x = w;
                            
                    do {
                        var offset = offsetY + ( x - 1 ) * 4;
                        callback( offset, offset + 1, offset + 2, offset + 3, w, h, x, y );
                    } while ( --x );
                } while ( --y );

                return true;
            },
        
            matrixarea: function( params, callback ) {
                if ( typeof callback != 'function' ) {
                    return false;
                }

                var w  = params.width;
                var h  = params.height;
                var w4 = w * 4;
                var y  = h;
            
                do {
                    var offsetY = ( y - 1 ) * w4, x = w;
                            
                    do {
                        var offset     = offsetY + ( x * 4 - 4 );
                        var offsetPrev = getOffsetPrev( w, h, x, y );
                        var offsetNext = getOffsetNext( w, h, x, y );
                        
                        callback( offset, offset + 1, offset + 2, offset + 3, w, h, x, y, offsetPrev, offsetNext );
                    } while ( --x );
                } while ( --y );

                return true;
            }
        };
    } )();
    
    
    // filtr object

    mn.filtr = ( function() {
        ( function onready( handler ) {
            var handlerDone = false;
            var execTimer   = false;
            
            var execHandler = function() {
                if ( !handlerDone ) {
                    handlerDone = true;
                    
                    if ( execTimer ) {
                        window.clearInterval( execTimer );
                    }
                    
                    handler();
                }
            }

            if ( mn.client.WebKit ) {
                execTimer = window.setInterval( function() {
                    if ( /loaded|complete/.test( document.readyState ) ) {
                        execHandler(); 
                    }
                }, 10);
            }

            if ( document.addEventListener ) {
                window.addEventListener( 'DOMContentLoaded', function() {
                    execHandler();
                }, false );
            }

/*@cc_on @*/
/*@if (@_win32)
            document.write( '<script id="__ie_onload_filtr" defer src=//:><\/script>"' );
            var script = document.getElementById( "__ie_onload_filtr" );
            script.onreadystatechange = function() {
                if ( this.readyState == 'complete' ) {
                    execHandler(); 
                }
            };
/*@end @*/
        } )( function() {
            var libname = LIBRARY.toLowerCase();

            for ( var i = 0, elements = $elementsByClass( libname, null, 'img' ).concat( $elementsByClass( libname, null, 'canvas' ) ); i < elements.length; i++ ) {
                ( function() {
                    var el           = elements[i];
                    var filters      = [];
                    var processTimer = false;
                    var classes      = el.className.split( ' ' );
                    var process      = function( filters ) {
                        if ( processTimer ) {
                            window.clearInterval( processTimer );
                        }
                    
                        for ( var a = 0; a < filters.length; a++ ) {
                            var res = mn.filtr.applyImageFilter( el, el, filters[a], null );

                            if ( res ) {
                                el = res;
                            }
                        }
                    };

                    for ( var c = 0; c < classes.length; c++ ) {
                        var cls = classes[c];

                        if ( cls.substring( 0, libname.length + 1 ) == libname + '-' ) {
                            var filterName = cls.substring( libname.length + 1 );

                            if ( filterName != '' ) {
                                filters.push( filterName );
                            }
                        }
                    }

                    if ( filters.length ) {
                        if ( el.tagName.toLowerCase() == 'img' ) {
                            var dataImg = new Image();
                            dataImg.src = el.src;

                            if ( dataImg.complete ) {
                                process( filters );
                            } else {
                                dataImg.onload = function() {
                                    process( filters );
                                }
                            }
                        } else {
                            processTimer = window.setTimeout( function() {
                                process( filters );
                            }, 1 );
                        }
                    }
                } )();
            }
        } );


        // this libraries public interface
        
        return {
            version: VERSION,
            filters: {},
            
            applyImageFilter: function( img, dataImg, filterName, options ) {
                options = options || {};
                var isCanvas = ( img.tagName.toLowerCase() == 'canvas' );

                if ( isCanvas && mn.client.IE ) {
                    return false;
                }

                var canvas, ctx, output = false;

                if ( mn.client.hasCanvas ) {
                    output = !!options.resultCanvas;
                    canvas = options.resultCanvas || $c( 'canvas' );
                    ctx    = canvas.getContext( '2d' );
                }

                var w = img.offsetWidth;
                var h = img.offsetHeight;

                if ( isCanvas ) {
                    w = img.width;
                    h = img.height;
                }

                // offsetWidth/Height might be 0 if the image is not in the document
                if ( ( w == 0 ) || ( h == 0 ) ) {
                    if ( img.parentNode == null ) {
                        // add the image to the doc (way out left), read its dimensions and remove it again
                        var oldpos  = img.style.position;
                        var oldleft = img.style.left;
                        img.style.position = 'absolute';
                        img.style.left     = '-9999px';
                        document.body.appendChild( img );

                        w = img.offsetWidth;
                        h = img.offsetHeight;
                        document.body.removeChild( img );

                        img.style.position = oldpos;
                        img.style.left     = oldleft;
                    } else {
                        return;
                    }
                }

                var args   = mn.filtrutil.parseFilter( filterName );
                var filter = args.filter;
                options    = $extend( options, args.options );

                if ( !mn.filtr.filters[filter] ) {
                    return false;
                }

                if ( !options.rect ) {
                    options.rect = {
                        left:   0,
                        top:    0,
                        width:  w,
                        height: h
                    };
                } else {
                    options.rect.left   = Math.round( options.rect.left   );
                    options.rect.top    = Math.round( options.rect.top    );
                    options.rect.width  = Math.round( options.rect.width  );
                    options.rect.height = Math.round( options.rect.height );
                }
                
                if ( mn.client.hasCanvas ) {
                    if ( canvas !== img ) {
                        canvas.width  = w;
                        canvas.height = h;
                    }

                    if ( !output ) {
                        canvas.style.width  = w + 'px';
                        canvas.style.height = h + 'px';
                    }

                    ctx.drawImage( dataImg, 0, 0, w, h );

                    // push to history
                    if ( typeof canvas.__history == 'undefined' ) {
                        canvas.__history = new mn.filtrhistory();
                    }
                    
                    canvas.__history.push( {
                        image:  img,
                        width:  w,
                        height: h
                    } );
                } else if ( mn.client.IE ) {
                    if ( typeof img.__history == 'undefined' ) {
                        img.__history = new mn.filtrhistory();
                    }
                
                    img.__history.push( {
                        style: img.style.cssText
                    } );
                }
                
                var params = {
                    image:    img,
                    canvas:   canvas,
                    width:    w,
                    height:   h,
                    changed:  true,
                    options:  options,
                    replaced: false
                };

                filter = mn.filtr.filters[filter];
                
                if ( typeof filter.options != 'undefined' ) {
                    options = $extend( options, filter.options );
                }
                
                if ( !filter.supported || !filter.process( params, options ) ) {
                    return false;
                }

                if ( mn.client.hasCanvas ) {
                    // put data back if modified
                    if ( params.changed && mn.client.hasCanvasData ) {
                        var ctx = canvas.getContext( '2d' );
                        ctx.putImageData( params.canvasData, options.rect.left, options.rect.top );

                        // force opera to update
                        if ( mn.client.Opera ) {
                            ctx.fillRect( 0, 0, 0, 0 );
                        }
                    }

                    if ( !options.leaveDOM ) {
                        // copy properties
                        canvas.title  = img.title;
                        canvas.imgsrc = img.imgsrc;

                        if ( !isCanvas ) {
                            canvas.alt    = img.alt;
                            canvas.imgsrc = img.src;
                        }

                        canvas.className     = img.className;
                        canvas.style.cssText = img.style.cssText;
                        canvas.name          = img.name;
                        canvas.tabIndex      = img.tabIndex;
                        canvas.id            = img.id;

                        if ( img.parentNode && img.parentNode.replaceChild ) {
                            img.parentNode.replaceChild( canvas, img );
                        }
                    }

                    options.resultCanvas = canvas;
                    return canvas;
                }
                
                return img;
            },

            addFilters: function( filters ) {
                $extend( this.filters, filters );
                return true;
            },
            
            getFilters: function() {
                var filters = [];
                
                for ( var key in this.filters ) {
                    filters.push( key );
                }
                
                return filters;
            },
            
            process: function( ele, filterName, options, callback ) {
                switch ( ele.tagName.toLowerCase() ) {
                    case 'img':
                        var dataImg = new Image();
                        dataImg.src = ele.src;

                        if ( dataImg.complete ) {
                            var res = mn.filtr.applyImageFilter( ele, dataImg, filterName, options );

                            if ( callback ) {
                                callback( res );
                            }

                            return res;
                        } else {
                            dataImg.onload = function() {
                                var res = mn.filtr.applyImageFilter( ele, dataImg, filterName, options );

                                if ( callback ) {
                                    callback( res );
                                }
                            }
                        }

                        break;

                    case 'canvas':
                        var res = mn.filtr.applyImageFilter( ele, ele, filterName, options );

                        if ( callback ) {
                            callback( res );
                        }

                        return res;
                }
            },

            undo: function( ele ) {
                var d;
                
                if ( ( typeof ele.__history == 'undefined' ) || !( d = ele.__history.shift() ) ) {
                    return false;
                }
                
                if ( mn.client.hasCanvas && ( ele.tagName.toLowerCase() == 'canvas' ) ) {
                    ele.width  = d.width;
                    ele.height = d.height;
                    ele.getContext( '2d' ).drawImage( d.image, 0, 0 );

                    if ( ele.parentNode && ele.parentNode.replaceChild ) {
                        ele.parentNode.replaceChild( d.image, ele );
                    }
                } else if ( mn.client.IE ) {
                    ele.style.cssText = d.style;
                }
                
                return ele;
            }
        }
    } )();
    

    // filter implementations

    // adjusthsba
    mn.filtr.filters.adjusthsba = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.hasAlpha ),
            process:   function( params, options ) {
                this.options = $extend( {
                    hue:        1,
                    saturation: 1,
                    brightness: 1,
                    alpha:      1
                }, options || {} );

                this.d = mn.filtrutil.getCanvasData( params );

                return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    var hsb = mn.filtrutil.rgbToHSB( this.d[pr], this.d[pg], this.d[pb] );
                    
                    hsb.h *= this.options.hue;
                    hsb.s *= this.options.saturation;
                    hsb.b *= this.options.brightness;
        
                    var rgb = mn.filtrutil.hsbToRGB( $bound( hsb.h, 0, 360 ), $bound( hsb.s, 0, 100 ), $bound( hsb.b, 0, 100 ) );
                    
                    this.d[pr] = rgb.r;
                    this.d[pg] = rgb.g;
                    this.d[pb] = rgb.b;
                    this.d[pa] = Math.min( 255, Math.max( 0, this.d[pa] * this.options.alpha ) );
                }.$bind( this ) );
            }
        }
    } )();

    // adjustrgba
    mn.filtr.filters.adjustrgba = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.hasAlpha ),
            process:   function( params, options ) {
                this.options = $extend( {
                    red:   1,
                    green: 1,
                    blue:  1,
                    alpha: 1
                }, options || {} );

                this.d = mn.filtrutil.getCanvasData( params );
                
                if ( mn.client.isProper ) {
                    return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        this.d[pr] = this.d[pr] * this.options.red;
                        this.d[pg] = this.d[pg] * this.options.green;
                        this.d[pb] = this.d[pb] * this.options.blue;
                        this.d[pa] = this.d[pa] * this.options.alpha;
                    }.$bind( this ) );
                } else {
                    return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        this.d[pr] = Math.min( 255, Math.max( 0, this.d[pr] * this.options.red   ) );
                        this.d[pg] = Math.min( 255, Math.max( 0, this.d[pg] * this.options.green ) );
                        this.d[pb] = Math.min( 255, Math.max( 0, this.d[pb] * this.options.blue  ) );
                        this.d[pa] = Math.min( 255, Math.max( 0, this.d[pa] * this.options.alpha ) );
                    }.$bind( this ) );
                }
            }
        }
    } )();
    
    // adjustyuva
    mn.filtr.filters.adjustyuva = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.hasAlpha ),
            process:   function( params, options ) {
                this.options = $extend( {
                    luminance:  1,
                    blueyellow: 1,
                    redcyan:    1,
                    alpha:      1
                }, options || {} );

                this.d = mn.filtrutil.getCanvasData( params );

                return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    var yuv = mn.filtrutil.rgbToYUV( this.d[pr], this.d[pg], this.d[pb] );
                    var rgb = mn.filtrutil.yuvToRGB( yuv.y * this.options.luminance, yuv.u * this.options.blueyellow, yuv.v * this.options.redcyan );
        
                    this.d[pr] = rgb.r;
                    this.d[pg] = rgb.g;
                    this.d[pb] = rgb.b;
                    this.d[pa] = Math.min( 255, Math.max( 0, this.d[pa] * this.options.alpha ) );
                }.$bind( this ) );
            }
        }
    } )();
    
    // alpha
    mn.filtr.filters.alpha = ( function() {
        return {
            supported: ( ( mn.client.hasCanvasData && mn.client.hasAlpha ) || mn.client.IE ),
            process:   function( params, options ) {
                this.options = $extend( {
                    opacity: 100
                }, options || {} );

                if ( mn.client.hasCanvasData && mn.client.hasAlpha ) {
                    this.options.opacity = parseInt( this.options.opacity / 100 * 255, 10 );
                    this.d = mn.filtrutil.getCanvasData( params );

                    return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        this.d[pa] = this.options.opacity;
                    }.$bind( this ) );
                } else if ( mn.client.IE ) {
                    params.image.style.filter += ' progid:DXImageTransform.Microsoft.Alpha(opacity=' + this.options.opacity + ')';
                    return true;
                }
            }
        }
    } )();

    // alphamask
    mn.filtr.filters.alphamask = ( function() {
        return {
            supported: ( mn.client.hasCanvasData && mn.client.hasAlpha ),
            process:   function( params, options ) {
                this.options = $extend( {
                    opacity: 100
                }, options || {} );

                if ( mn.client.hasCanvasData && mn.client.hasAlpha ) {
                    this.d = mn.filtrutil.getCanvasData( params );

                    return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        var t = Math.round( this.d[pr] * 0.299 + this.d[pg] * 0.587 + this.d[pb] * 0.114 );
                        
                        this.d[pr] = this.d[pg] = this.d[pb] = 0;
                        this.d[pa] = 255 - t;
                    }.$bind( this ) );
                }
            }
        }
    } )();

    // blend
    mn.filtr.filters.blend = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    amount: 50,
                    mode:   'normal',
                    image:  false
                }, options || {} );
            
                this.options.amount = Math.max( 0, Math.min( 1, this.options.amount ) );
                this.options.mode   = this.options.mode.toLowerCase();
                this.options.image  = $( this.options.image );
                
                if ( !this.options.image || ( this.options.image.tagName.toLowerCase() != 'img' ) ) {
                    return false;
                }
                
                this.d    = mn.filtrutil.getCanvasData( params );
                var c2    = mn.filtrutil.createCanvas( params.canvas.width, params.canvas.height, true );
                var c2ctx = c2.getContext( '2d' );
                c2ctx.drawImage( this.options.image, 0, 0 );

                var p2  = {canvas: c2, options: params.options};
                this.d2 = mn.filtrutil.getCanvasData( p2 );

                var callbacks = {
                    multiply: function( pr, pg, pb, pa ) {
                        this.d2[pr] = this.d[pr] * this.d2[pr] / 255;
                        this.d2[pg] = this.d[pg] * this.d2[pg] / 255;
                        this.d2[pb] = this.d[pb] * this.d2[pb] / 255;
                    },
                    lighten: function( pr, pg, pb, pa ) {
                        if ( this.d[pr] > this.d2[pr] ) this.d2[pr] = this.d[pr];    
                        if ( this.d[pg] > this.d2[pg] ) this.d2[pg] = this.d[pg];
                        if ( this.d[pb] > this.d2[pb] ) this.d2[pb] = this.d[pb];
                    },
                    darken: function( pr, pg, pb, pa ) {
                        if ( this.d[pr] < this.d2[pr] ) this.d2[pr] = this.d[pr];    
                        if ( this.d[pg] < this.d2[pg] ) this.d2[pg] = this.d[pg];
                        if ( this.d[pb] < this.d2[pb] ) this.d2[pb] = this.d[pb];
                    },
                    darkercolor: function( pr, pg, pb, pa ) {
                        if ( mn.filtrutil.reduceColor( this.d[pr], this.d[pg], this.d[pb], false ) <= mn.filtrutil.reduceColor( this.d2[pr], this.d2[pg], this.d2[pb], false ) ) {
                            this.d2[pr] = this.d[pr];
                            this.d2[pg] = this.d[pg];
                            this.d2[pb] = this.d[pb];
                        }
                    },
                    lightercolor: function( pr, pg, pb, pa ) {
                        if ( mn.filtrutil.reduceColor( this.d[pr], this.d[pg], this.d[pb], false )  > mn.filtrutil.reduceColor( this.d2[pr], this.d2[pg], this.d2[pb], false ) ) {
                            this.d2[pr] = this.d[pr];
                            this.d2[pg] = this.d[pg];
                            this.d2[pb] = this.d[pb];
                        }
                    },
                    lineardodge: function( pr, pg, pb, pa ) {
                        this.d2[pr] = ( ( r = this.d[pr] + this.d2[pr] ) > 255 )? 255 : r;
                        this.d2[pg] = ( ( g = this.d[pg] + this.d2[pg] ) > 255 )? 255 : g;
                        this.d2[pb] = ( ( b = this.d[pb] + this.d2[pb] ) > 255 )? 255 : b;
                    },
                    linearburn: function( pr, pg, pb, pa ) {
                        this.d2[pr] = ( ( r = this.d[pr] + this.d2[pr] ) < 255 )? 0 : ( r - 255 );
                        this.d2[pg] = ( ( g = this.d[pg] + this.d2[pg] ) < 255 )? 0 : ( g - 255 );
                        this.d2[pb] = ( ( b = this.d[pb] + this.d2[pb] ) < 255 )? 0 : ( b - 255 );
                    },
                    difference: function( pr, pg, pb, pa ) {
                        var r, g, b;
                        
                        this.d2[pr] = ( ( r = this.d[pr] - this.d2[pr] ) < 0 )? -r : r;
                        this.d2[pg] = ( ( g = this.d[pg] - this.d2[pg] ) < 0 )? -g : g;
                        this.d2[pb] = ( ( b = this.d[pb] - this.d2[pb] ) < 0 )? -b : b;
                    },
                    screen: function( pr, pg, pb, pa ) {
                        this.d2[pr] = ( 255 - ( ( ( 255 - this.d2[pr] ) * ( 255 - this.d[pr] ) ) >> 8 ) );
                        this.d2[pg] = ( 255 - ( ( ( 255 - this.d2[pg] ) * ( 255 - this.d[pg] ) ) >> 8 ) );
                        this.d2[pb] = ( 255 - ( ( ( 255 - this.d2[pb] ) * ( 255 - this.d[pb] ) ) >> 8 ) );
                    },
                    exclusion: function( pr, pg, pb, pa ) {
                        var r, g, b, div = 2 / 255;
                        
                        this.d2[pr] = ( r = this.d[pr] ) - ( r * div - 1 ) * this.d2[pr];
                        this.d2[pg] = ( g = this.d[pg] ) - ( g * div - 1 ) * this.d2[pg];
                        this.d2[pb] = ( b = this.d[pb] ) - ( b * div - 1 ) * this.d2[pb];
                    },
                    overlay: function( pr, pg, pb, pa ) {
                        var r, g, b, div = 2 / 255;
                        
                        this.d2[pr] = ( ( r = this.d[pr] ) < 128 )? ( this.d2[pr] * r * div ) : ( 255 - ( 255 - this.d2[pr] ) * ( 255 - r ) * div );
                        this.d2[pg] = ( ( g = this.d[pg] ) < 128 )? ( this.d2[pg] * g * div ) : ( 255 - ( 255 - this.d2[pg] ) * ( 255 - g ) * div );
                        this.d2[pb] = ( ( b = this.d[pb] ) < 128 )? ( this.d2[pb] * b * div ) : ( 255 - ( 255 - this.d2[pb] ) * ( 255 - b ) * div );
                    },
                    softlight: function( pr, pg, pb, pa ) {
                        var r, g, b, div = 2 / 255;
                        
                        this.d2[pr] = ( ( r = this.d[pr] ) < 128 )? ( ( ( this.d2[pr] >> 1 ) + 64 ) * r * div ) : ( 255 - ( 191 - ( this.d2[pr] >> 1 ) ) * ( 255 - r ) * div );
                        this.d2[pg] = ( ( g = this.d[pg] ) < 128 )? ( ( ( this.d2[pg] >> 1 ) + 64 ) * g * div ) : ( 255 - ( 191 - ( this.d2[pg] >> 1 ) ) * ( 255 - g ) * div );
                        this.d2[pb] = ( ( b = this.d[pb] ) < 128 )? ( ( ( this.d2[pb] >> 1 ) + 64 ) * b * div ) : ( 255 - ( 191 - ( this.d2[pb] >> 1 ) ) * ( 255 - b ) * div );
                    },
                    hardlight: function( pr, pg, pb, pa ) {
                        var r, g, b, div = 2 / 255;
                        
                        this.d2[pr] = ( ( r = this.d2[pr] ) < 128 )? ( this.d[pr] * r * div ) : ( 255 - ( 255 - this.d[pr] ) * ( 255 - r ) * div );
                        this.d2[pg] = ( ( g = this.d2[pg] ) < 128 )? ( this.d[pg] * g * div ) : ( 255 - ( 255 - this.d[pg] ) * ( 255 - g ) * div );
                        this.d2[pb] = ( ( b = this.d2[pb] ) < 128 )? ( this.d[pb] * b * div ) : ( 255 - ( 255 - this.d[pb] ) * ( 255 - b ) * div );
                    },
                    colordodge: function( pr, pg, pb, pa ) {
                        var r, g, b;
                        
                         this.d2[pr] = ( ( ( r = ( this.d[pr] << 8 ) / ( 255 - ( r = this.d2[pr] ) ) ) > 255 ) || ( r == 255 ) )? 255 : r;
                         this.d2[pg] = ( ( ( g = ( this.d[pg] << 8 ) / ( 255 - ( g = this.d2[pg] ) ) ) > 255 ) || ( g == 255 ) )? 255 : g;
                         this.d2[pb] = ( ( ( b = ( this.d[pb] << 8 ) / ( 255 - ( b = this.d2[pb] ) ) ) > 255 ) || ( b == 255 ) )? 255 : b;
                    },
                    colorburn: function( pr, pg, pb, pa ) {
                        var r, g, b;
                        
                        this.d2[pr] = ( ( ( r = 255 - ( ( 255 - this.d[pr] ) << 8 ) / this.d2[pr] ) < 0 ) || ( this.d2[pr] == 0 ) )? 0 : r;
                        this.d2[pg] = ( ( ( g = 255 - ( ( 255 - this.d[pg] ) << 8 ) / this.d2[pg] ) < 0 ) || ( this.d2[pg] == 0 ) )? 0 : g;
                        this.d2[pb] = ( ( ( b = 255 - ( ( 255 - this.d[pb] ) << 8 ) / this.d2[pb] ) < 0 ) || ( this.d2[pb] == 0 ) )? 0 : b;
                    },
                    linearlight: function( pr, pg, pb, pa ) {
                        var r, g, b, r2, g2, b2;
                        
                        this.d2[pr] = ( ( ( r2 = 2 * ( r = this.d2[pr] ) + this.d[pr] - 256 ) < 0 ) || ( ( r < 128 ) && ( r2 < 0 ) ) )? 0 : ( ( r2 > 255 )? 255 : r2 );
                        this.d2[pg] = ( ( ( g2 = 2 * ( g = this.d2[pg] ) + this.d[pg] - 256 ) < 0 ) || ( ( g < 128 ) && ( g2 < 0 ) ) )? 0 : ( ( g2 > 255 )? 255 : g2 );
                        this.d2[pb] = ( ( ( b2 = 2 * ( b = this.d2[pb] ) + this.d[pb] - 256 ) < 0 ) || ( ( b < 128 ) && ( b2 < 0 ) ) )? 0 : ( ( b2 > 255 )? 255 : b2 );
                    },
                    vividlight: function( pr, pg, pb, pa ) {
                        var r, g, b, r2, g2, b2, r3, g3, b3;

                        this.d2[pr] = ( ( r = this.d2[pr] ) < 128 )? ( r? ( ( ( r2 = 255 - ( ( 255 - this.d[pr] ) << 8 ) / ( 2 * r ) ) < 0 )? 0 : r2 ) : 0 ) : ( ( ( r2 = ( r3 = 2 * r - 256 ) ) < 255 )? ( ( ( r2 = ( this.d[pr] << 8 ) / ( 255 - r3 ) ) > 255 )? 255 : r2 ) : ( ( r2 < 0 )? 0 : r2 ) );
                        this.d2[pg] = ( ( g = this.d2[pg] ) < 128 )? ( g? ( ( ( g2 = 255 - ( ( 255 - this.d[pg] ) << 8 ) / ( 2 * g ) ) < 0 )? 0 : g2 ) : 0 ) : ( ( ( g2 = ( g3 = 2 * g - 256 ) ) < 255 )? ( ( ( g2 = ( this.d[pg] << 8 ) / ( 255 - g3 ) ) > 255 )? 255 : g2 ) : ( ( g2 < 0 )? 0 : g2 ) );
                        this.d2[pb] = ( ( b = this.d2[pb] ) < 128 )? ( b? ( ( ( b2 = 255 - ( ( 255 - this.d[pb] ) << 8 ) / ( 2 * b ) ) < 0 )? 0 : b2 ) : 0 ) : ( ( ( b2 = ( b3 = 2 * b - 256 ) ) < 255 )? ( ( ( b2 = ( this.d[pb] << 8 ) / ( 255 - b3 ) ) > 255 )? 255 : b2 ) : ( ( b2 < 0 )? 0 : b2 ) );
                    },
                    pinlight: function( pr, pg, pb, pa ) {
                        var r, g, b, r2, g2, b2, r3, g3, b3;
                        
                        this.d2[pr] = ( ( r = this.d2[pr] ) < 128 )? ( ( ( r2 = this.d[pr] ) < ( r3 = 2 * r ) )? r2 : r3 ) : ( ( ( r2 = this.d[pr] ) > ( r3 = 2 * r - 256 ) )? r2 : r3 );
                        this.d2[pg] = ( ( g = this.d2[pg] ) < 128 )? ( ( ( g2 = this.d[pg] ) < ( g3 = 2 * g ) )? g2 : g3 ) : ( ( ( g2 = this.d[pg] ) > ( g3 = 2 * g - 256 ) )? g2 : g3 );
                        this.d2[pb] = ( ( b = this.d2[pb] ) < 128 )? ( ( ( b2 = this.d[pb] ) < ( b3 = 2 * b ) )? b2 : b3 ) : ( ( ( b2 = this.d[pb] ) > ( b3 = 2 * b - 256 ) )? b2 : b3 );
                    },
                    hardmix: function( pr, pg, pb, pa ) {
                        var r, g, b, r2, g2, b2;

                        this.d2[pr] = ( ( r = this.d2[pr] ) < 128 )? ( ( ( 255 - ( ( 255 - this.d[pr] ) << 8 ) / ( 2 * r ) < 128 ) || ( r == 0 ) )? 0 : 255 ) : ( ( ( ( r2 = 2 * r - 256 ) < 255 ) && ( ( this.d[pr] << 8 ) / ( 255 - r2 ) < 128 ) )? 0 : 255 );
                        this.d2[pg] = ( ( g = this.d2[pg] ) < 128 )? ( ( ( 255 - ( ( 255 - this.d[pg] ) << 8 ) / ( 2 * g ) < 128 ) || ( g == 0 ) )? 0 : 255 ) : ( ( ( ( g2 = 2 * g - 256 ) < 255 ) && ( ( this.d[pg] << 8 ) / ( 255 - g2 ) < 128 ) )? 0 : 255 );
                        this.d2[pb] = ( ( b = this.d2[pb] ) < 128 )? ( ( ( 255 - ( ( 255 - this.d[pb] ) << 8 ) / ( 2 * b ) < 128 ) || ( b == 0 ) )? 0 : 255 ) : ( ( ( ( b2 = 2 * b - 256 ) < 255 ) && ( ( this.d[pb] << 8 ) / ( 255 - b2 ) < 128 ) )? 0 : 255 );
                    }
                };
                
                if ( callbacks[this.options.mode] ) {
                    mn.filtriterator.linear( params, callbacks[this.options.mode].$bind( this ) );
                    c2ctx.putImageData( p2.canvasData, 0, 0 );
                }

                if ( ( this.options.amount != 1 ) && !mn.client.hasAlphaGlobal ) {
                    return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        var amount2 = 1 - this.options.amount;
                        
                        this.d[pr] = ( this.d[pr] * amount2 + this.d2[pr] * this.options.amount ) >> 0;
                        this.d[pg] = ( this.d[pg] * amount2 + this.d2[pg] * this.options.amount ) >> 0;
                        this.d[pb] = ( this.d[pb] * amount2 + this.d2[pb] * this.options.amount ) >> 0;
                    }.$bind( this ) );
                } else {
                    var rect = params.options.rect;
                    var ctx  = params.canvas.getContext( '2d' );
                    ctx.save();
                    ctx.globalAlpha = this.options.amount;
                    ctx.drawImage( c2, 0,0, rect.width, rect.height, rect.left, rect.top, rect.width, rect.height );
                    ctx.globalAlpha = 1;
                    ctx.restore();
                
                    params.changed = false;
                    return true;
                }
            }
        }
    } )();

    // blur
    mn.filtr.filters.blur = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.IE ),
            process:   function( params, options ) {
                this.options = $extend( {
                    amount:    0,
                    clear:     false,
                    fixmargin: true
                }, options || {} );
                    
                this.options.amount = Math.max( 0, Math.min( 5, this.options.amount ) );
   
                if ( mn.client.hasCanvasData ) {
                    var rect = params.options.rect;
                    var ctx  = params.canvas.getContext( '2d' );
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect( rect.left, rect.top, rect.width, rect.height );
                    ctx.clip();

                    var sw    = Math.round( params.width  / 2 );
                    var sh    = Math.round( params.height / 2 );
                    var cp    = mn.filtrutil.createCanvas( sw, sh, true );
                    var cpctx = cp.getContext( '2d' );
                    var steps = Math.round( this.options.amount * 20 );
                    var wscaled, hscaled;
            
                    for ( var i = 0; i < steps; i++ ) {
                        wscaled = Math.max( 1, Math.round( sw - i ) );
                        hscaled = Math.max( 1, Math.round( sh - i ) );

                        cpctx.clearRect( 0, 0, sw, sh );
                        cpctx.drawImage( params.canvas, 0, 0, params.width, params.height, 0, 0, wscaled, hscaled );
    
                        if ( this.options.clear ) {
                            ctx.clearRect( rect.left, rect.top, rect.width, rect.height );
                        }

                        ctx.drawImage( cp, 0, 0, wscaled, hscaled, 0, 0, params.width, params.height );
                    }

                    ctx.restore();
                    params.changed = false;
            
                    return true;
                } else if ( mn.client.IE ) {
                    var radius = 10 * this.options.amount;
                    params.image.style.filter += ' progid:DXImageTransform.Microsoft.Blur(pixelradius=' + radius + ')';

                    if ( this.options.fixmargin ) {
                        params.image.style.marginLeft = ( parseInt( params.image.style.marginLeft, 10 ) || 0 ) - Math.round( radius ) + 'px';
                        params.image.style.marginTop  = ( parseInt( params.image.style.marginTop,  10 ) || 0 ) - Math.round( radius ) + 'px';
                    }

                    return true;
                }
            }
        }
    } )();
    
    // blurmotion
    mn.filtr.filters.blurmotion = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    distance: 0,
                    angle:    0
                }, options || {} );
                
                this.options.angle = $bound( this.options.angle, 0, 360 );

                var ctx   = params.canvas.getContext( '2d' );
                var cp    = mn.filtrutil.createCanvas( params.width, params.height, true );
                var cpctx = cp.getContext( '2d' );
                cpctx.drawImage( params.canvas, 0, 0, params.width, params.height, 0, 0, params.width - 4, params.height - 4 );

                var p  = ctx.globalAlpha;
                var i  = 0;
                var b  = .25;
                var m  = b / this.options.distance;
                var sx = 1;
                var sy = 1;
                var xi = 0;
                var yi = 0;
                var z  = ( ( this.options.angle - 90 ) * Math.PI ) / 180;
                var xo = Math.round( this.options.distance * Math.cos( z ) ) + xi;
                var yo = Math.round( this.options.distance * Math.sin( z ) ) + yi;
                var dx = xo - xi;
                var dy = yo - yi;
                var frc;

                if ( dx < 0 ) {
                    sx = -1;
                    dx = -dx;
                }

                if ( dy < 0 ) {
                    sy = -1;
                    dy = -dy;
                }

                dx = dx << 1;
                dy = dy << 1;

                if ( dy < dx ) {
                    frc = dy - ( dx >> 1 );
    
                    while ( xi != xo ) {
                        if ( frc >= 0 ) {
                            yi  += sy;
                            frc -= dx;
                        }
        
                        frc += dy;
                        xi  += sx;
                        i++;
        
                        ctx.globalAlpha = b - ( m * i );
                        ctx.drawImage( params.canvas, 0, 0, params.width, params.height, xi, yi, params.width, params.height );
                    }
                } else {
                    frc = dx - ( dy >> 1 );
    
                    while ( yi != yo ) {
                        if ( frc >= 0 ) {
                            xi  += sx;
                            frc -= dy;
                        }
        
                        frc += dx;
                        yi  += sy;
                        i++;
        
                        ctx.globalAlpha = b - ( m * i );
                        ctx.drawImage( params.canvas, 0, 0, params.width, params.height, xi, yi, params.width, params.height );
                    }
                }

                ctx.globalAlpha = p;
                cpctx.drawImage( params.canvas, 0, 0, params.width, params.height, 0, 0, params.width - 4, params.height - 4 );

                params.changed = false;
                return true;
            }
        }
    } )();

    // blursmooth
    mn.filtr.filters.blursmooth = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    radius: 1
                }, options || {} );
                
                this.options.radius = Math.min( 8, Math.max( 1, this.options.radius ) );

                var ctx   = params.canvas.getContext( '2d' );
                var cp    = mn.filtrutil.createCanvas( params.width, params.height, true );
                var cpctx = cp.getContext( '2d' );
                cpctx.drawImage( params.canvas, 0, 0, params.width, params.height, 0, 0, params.width - 4, params.height - 4 );

                var t = Math.round( this.options.radius * 5 );
                var b = Math.round( params.width  * .75 );
                var q = Math.round( params.height * .75 );
                var r, g;

                for ( var i = 0; i < t; i++ ) {
                    r = Math.max( 2, Math.round( b - ( 2 * i ) ) );
                    g = Math.max( 2, Math.round( q - ( 2 * i ) ) );
    
                    cpctx.clearRect( 0, 0, params.width - 4, params.height - 4 );
                    cpctx.drawImage( params.canvas, 0, 0, params.width, params.height, 0, 0, r, g );
    
                    ctx.clearRect( 0, 0, params.width, params.height );
                    ctx.drawImage( cp, 0, 0, r, g, 0, 0, params.width, params.height );
                }

                cpctx.drawImage( params.canvas, 0, 0, params.width, params.height, 0, 0, params.width - 4, params.height - 4 );                

                params.changed = false;
                return true;
            }
        }
    } )();    

    // blurspin
    mn.filtr.filters.blurspin = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    distance: 0
                }, options || {} );
                
                var ctx   = params.canvas.getContext( '2d' );
                var cp    = mn.filtrutil.createCanvas( params.width, params.height, true );
                var cpctx = cp.getContext( '2d' );
                cpctx.drawImage( params.canvas, 0, 0, params.width, params.height, 0, 0, params.width - 4, params.height - 4 );

                var b = .25;
                var m = b / this.options.distance;

                ctx.save();
                ctx.translate( params.width / 2, params.height / 2 );

                for ( var i = 0; i < this.options.distance; i++ ) {
                    ctx.globalAlpha = b - ( m * i );
                    ctx.save();
                    ctx.rotate( ( Math.PI * i ) / 180 );
                    ctx.drawImage( params.canvas, 0, 0, params.width, params.height, 0 - ( params.width / 2 ), 0 - ( params.height / 2 ), params.width, params.height );
                    ctx.restore();
                    ctx.save();
                    ctx.rotate( ( Math.PI * -i ) / 180 );
                    ctx.drawImage( params.canvas, 0, 0, params.width, params.height, 0 - ( params.width / 2 ), 0 - ( params.height / 2 ), params.width, params.height );
                    ctx.restore();
                }

                ctx.restore();
                cpctx.drawImage( params.canvas, 0, 0, params.width, params.height, 0, 0, params.width - 4, params.height - 4 );
                
                params.changed = false;
                return true;
            }
        }
    } )();
    
    // blurzoom
    mn.filtr.filters.blurzoom = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    distance: 0
                }, options || {} );
                
                var ctx   = params.canvas.getContext( '2d' );
                var cp    = mn.filtrutil.createCanvas( params.width, params.height, true );
                var cpctx = cp.getContext( '2d' );
                cpctx.drawImage( params.canvas, 0, 0, params.width, params.height, 0, 0, params.width - 4, params.height - 4 );

                var b = .25;
                var m = b / this.options.distance;
                var p = ctx.globalAlpha;

                for ( var i = 0; i < this.options.distance; i++ ) {
                    ctx.globalAlpha = b - ( m * i );
                    ctx.drawImage( params.canvas, 0, 0, params.width, params.height, -i, -i, params.width + ( 2 * i ), params.height + ( 2 * i ) );
                }

                ctx.globalAlpha = p;
                cpctx.drawImage( params.canvas, 0, 0, params.width, params.height, 0, 0, params.width - 4, params.height - 4 );
                
                params.changed = false;
                return true;
            }
        }
    } )();

    // brightness
    mn.filtr.filters.brightness = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    brightness: 0,
                    contrast:   0,
                    legacy:     false
                }, options || {} );
                
                this.options.contrast   = Math.max( 0, this.options.contrast + 1 );
                this.options.brightness = this.options.legacy? Math.min( 150, Math.max( -150, this.options.brightness ) ) : 1 + Math.min( 150, Math.max( -150, this.options.brightness ) ) / 150;
                
                if ( this.options.contrast != 1 ) {
                    this.mul = this.options.legacy? this.options.contrast : this.options.brightness * this.options.contrast;
                    this.add = this.options.legacy? ( this.options.brightness - 128 ) * this.options.contrast + 128 : -this.options.contrast  * 128 + 128;
                } else {
                    this.mul = this.options.legacy? 1 : this.options.brightness;
                    this.add = this.options.legacy? this.options.brightness : 0;
                }
            
                this.d = mn.filtrutil.getCanvasData( params );
                
                return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    this.d[pr] = $bound( this.d[pr] * this.mul + this.add, 0, 255 );
                    this.d[pg] = $bound( this.d[pg] * this.mul + this.add, 0, 255 );
                    this.d[pb] = $bound( this.d[pb] * this.mul + this.add, 0, 255 );
                }.$bind( this ) );
            }
        }
    } )();

    // chroma
    mn.filtr.filters.chroma = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.hasAlpha ),
            process:   function( params, options ) {
                this.options = $extend( {
                    red:       0,
                    green:     0,
                    blue:      0,
                    tolerance: 0,
                    preset:    'rgb',
                    image:     false
                }, options || {} );
                
                this.d = mn.filtrutil.getCanvasData( params );
                
                if ( this.options.image = $( this.options.image ) ) {
                    if ( this.options.image.tagName.toLowerCase() != 'img' ) {
                        return false;
                    }
                  
                    var c2    = mn.filtrutil.createCanvas( params.canvas.width, params.canvas.height, true );
                    var c2ctx = c2.getContext( '2d' );
                    c2ctx.drawImage( this.options.image, 0, 0 );
                    
                    var p2  = {canvas: c2, options: params.options};
                    this.d2 = mn.filtrutil.getCanvasData( p2 );
                }

                var presets = {
                    rgb: function( r, g, b, options ) {
                        return ( $within( r, options.red   - options.tolerance, options.red   + options.tolerance ) &&
                                 $within( g, options.green - options.tolerance, options.green + options.tolerance ) &&
                                 $within( b, options.blue  - options.tolerance, options.blue  + options.tolerance ) );
                    },
                    bluescreen: function( r, g, b, options ) {
                        return ( ( r < 10 ) && ( g < 11 ) && ( b > 144 ) );
                    },
                    greenscreen: function( r, g, b, options ) {
                        return ( ( r > 100 ) && ( g > 100 ) && ( b < 43 ) );
                    }
                };
                
                if ( presets[this.options.preset] ) {
                    this.p = presets[this.options.preset];

                    mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        if ( this.p( this.d[pr], this.d[pg], this.d[pb], this.options ) ) {
                            if ( this.options.image ) {
                                this.d[pr] = this.d2[pr];
                                this.d[pg] = this.d2[pg];
                                this.d[pb] = this.d2[pb];
                            } else {
                                this.d[pa] = 0;
                            }
                        }
                    }.$bind( this ) );
                    
                    if ( this.options.image ) {
                        c2ctx.putImageData( p2.canvasData, 0, 0 );
                    }
                }
                
                return true;
            }
        }
    } )();

    // chromahsb
    mn.filtr.filters.chromahsb = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.hasAlpha ),
            process:   function( params, options ) {
                this.options = $extend( {
                    hue:           0,
                    huetolerance:  0,
                    saturationmin: 0,
                    brightnessmin: 0,
                    brightnessmax: 0
                }, options || {} );

                this.h  = ( ( this.options.hue           >= 0 )? Math.min( 360, this.options.hue ) : 127 );
                this.ht = ( ( this.options.huetolerance  >= 0 )? Math.min( 360, this.options.huetolerance * 3.6 ) : 36 );
                this.sm = ( ( this.options.saturationmin >= 0 )? Math.min( 100, this.options.saturationmin ) : 88 );
                this.bm = ( ( this.options.brightnessmin >= 0 )? Math.min( 100, this.options.brightnessmin ) : 30 );
                this.bx = ( ( this.options.brightnessmax >= 0 )? Math.min( 100, Math.max( this.bm, this.options.brightnessmax ) ) : 82 );
                this.d  = mn.filtrutil.getCanvasData( params );

                mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    var v = mn.filtrutil.rgbToHSB( this.d[pr], this.d[pg], this.d[pb] );
                    
                    if ( v.s >= this.sm && ( v.b >= this.bm && v.b <= this.bx ) && ( v.h - this.h < this.ht ) && ( v.h - this.h > ( -this.ht ) ) ) {
                        this.d[pa] = Math.abs( v.h - this.h ) / this.ht;
                    }
                }.$bind( this ) );

                return true;
            }
        }
    } )();
    
    // colorhistogram
    mn.filtr.filters.colorhistogram = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.vr = [].$fill( 256, 0 );
                this.vg = [].$fill( 256, 0 );
                this.vb = [].$fill( 256, 0 );
                this.d  = mn.filtrutil.getCanvasData(params);

                mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    this.vr[this.d[pr]]++;
                    this.vg[this.d[pg]]++;
                    this.vb[this.d[pb]]++;
                }.$bind( this ) );
                
                var yoff, hs, ws;
                var ctx  = params.canvas.getContext( '2d' );
                var vals = [this.vr, this.vg, this.vb];
                var fs   = ['rgba(255,0,0,0.5)', 'rgba(0,255,0,0.5)', 'rgba(0,0,255,0.5)'];
            
                for ( var v = 0; v < vals.length; v++ ) {
                    yoff = ( v + 1 ) * params.height / 3;
                    hs   = params.height / 3 / vals[v].$max();
                    ws   = params.width  / 256;
                    
                    ctx.fillStyle = fs[v];

                    for ( var i = 0; i < 256; i++ ) {
                        ctx.fillRect( i * ws, params.height - hs * vals[v][i] - params.height + yoff, ws, vals[v][i] * hs );
                    }
                }
            
                params.changed = false;
                return true;
            }
        }
    } )();

    // contrast
    mn.filtr.filters.contrast = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    contrast: 1,
                }, options || {} );

                this.d = mn.filtrutil.getCanvasData( params );
                this.v = ( this.options.contrast >= 0 )? this.options.contrast : 1;
                
                if ( mn.client.isProper ) {
                    return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        this.d[pr] = ( ( ( ( this.d[pr] / 255 ) - 0.5 ) * this.v ) + 0.5 ) * 255; 
                        this.d[pg] = ( ( ( ( this.d[pg] / 255 ) - 0.5 ) * this.v ) + 0.5 ) * 255; 
                        this.d[pb] = ( ( ( ( this.d[pb] / 255 ) - 0.5 ) * this.v ) + 0.5 ) * 255;
                    }.$bind( this ) );
                } else {
                    return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        this.d[pr] = Math.min( 255, Math.max( 0, ( ( ( ( this.d[pr] / 255 ) - 0.5 ) * this.v ) + 0.5 ) * 255 ) ); 
                        this.d[pg] = Math.min( 255, Math.max( 0, ( ( ( ( this.d[pg] / 255 ) - 0.5 ) * this.v ) + 0.5 ) * 255 ) ); 
                        this.d[pb] = Math.min( 255, Math.max( 0, ( ( ( ( this.d[pb] / 255 ) - 0.5 ) * this.v ) + 0.5 ) * 255 ) );
                    }.$bind( this ) );
                }
            }
        }
    } )();
    
    // crop
    mn.filtr.filters.crop = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( params.options.rect, options || {} );
                    
                this.options.width  = $bound( this.options.width, 1 );
                this.options.height = $bound( this.options.width, 1 );
                this.options.left   = $bound( this.options.left,  0, params.width  - 1 );
                this.options.top    = $bound( this.options.top,   0, params.height - 1 );

                if ( this.options.left + this.options.width > params.width  ) this.options.width  = params.width  - this.options.left;
                if ( this.options.top + this.options.height > params.height ) this.options.height = params.height - this.options.top;

                var ctx = params.canvas.getContext( '2d' );
                var c   = mn.filtrutil.createCanvas( params.width, params.height, true );
                c.getContext( '2d' ).drawImage( params.canvas, 0, 0 );

                params.canvas.width  = this.options.width;
                params.canvas.height = this.options.height;
                ctx.clearRect( 0, 0, this.options.width, this.options.height );
                ctx.drawImage( c, this.options.left, this.options.top, this.options.width, this.options.height, 0, 0, this.options.width, this.options.height );

                params.changed = false;
                return true;
            }
        }
    } )();

    // duotone
    mn.filtr.filters.duotone = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    average: true,
                    addr:    0,
                    addg:    0,
                    addb:    0
                }, options || {} );
                    
                this.d = mn.filtrutil.getCanvasData( params );
                        
                return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    var m = mn.filtrutil.reduceColor( this.d[pr], this.d[pg], this.d[pg], this.options.average );
                    
                    this.d[pr] = $bound( m + this.options.addr, 0, 255 );
                    this.d[pg] = $bound( m + this.options.addg, 0, 255 );
                    this.d[pb] = $bound( m + this.options.addb, 0, 255 );
                }.$bind( this ) );
            }
        }
    } )();
    
    // edges
    mn.filtr.filters.edges = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    mono:    false,
                    invert:  false,
                    average: false
                }, options || {} );
                
                this.d      = mn.filtrutil.getCanvasData( params );
                this.dc     = mn.filtrutil.getCanvasData( params, true );
                this.c      = -1 / 8;
                this.weight = 1 / this.c;

                return mn.filtriterator.matrixarea( params, function( pr, pg, pb, pa, w, h, x, y, offsetPrev, offsetNext ) {
                    var r = ( ( this.dc[offsetPrev - 4] + this.dc[offsetPrev]     + this.dc[offsetPrev + 4] + this.dc[pr - 4] + this.dc[pr + 4] + this.dc[offsetNext - 4] + this.dc[offsetNext]     + this.dc[offsetNext + 4] ) * this.c + this.dc[pr] ) * this.weight;
                    var g = ( ( this.dc[offsetPrev - 3] + this.dc[offsetPrev + 1] + this.dc[offsetPrev + 5] + this.dc[pr - 3] + this.dc[pr + 5] + this.dc[offsetNext - 3] + this.dc[offsetNext + 1] + this.dc[offsetNext + 5] ) * this.c + this.dc[pg] ) * this.weight;
                    var b = ( ( this.dc[offsetPrev - 2] + this.dc[offsetPrev + 2] + this.dc[offsetPrev + 6] + this.dc[pr - 2] + this.dc[pr + 6] + this.dc[offsetNext - 2] + this.dc[offsetNext + 2] + this.dc[offsetNext + 6] ) * this.c + this.dc[pb] ) * this.weight;

                    if ( this.options.mono ) {
                        r = g = b = mn.filtrutil.reduceColor( r, g, b, this.options.average );
                    }
                    
                    if ( this.options.invert ) {
                        r = 255 - r;
                        g = 255 - g;
                        b = 255 - b;
                    }

                    this.d[pr] = $bound( r, 0, 255 );
                    this.d[pg] = $bound( g, 0, 255 );
                    this.d[pb] = $bound( b, 0, 255 );
                }.$bind( this ) );
            }
         }
    } )();

    // emboss
    mn.filtr.filters.emboss = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.IE ),
            process:   function( params, options ) {
                this.options = $extend( {
                    strength:   1,
                    graylevel:  180,
                    direction: 'topleft',
                    blend:      false
                }, options || {} );
                
                if ( mn.client.hasCanvasData ) {
                    this.d    = mn.filtrutil.getCanvasData( params );
                    this.dc   = mn.filtrutil.getCanvasData( params, true );
                    this.dirx = 0;
                    this.diry = 0;
                    
                    var directions = {
                        topleft:     [-1, -1],
                        top:         [ 0, -1],
                        topright:    [ 1, -1],
                        right:       [ 1,  0],
                        bottomright: [ 1,  1],
                        bottom:      [ 0,  1],
                        bottomleft:  [-1,  1],
                        left:        [-1,  0]
                    };
                    
                    if ( directions[this.options.direction] ) {
                        this.dirx = directions[this.options.direction][0];
                        this.diry = directions[this.options.direction][1];
                    }
                                        
                    return mn.filtriterator.matrix( params, function( pr, pg, pb, pa, w, h, x, y ) {
                        var yo = this.diry;
                        if ( y + yo < 1 ) yo = 0;
                        if ( y + yo > h ) yo = 0;
   
                        var xo = this.dirx;
                        
                        if ( x + xo < 1 ) xo = 0;
                        if ( x + xo > w ) xo = 0;
                        
                        var offset = ( ( y - 1 + yo ) * w * 4 ) + ( x - 1 + xo ) * 4;

                        var dr = this.dc[pr] - this.dc[offset];
                        var dg = this.dc[pg] - this.dc[offset + 1];
                        var db = this.dc[pb] - this.dc[offset + 2];

                        var dif    = dr;
                        var difabs = ( dif > 0 )? dif : -dif;
                        var gabs   = ( dg  > 0 )? dg  : -dg;
                        var babs   = ( db  > 0 )? db  : -db;

                        if ( gabs > difabs ) dif = dg;
                        if ( babs > difabs ) dif = db;

                        dif *= this.options.strength;

                        if ( this.options.blend ) {
                            this.d[pr] = $bound( this.d[pr] + dif, 0, 255 );
                            this.d[pg] = $bound( this.d[pg] + dif, 0, 255 );
                            this.d[pb] = $bound( this.d[pb] + dif, 0 ,255 );
                        } else {
                            this.d[pr] = this.d[pg] = this.d[pb] = $bound( this.options.graylevel - dif, 0, 255 );
                        }
                    }.$bind( this ) ); 
                } else if ( mn.client.IE ) {
                    params.image.style.filter += ' progid:DXImageTransform.Microsoft.emboss()';
                    return true;
                }
            }
        }
    } )();

    // exposure
    mn.filtr.filters.exposure = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    amount: 1
                }, options || {} );
                    
                this.m = Math.min( 255, Math.max( 0, this.options.amount ) );

                if ( mn.client.hasCanvasData && ( this.m != 1 ) ) {
                    this.t = [];
                    for ( var i = 0; i < 256; i++ ) {
                        this.t[i] = Math.min( 255, Math.max( 0, 255 * ( 1 - Math.exp( -( i / 255 ) * this.m ) ) ) );
                    }

                    this.d = mn.filtrutil.getCanvasData( params );
                    
                    return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        this.d[pr] = this.t[this.d[pr]];
                        this.d[pg] = this.t[this.d[pg]];
                        this.d[pb] = this.t[this.d[pb]];
                    }.$bind( this ) );
                }
            }
        }
    } )();
    
    // flip
    mn.filtr.filters.flip = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.IE ),
            process:   function( params, options ) {
                this.options = $extend( {
                    axis: 'horizontal'
                }, options || {} );
                    
                if ( mn.client.hasCanvasData ) {
                    var rect = params.options.rect;
                    var cc   = mn.filtrutil.createCanvas( rect.width, rect.height, true );
                    cc.getContext( '2d' ).drawImage( params.image, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height );

                    var ctx = params.canvas.getContext( '2d' );
                    ctx.clearRect( rect.left, rect.top, rect.width, rect.height );

                    if ( this.options.axis == 'vertical' ) {
                        ctx.scale( 1, -1 );
                        ctx.drawImage( cc, rect.left, -rect.top - rect.height, rect.width, rect.height );
                    } else {
                        ctx.scale( -1, 1 );
                        ctx.drawImage( cc, -rect.left - rect.width, rect.top, rect.width, rect.height );                            
                    }

                    params.changed = false;
                    return true;
                } else if ( mn.client.IE ) {
                    params.image.style.filter += ( this.options.axis == 'vertical' )?
                        ' flipv' :
                        ' fliph';

                    return true;
                }
            }
        }
    } )();
        
    // flip (horizontal)
    mn.filtr.filters.fliph = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.IE ),
            options:   {axis: 'horizontal'},
            process:   mn.filtr.filters.flip.process
        }
    } )();
   
   
    // flip (vertical)
    mn.filtr.filters.flipv = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.IE ),
            options:   {axis: 'vertical'},
            process:   mn.filtr.filters.flip.process
        }
    } )();
                
    // gamma
    mn.filtr.filters.gamma = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    amount: 100
                }, options || {} );

                this.d = mn.filtrutil.getCanvasData( params );
                this.t = [];
                
                for ( var i = 0; i < 256; i++ ) {
                   this.t[i] = Math.min( 255, Math.max( 0, ( 255 * Math.pow( i / 255, 1 / this.options.amount ) ) + 0.5 ) );
                }
                    
                return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    this.d[pr] = this.t[this.d[pr]];
                    this.d[pg] = this.t[this.d[pg]];
                    this.d[pb] = this.t[this.d[pb]];
                }.$bind( this ) );
            }
        }
    } )();
    
    // glow
    mn.filtr.filters.glow = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    amount: 0,
                    radius: 0
                }, options || {} );
                
                this.options.amount = Math.min( 1, Math.max( 0, this.options.amount ) );
                this.options.radius = Math.min( 5, Math.max( 0, this.options.radius ) );

                this.d   = mn.filtrutil.getCanvasData( params );
                this.dbl = mn.filtrutil.getCanvasData( {
                    canvas:  mn.filtrutil.createBlurCanvas( params, this.options.radius * 20 ),
                    options: params.options
                } );

                return mn.filtriterator.matrixarea( params, function( pr, pg, pb, pa, w, h, x, y, offsetPrev, offsetNext ) {
                    if ( ( this.d[pr] += this.options.amount * this.dbl[pr] ) > 255 ) this.d[pr] = 255;
                    if ( ( this.d[pg] += this.options.amount * this.dbl[pg] ) > 255 ) this.d[pg] = 255;
                    if ( ( this.d[pb] += this.options.amount * this.dbl[pb] ) > 255 ) this.d[pb] = 255;
                }.$bind( this ) );
            }
        }
    } )();
    
    // gray
    mn.filtr.filters.gray = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.IE ),
            process:   function( params, options ) {
                this.options = $extend( {
                    average: true
                }, options || {} );
                    
                if ( mn.client.hasCanvasData ) {
                    this.d = mn.filtrutil.getCanvasData( params );
                    
                    return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        this.d[pr] = this.d[pg] = this.d[pb] = mn.filtrutil.reduceColor( this.d[pr], this.d[pg], this.d[pb], this.options.average );
                    }.$bind( this ) );
                } else if ( mn.client.IE ) {
                    params.image.style.filter += ' gray';
                    return true;
                }
            }
        }
    } )();

    // histogram
    mn.filtr.filters.histogram = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    average: true
                }, options || {} );
                
                this.values = [].$fill( 256, 0 );
                this.d = mn.filtrutil.getCanvasData( params );

                mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    this.values[Math.round( mn.filtrutil.reduceColor( this.d[pr], this.d[pg], this.d[pb], this.options.average ) )]++;
                }.$bind( this ) );
                
                var hs  = params.height / this.values.$max();
                var ws  = params.width  / 256;
                var ctx = params.canvas.getContext( '2d' );
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                
                for ( var i = 0; i < 256; i++ ) {
                    ctx.fillRect( i * ws, params.height - hs * this.values[i], ws, this.values[i] * hs );
                }
            
                params.changed = false;
                return true;
            }
        }
    } )();
    
    // hsl
    mn.filtr.filters.hsl = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    hue:        0,
                    saturation: 0,
                    lightness:  0
                }, options || {} );
                
                this.options.hue         = ( this.options.hue % 360 ) / 360;
                this.options.saturation /= 100;
                this.options.lightness  /= 100;
        
                this.hue6   = this.options.hue * 6;
                this.satmul = 1 + ( ( this.options.saturation < 0 )?
                    this.options.saturation :
                    this.options.saturation * 2
                );

                this.d = mn.filtrutil.getCanvasData( params );
                        
                return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    var r = this.d[pr];
                    var g = this.d[pg];
                    var b = this.d[pb];

                    if ( ( this.options.hue != 0 ) || ( this.options.saturation != 0 ) ) {
                        var vs = r;
                        if ( g > vs ) vs = g;
                        if ( b > vs ) vs = b;
                    
                        var ms = r;
                        if ( g < ms ) ms = g;
                        if ( b < ms ) ms = b;
                    
                        var vm = ( vs - ms );
                        var l  = ( ms + vs ) / 510;
                    
                        if ( l > 0 ) {
                            if ( vm > 0 ) {
                                var s, v, h, m, sx;
                                
                                if ( l <= 0.5 ) {
                                    s = vm / ( vs + ms ) * this.satmul;
                                    
                                    if ( s > 1 ) {
                                        s = 1;
                                    }
                                    
                                    v = ( l * ( 1 + s ) );
                                } else {
                                    s = vm / ( 510 - vs - ms ) * this.satmul;
                                    
                                    if ( s > 1 ) {
                                        s = 1;
                                    }
                                    
                                    v = ( l + s - l * s );
                                }
                                
                                h = ( r == vs )? ( ( g == ms )?
                                    5 + ( ( vs - b ) / vm ) + this.hue6 : 1 - ( ( vs - g ) / vm ) + this.hue6 ) :
                                    ( ( ( g == vs )? ( ( b == ms )? 1 + ( ( vs - r ) / vm ) + this.hue6 : 3 - ( ( vs - b ) / vm ) + this.hue6 ) :
                                      ( ( r == ms )? 3 + ( ( vs - g ) / vm ) + this.hue6 : 5 - ( ( vs - r ) / vm ) + this.hue6 ) )
                                    );

                                if ( h  < 0 ) h += 6;
                                if ( h >= 6 ) h -= 6;
                                
                                m  = ( l + l - v );
                                sx = h >> 0;
                                
                                switch ( sx ) {
                                    case 0:
                                        r = v * 255;
                                        g = ( m + ( ( v - m ) * ( h - sx ) ) ) * 255;
                                        b = m * 255;
                                        break;
                                        
                                    case 1:
                                        r = ( v - ( ( v - m ) * ( h - sx ) ) ) * 255;
                                        g = v * 255;
                                        b = m * 255;
                                        break;
                                        
                                    case 2:
                                        r = m * 255;
                                        g = v * 255;
                                        b = ( m + ( ( v - m ) * ( h - sx ) ) ) * 255;
                                        break;
                                        
                                    case 3:
                                        r = m * 255;
                                        g = ( v - ( ( v - m ) * ( h - sx ) ) ) * 255;
                                        b = v * 255;
                                        break;
                                        
                                    case 4:
                                        r = ( m + ( ( v - m ) * ( h - sx ) ) ) * 255;
                                        g = m * 255;
                                        b = v * 255;
                                        break;
                                        
                                    case 5:
                                        r = v * 255;
                                        g = m * 255;
                                        b = ( v - ( ( v - m ) * ( h - sx ) ) ) * 255;
                                        break;
                                }
                            }
                        }
                    }

                    if ( this.options.lightness != 0 ) {
                        var mul = ( this.options.lightness < 0 )?  1 + this.options.lightness : ( 1 - this.options.lightness ) + ( this.options.lightness * 255 );
                    
                        r *= mul;
                        g *= mul;
                        b *= mul;
                    }

                    this.d[pr] = $bound( r, 0, 255 );
                    this.d[pg] = $bound( g, 0, 255 );
                    this.d[pb] = $bound( b, 0, 255 );
                }.$bind( this ) );
            }
        }
    } )();
    
    // invert
    mn.filtr.filters.invert = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.IE ),
            process:   function( params, options ) {
                this.options = $extend( {
                    invertalpha: false
                }, options || {} );
                
                if ( mn.client.hasCanvasData ) {
                    this.d = mn.filtrutil.getCanvasData( params );
                        
                    return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        this.d[pr] = 255 - this.d[pr];
                        this.d[pg] = 255 - this.d[pg];
                        this.d[pb] = 255 - this.d[pb];
                
                        if ( this.options.invertalpha && mn.client.hasAlpha ) {
                            this.d[pa] = 255 - this.d[pa];
                        }
                    }.$bind( this ) );
                } else if ( mn.client.IE ) {
                    params.image.style.filter += ' invert';
                    return true;
                }
            }
        }
    } )();

    // invertalpha
    mn.filtr.filters.invertalpha = ( function() {
        return {
            supported: ( mn.client.hasCanvasData && mn.client.hasAlpha ),
            process:   function( params, options ) {
                if ( mn.client.hasCanvasData && mn.client.hasAlpha ) {
                    this.d = mn.filtrutil.getCanvasData( params );
                        
                    return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        this.d[pa] = 255 - this.d[pa];
                    }.$bind( this ) );
                }
            }
        }
    } )();
    
    // interlace
    mn.filtr.filters.interlace = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.d = mn.filtrutil.getCanvasData( params );

                // TODO: use fillRect() instead to speed things up
                                        
                return mn.filtriterator.matrix( params, function( pr, pg, pb, pa, w, h, x, y ) {
                    if ( y % 2 ) {
                        this.d[pr] = this.d[pg] = this.d[pb] = 0;
                    }
                }.$bind( this ) );
            }
        }
    } )();

    // laplace
    mn.filtr.filters.laplace = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    invertalpha: false,
                    contrast:    1,
                    graylevel:   0
                }, options || {} );
                
                this.options.contrast = -this.options.contrast;

                this.d      = mn.filtrutil.getCanvasData( params );
                this.dc     = mn.filtrutil.getCanvasData( params, true );
                this.weight = 1 / 8;

                return mn.filtriterator.matrixarea( params, function( pr, pg, pb, pa, w, h, x, y, offsetPrev, offsetNext ) {
                    var r = ( ( -this.dc[offsetPrev - 4] - this.dc[offsetPrev]     - this.dc[offsetPrev + 4] - this.dc[pr - 4] - this.dc[pr + 4] - this.dc[offsetNext - 4] - this.dc[offsetNext]     - this.dc[offsetNext + 4] ) + this.dc[pr] * 8 ) * this.weight;
                    var g = ( ( -this.dc[offsetPrev - 3] - this.dc[offsetPrev + 1] - this.dc[offsetPrev + 5] - this.dc[pr - 3] - this.dc[pr + 5] - this.dc[offsetNext - 3] - this.dc[offsetNext + 1] - this.dc[offsetNext + 5] ) + this.dc[pr] * 8 ) * this.weight;
                    var b = ( ( -this.dc[offsetPrev - 2] - this.dc[offsetPrev + 2] - this.dc[offsetPrev + 6] - this.dc[pr - 2] - this.dc[pr + 6] - this.dc[offsetNext - 2] - this.dc[offsetNext + 2] - this.dc[offsetNext + 6] ) + this.dc[pb] * 8 ) * this.weight;

                    var brightness = ( ( r + g + b ) / 3 ) + this.options.graylevel;

                    if ( this.options.contrast != 0 ) {
                        if ( brightness > 127 ) {
                            brightness += ( ( brightness + 1 ) - 128 ) * this.options.contrast;
                        } else if ( brightness < 127 ) {
                            brightness -= ( brightness + 1 ) * this.options.contrast;
                        }
                    }
                    
                    if ( this.options.invertalpha ) {
                        brightness = 255 - brightness;
                    }

                    this.d[pr] = this.d[pg] = this.d[pb] = $bound( brightness, 0, 255 );
                }.$bind( this ) );
            }
        }
    } )();
    
    // lighten
    mn.filtr.filters.lighten = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.IE ),
            process:   function( params, options ) {
                this.options = $extend( {
                    amount: 0
                }, options || {} );
                
                this.options.amount = Math.max( -1, Math.min( 1, this.options.amount ) );
                
                if ( mn.client.hasCanvasData ) {
                    this.d   = mn.filtrutil.getCanvasData( params );
                    this.mul = this.options.amount + 1;

                    return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                        if ( ( this.d[pr] = this.d[pr] * this.mul ) > 255 ) this.d[pr] = 255;
                        if ( ( this.d[pg] = this.d[pg] * this.mul ) > 255 ) this.d[pg] = 255;
                        if ( ( this.d[pb] = this.d[pb] * this.mul ) > 255 ) this.d[pb] = 255;
                    }.$bind( this ) );
                } else if ( mn.client.IE ) {
                    if ( this.options.amount < 0 ) {
                        params.image.style.filter += ' light()';
                        params.image.filters[params.image.filters.length - 1].addAmbient( 255,255,255, 100 * -amount );
                    } else if ( this.options.amount > 0 ) {
                        params.image.style.filter += ' light()';
                        params.image.filters[params.image.filters.length - 1].addAmbient( 255,255,255, 100 );
                        params.image.filters[params.image.filters.length - 1].addAmbient( 255,255,255, 100 * amount );
                    }
            
                    return true;
                }
            }
        }
    } )();

    // mixrgb
    mn.filtr.filters.mixrgb = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    channel1: {r: 0, g: 0, b: 0},
                    channel2: {r: 0, g: 0, b: 0}
                }, options || {} );
                
                this.d = mn.filtrutil.getCanvasData( params );
                
                return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    this.d[pr] = Math.min( 255, Math.max( 0, ( this.options.channel1.r * ( this.options.channel2.b * this.d[pg] + ( 255 - this.options.channel2.b ) * this.d[pb] ) / 255 + ( 255 - this.options.channel1.r ) * this.d[pr] ) / 255 ) ); 
                    this.d[pg] = Math.min( 255, Math.max( 0, ( this.options.channel1.g * ( this.options.channel2.r * this.d[pb] + ( 255 - this.options.channel2.r ) * this.d[pr] ) / 255 + ( 255 - this.options.channel1.g ) * this.d[pg] ) / 255 ) );
                    this.d[pb] = Math.min( 255, Math.max( 0, ( this.options.channel1.b * ( this.options.channel2.g * this.d[pr] + ( 255 - this.options.channel2.g ) * this.d[pg] ) / 255 + ( 255 - this.options.channel1.b ) * this.d[pb] ) / 255 ) );
                }.$bind( this ) );
            }
        }
    } )();
    
    // monochrome
    mn.filtr.filters.monochrome = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    average:   true,
                    threshold: 127,
                    dark:      {r:   0, g:   0, b:   0},
                    light:     {r: 255, g: 255, b: 255}
                }, options || {} );
                    
                this.d = mn.filtrutil.getCanvasData( params );
                        
                return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    var t = ( mn.filtrutil.reduceColor( this.d[pr], this.d[pg], this.d[pb], this.options.average ) <= this.options.threshold )? 'dark' : 'light';
                
                    this.d[pr] = this.options[t].r;
                    this.d[pg] = this.options[t].g;
                    this.d[pb] = this.options[t].b;
                }.$bind( this ) );
            }
        }
    } )();

    // noise
    mn.filtr.filters.noise = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    strength: 50,
                    mono:     true
                }, options || {} );
                    
                this.d = mn.filtrutil.getCanvasData( params );
                        
                return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    if ( mn.filtrutil.randomInt( 0, 1 ) ) {
                        if ( this.options.mono ) {
                            // a bit faster
                            var m = mn.filtrutil.randomInt( -this.options.strength, this.options.strength );
                        
                            this.d[pr] = $bound( this.d[pr] + m, 0, 255 );
                            this.d[pg] = $bound( this.d[pg] + m, 0, 255 );
                            this.d[pb] = $bound( this.d[pb] + m, 0, 255 );
                        } else {
                            this.d[pr] = $bound( this.d[pr] + mn.filtrutil.randomInt( -this.options.strength, this.options.strength ), 0, 255 );
                            this.d[pg] = $bound( this.d[pg] + mn.filtrutil.randomInt( -this.options.strength, this.options.strength ), 0, 255 );
                            this.d[pb] = $bound( this.d[pb] + mn.filtrutil.randomInt( -this.options.strength, this.options.strength ), 0, 255 );
                        }
                    }
                }.bind( this ) );
            }
        }
    } )();
    
    // outline
    mn.filtr.filters.outline = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                   divisor: 1,
                   bias:    0,
                   mode:    'sobel'
                }, options || {} );
              
                var divisor = ( ( this.options.divisor >= 0 )? Math.min( 255, this.options.divisor ) : 1 );
                var bias    = ( ( this.options.bias    >= 0 )? Math.min( 255, this.options.bias    ) : 0 );
                var d       = mn.filtrutil.getCanvasData( params );
                var a       = mn.filtrutil.getCanvasData( params, true );
                var u       = {
                    sobel:   {x: [1,0, -1, 2, 0, -2, 1, 0, -1],    y: [1, 2, 1, 0, 0, 0, -1, -2, -1]  },
                    scharr:  {x: [3,0, -3, 10, 0, -10, 3, 0, -3],  y: [3, 10, 3, 0, 0, 0, -3, -10, -3]},
                    prewitt: {x: [1,0, -1, 1, 0, -1, 1, 0, -1],    y: [-1, -1, -1, 0, 0, 0, 1, 1, 1]  },
                    kirsh:   {x: [5, -3, -3, 5, 0, -3, 5, -3, -3], y: [5, 5, 5, -3, 0, -3, -3, -3, -3]},
                    roberts: {x: [0, 0, -1, 0, 1, 0, 0, 0, 0],     y: [-1, 0, 0, 0, 1, 0, 0, 0, 0]    }
                };
                
                if ( !u[this.options.mode] ) {
                    return false;
                }

                var rect = params.options.rect;
                var r    = u[this.options.mode].x;
                var g    = u[this.options.mode].y;
                var o, l, m, q;

                for ( i = 0, n = a.length; i < n; i += 4 ) {
                    o = [ [ i - ( rect.width + 1 ) * 4, i - rect.width * 4, i - ( rect.width - 1 ) * 4], [i - 4, i, i + 4], [ i + ( rect.width - 1 ) * 4, i + rect.width * 4, i + ( rect.width + 1 ) * 4]];
                    l = g[0] * ( a[o[0][0]] || 0 ) + g[1] * ( a[o[0][1]] || 0 ) + g[2] * ( a[o[0][2]] || 0 ) + g[3] * ( a[o[1][0]] || 0 ) + g[4] * ( a[o[1][1]] || 0 ) + g[5] * ( a[o[1][2]] || 0 ) + g[6] * ( a[o[2][0]] || 0 ) + g[7] * ( a[o[2][1]] || 0 ) + g[8] * ( a[o[2][2]] || 0 );
                    m = r[0] * ( a[o[0][0]] || 0 ) + r[1] * ( a[o[0][1]] || 0 ) + r[2] * ( a[o[0][2]] || 0 ) + r[3] * ( a[o[1][0]] || 0 ) + r[4] * ( a[o[1][1]] || 0 ) + r[5] * ( a[o[1][2]] || 0 ) + r[6] * ( a[o[2][0]] || 0 ) + r[7] * ( a[o[2][1]] || 0 ) + r[8] * ( a[o[2][2]] || 0 );
                    q = Math.min( 255, Math.max( 0, ( Math.sqrt( ( l * l ) + ( m * m ) ) / divisor ) + bias ) );
    
                    d[i] = d[i + 1] = d[i + 2] = q;
                }

                return true;
            }
        }
    } )();
    
    // pixelate
    mn.filtr.filters.pixelate = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    blocksize: 10
                }, options || {} );
                    
                this.options.blocksize = Math.max( 1, this.options.blocksize );
                params.changed = false;
                
                this.ctx = params.canvas.getContext( '2d' );
                
                return mn.filtriterator.block( params, this.options.blocksize, function( x, y, c, pctx, rect ) {
                    pctx.drawImage( c, x, y, this.options.blocksize, this.options.blocksize, 0, 0, 1, 1 );
                    
                    var d = pctx.getImageData( 0, 0, 1, 1 ).data;
                    this.ctx.fillStyle = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
                    this.ctx.fillRect( rect.left + x, rect.top + y, this.options.blocksize, this.options.blocksize );
                }.$bind( this ) );
            }
        }
    } )();

    // pointillize
    mn.filtr.filters.pointillize = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    radius:      5,
                    density:     1.2,
                    noise:       1,
                    transparent: false
                }, options || {} );
                
                this.options.radius  = Math.max( 1, this.options.radius );
                this.options.density = Math.min( 5, Math.max( 0, this.options.density ) );
                this.options.noise   = Math.max( 0, this.options.noise );

                var rect = params.options.rect;
                var w    = rect.width;
                var h    = rect.height;
                this.ctx = params.canvas.getContext( '2d' );
                this.cw  = params.canvas.width;
                this.ch  = params.canvas.height;
                this.c   = mn.filtrutil.createCanvas( w, h, true );
                cctx     = this.c.getContext( '2d' );
                cctx.drawImage( params.canvas, rect.left, rect.top, w, h, 0, 0, w, h );

                if ( this.options.transparent ) {
                    this.ctx.clearRect( rect.left, rect.top, rect.width, rect.height );
                }

                this.rnoise = this.options.radius * this.options.noise;
                params.changed = false;

                return mn.filtriterator.radial( params, this.options.radius, this.options.density, function( x, y, pctx, rect ) {
                    var rndx = this.options.noise? ( x + ( ( Math.random() * 2 - 1 ) * this.rnoise ) ) >> 0 : x;
                    var rndy = this.options.noise? ( y + ( ( Math.random() * 2 - 1 ) * this.rnoise ) ) >> 0 : y;
                    var pixx = rndx - this.options.radius;
                    var pixy = rndy - this.options.radius;
                    var diax = diay = this.options.radius * 2;
                    
                    if ( pixx < 0 ) pixx = 0;
                    if ( pixy < 0 ) pixy = 0;
                    if ( diax + pixx > w ) diax = w - pixx;
                    if ( diay + pixy > h ) diay = h - pixy;
                    if ( diax < 1 ) diax = 1;
                    if ( diay < 1 ) diay = 1;
                    
                    pctx.drawImage( this.c, pixx, pixy, diax, diay, 0, 0, 1, 1 );
                    var d = pctx.getImageData( 0, 0, 1, 1 ).data;

                    this.ctx.fillStyle = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
                    this.ctx.beginPath();
                    this.ctx.arc( $bound( rndx + rect.left, 0, this.cw ), $bound( rndy + rect.top,  0, this.ch ), this.options.radius, 0, Math.PI * 2, true );
                    this.ctx.closePath();
                    this.ctx.fill();
                }.$bind( this ) );
            }
        }
    } )();
    
    // posterize
    mn.filtr.filters.posterize = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    levels: 4
                }, options || {} );
                
                this.options.levels = Math.max( 2, Math.min( 256, this.options.levels ) );
                
                this.d      = mn.filtrutil.getCanvasData( params );
                this.areas  = 256 / this.options.levels;
                this.values = 256 / ( this.options.levels - 1 );
                
                return mn.filtriterator.matrix( params, function( pr, pg, pb, pa, w, h, x, y ) {
                    this.d[pr] = $bound( this.values * ( ( this.d[pr] / this.areas ) >> 0 ), 0, 255 );
                    this.d[pg] = $bound( this.values * ( ( this.d[pg] / this.areas ) >> 0 ), 0, 255 );
                    this.d[pb] = $bound( this.values * ( ( this.d[pb] / this.areas ) >> 0 ), 0, 255 );
                }.$bind( this ) );
            }
        }
    } )();

    // reflect
    mn.filtr.filters.reflect = ( function() {
        return {
            supported: ( mn.client.hasCanvasData || mn.client.IE ),
            process:   function( params, options ) {
                this.options = $extend( {
                    height:  0.5,
                    opacity: 0.5
                }, options || {} );

                if ( !params.image ) {
                    return false;
                }
                
                var img     = params.image;
                var div     = $c( 'div' );
                var rheight = Math.floor( img.height * this.options.height );
                var rwidth  = img.width;
                var dheight = Math.floor( img.height * ( 1 + this.options.height ) );

                if ( mn.client.hasCanvasData ) {
                    var c = mn.filtrutil.createCanvas( rwidth, rheight, true );
                    c.style.width    = rwidth  + 'px';
                    c.style.height   = rheight + 'px';
                    div.style.width  = rwidth  + 'px';
                    div.style.height = dheight + 'px';
                    img.parentNode.replaceChild( div, img );
                    
                    div.appendChild( img );
                    div.appendChild( c   );
                    
                    var ctx = c.getContext( '2d' );
                    ctx.save();
                    ctx.translate( 0, img.height - 1 );
                    ctx.scale( 1, -1 );
                    ctx.drawImage( img, 0, 0, rwidth, img.height );
                    ctx.restore();
                    ctx.globalCompositeOperation = 'destination-out';
                    
                    var grad = ctx.createLinearGradient( 0, 0, 0, rheight );
                    grad.addColorStop( 1, 'rgba(255, 255, 255, 1.0)' );
                    grad.addColorStop( 0, 'rgba(255, 255, 255, ' + ( 1 - this.options.opacity ) + ')' );
        
                    ctx.fillStyle = grad;
                    ctx.rect( 0, 0, rwidth, rheight * 2 );
                    ctx.fill();
                    
                    params.changed = false;
                    return true;
                } else if ( mn.client.IE ) {
                    var refl = $c( 'img', {
                        src: img.src
                    }, {
                        width:        rwidth + 'px',
                        height:       img.height + 'px',
                        display:      'block',
                        marginBottom: '-' + ( img.height - rheight ) + 'px',
                        filter:       'flipv progid:DXImageTransform.Microsoft.Alpha(opacity=' + ( this.options.opacity * 100 ) + ', style=1, finishOpacity=0, startx=0, starty=0, finishx=0, finishy=' + ( this.options.height * 100 ) + ')'
                    } );

                    div.style.width  = rwidth  + 'px';
                    div.style.height = dheight + 'px';
                    img.parentNode.replaceChild( div, img );
                
                    div.appendChild( img  );
                    div.appendChild( refl );
            
                    return true;
                }
            }
        }
    } )();
    
    // removenoise
    mn.filtr.filters.removenoise = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.d = mn.filtrutil.getCanvasData( params );

                return mn.filtriterator.matrixarea( params, function( pr, pg, pb, pa, w, h, x, y, offsetPrev, offsetNext ) {
                    var rmin, rmax, gmin, gmax, bmin, bmax;

                    // red
                    rmin = rmax = this.d[offsetPrev];
                    var r1 = this.d[pr - 4], r2 = this.d[pr + 4], r3 = this.d[offsetNext];
                    
                    if ( r1 < rmin ) rmin = r1;
                    if ( r1 > rmax ) rmax = r1;
                    if ( r2 < rmin ) rmin = r2;
                    if ( r2 > rmax ) rmax = r2;
                    if ( r3 < rmin ) rmin = r3;
                    if ( r3 > rmax ) rmax = r3;

                    // green
                    gmin = gmax = this.d[offsetPrev + 1];
                    var g1 = this.d[pr - 3], g2 = this.d[pr + 5], g3 = this.d[offsetNext + 1];
                    
                    if ( g1 < gmin ) gmin = g1;
                    if ( g1 > gmax ) gmax = g1;
                    if ( g2 < gmin ) gmin = g2;
                    if ( g2 > gmax ) gmax = g2;
                    if ( g3 < gmin ) gmin = g3;
                    if ( g3 > gmax ) gmax = g3;

                    // blue
                    bmin = bmax = this.d[offsetPrev + 2];
                    var b1 = this.d[pr - 2], b2 = this.d[pr + 6], b3 = this.d[offsetNext + 2];
                    
                    if ( b1 < bmin ) bmin = b1;
                    if ( b1 > bmax ) bmax = b1;
                    if ( b2 < bmin ) bmin = b2;
                    if ( b2 > bmax ) bmax = b2;
                    if ( b3 < bmin ) bmin = b3;
                    if ( b3 > bmax ) bmax = b3;

                    this.d[pr] = $bound( this.d[pr], rmin, rmax );
                    this.d[pg] = $bound( this.d[pg], gmin, gmax );
                    this.d[pb] = $bound( this.d[pb], bmin, bmax );
                }.$bind( this ) );
            }
        }
    } )();
    
    // resize
    mn.filtr.filters.resize = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    width:  params.width,
                    height: params.height
                }, options || {} );

                var c = mn.filtrutil.createCanvas( this.options.width, this.options.height, true );
                c.getContext( '2d' ).drawImage( params.canvas, 0, 0, this.options.width, this.options.height );
                
                params.canvas.width  = this.options.width;
                params.canvas.height = this.options.height;
                params.canvas.getContext( '2d' ).drawImage( c, 0, 0 );
                
                params.changed = false;
                return true;
            }
        }
    } )();

    // rotate
    mn.filtr.filters.rotate = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    angle: 0
                }, options || {} );
            
                var angle = parseFloat( this.options.angle ) * Math.PI / 180;
                var c     = mn.filtrutil.createCanvas( params.width, params.height, true );
                c.getContext( '2d' ).drawImage( params.canvas, 0, 0, params.width, params.height );

                if ( angle > Math.PI * 0.5 ) {
                    angle = Math.PI - angle;
                }
                
                if ( angle < -Math.PI * 0.5 ) {
                    angle = -Math.PI - angle;
                }
                
                var diag       = Math.sqrt( params.width * params.width + params.height * params.height );
                var diagangle1 = Math.abs( angle ) - Math.abs( Math.atan2( params.height, params.width ) );
                var diagangle2 = Math.abs( angle ) + Math.abs( Math.atan2( params.height, params.width ) );

                var newWidth   = Math.abs( Math.cos( diagangle1 ) * diag );
                var newHeight  = Math.abs( Math.sin( diagangle2 ) * diag );

                params.canvas.width  = newWidth;
                params.canvas.height = newHeight;

                var ctx = params.canvas.getContext( '2d' );
                ctx.translate( newWidth / 2, newHeight / 2 );
                ctx.rotate( angle );
                ctx.drawImage( c, -params.width / 2, -params.height / 2 );

                params.changed = false;
                return true;
            }
        }
    } )();

    // scatter
    mn.filtr.filters.scatter = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    strength: 1
                }, options || {} );
                
                this.d = mn.filtrutil.getCanvasData( params );

                return mn.filtriterator.matrixarea( params, function( pr, pg, pb, pa, w, h, x, y, offsetPrev, offsetNext ) {
                    var oldr = this.d[pr];
                    var oldg = this.d[pg];
                    var oldb = this.d[pb];
                    var dist = mn.filtrutil.randomInt( -this.options.strength, this.options.strength ) * 4;
                    var newr, newg, newb;
                    
                    if ( mn.filtrutil.randomInt( 0, 1 ) ) {
                        if ( !this.d[offsetPrev + dist] ) {
                            return;
                        }
                        
                        newr = this.d[offsetPrev + dist];
                        newg = this.d[offsetPrev + dist + 1];
                        newb = this.d[offsetPrev + dist + 2];
                    } else {
                        if ( !this.d[offsetNext + dist] ) {
                            return;
                        }
                        
                        newr = this.d[offsetNext + dist];
                        newg = this.d[offsetNext + dist + 1];
                        newb = this.d[offsetNext + dist + 2];
                    }
                    
                    this.d[offsetPrev + dist]     = oldr;
                    this.d[offsetPrev + dist + 1] = oldg;
                    this.d[offsetPrev + dist + 2] = oldb;
                
                    this.d[pr] = newr;
                    this.d[pg] = newg;
                    this.d[pb] = newb;
                }.$bind( this ) );
            }
        }
    } )();

    // screen
    mn.filtr.filters.screen = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.d = mn.filtrutil.getCanvasData( params );
                
                return mn.filtriterator.matrix( params, function( pr, pg, pb, pa, w, h, x, y ) {
                    if ( ( x % 2 ) || ( y % 2 ) ) {
                        this.d[pr] = this.d[pg] = this.d[pb] = 0;
                    }
                }.$bind( this ) );
            }
        }
    } )();

    // sepia
    mn.filtr.filters.sepia = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    mode:  1,
                }, options || {} );
                
                this.options.mode = $bound( this.options.mode, 0, 1 );
                this.d = mn.filtrutil.getCanvasData( params );
                        
                return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    if ( this.options.mode ) {
                        // a bit faster
                        var c = ( this.d[pr] * 0.299 + this.d[pg] * 0.587 + this.d[pb] * 0.114 );
                        
                        this.d[pr] = $bound( c + 39, 0, 255 );
                        this.d[pg] = $bound( c + 14, 0, 255 );
                        this.d[pb] = $bound( c - 36, 0, 255 );
                    } else {
                        this.d[pr] = $bound( this.d[pr] * 0.393 + this.d[pg] * 0.769 + this.d[pb] * 0.189, 0, 255 );
                        this.d[pg] = $bound( this.d[pr] * 0.349 + this.d[pg] * 0.686 + this.d[pb] * 0.168, 0, 255 );
                        this.d[pb] = $bound( this.d[pr] * 0.272 + this.d[pg] * 0.534 + this.d[pb] * 0.131, 0, 255 );
                    }
                }.$bind( this ) );
            }
        }
    } )();
    
    // sharpen
    mn.filtr.filters.sharpen = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    strength: 0
                }, options || {} );
                
                this.options.strength = $bound( this.options.strength, 0, 1 );

                this.d        = mn.filtrutil.getCanvasData( params );
                this.dc       = mn.filtrutil.getCanvasData( params, true );
                this.mul      = 15;
                this.mulother = 1 + 3 * this.options.strength;
            
                var weight = 1 / mn.filtrutil.processKernel( [[0, -this.mulother, 0], [-this.mulother, this.mul, -this.mulother], [0, -this.mulother, 0]] );

                this.mul      *= weight;
                this.mulother *= weight;

                return mn.filtriterator.matrixarea( params, function( pr, pg, pb, pa, w, h, x, y, offsetPrev, offsetNext ) {
                    this.d[pr] = $bound( ( ( -this.dc[offsetPrev]     - this.dc[pr - 4] - this.dc[pr + 4] - this.dc[offsetNext]     ) * this.mulother + this.dc[pr] * this.mul ), 0, 255 );
                    this.d[pg] = $bound( ( ( -this.dc[offsetPrev + 1] - this.dc[pr - 3] - this.dc[pr + 5] - this.dc[offsetNext + 1] ) * this.mulother + this.dc[pg] * this.mul ), 0, 255 );
                    this.d[pb] = $bound( ( ( -this.dc[offsetPrev + 2] - this.dc[pr - 2] - this.dc[pr + 6] - this.dc[offsetNext + 2] ) * this.mulother + this.dc[pb] * this.mul ), 0, 255 );
                }.$bind( this ) );
            }
        }
    } )();

    // solarize
    mn.filtr.filters.solarize = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.d = mn.filtrutil.getCanvasData( params );
                        
                return mn.filtriterator.linear( params, function( pr, pg, pb, pa, w, h, x, y ) {
                    if ( this.d[pr] > 127 ) this.d[pr] = 255 - this.d[pr];
                    if ( this.d[pg] > 127 ) this.d[pg] = 255 - this.d[pg];
                    if ( this.d[pb] > 127 ) this.d[pb] = 255 - this.d[pb];
                }.$bind( this ) );
            }
        }
    } )();
    
    // tritone
    mn.filtr.filters.tritone = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    low:  {r: 255, g:   0, b:   0},
                    mid:  {r:   0, g: 255, b:   0},
                    high: {r:   0, g:   0, b: 255}
                }, options || {} );

                this.t = [];
                var i, q;
                
                for ( i = 0; i < 128; i++ ) {
                    q = i / 127;
                    this.t[i] = [this.options.low.r + q * ( this.options.mid.r  - this.options.low.r ), this.options.low.g + q * ( this.options.mid.g  - this.options.low.g ), this.options.low.b + q * ( this.options.mid.b  - this.options.low.b )];
                }
    
                for ( i = 128; i < 256; i++ ) {
                    q = ( i - 127 ) /128;
                    this.t[i] = [this.options.mid.r + q * ( this.options.high.r - this.options.mid.r ), this.options.mid.g + q * ( this.options.high.g - this.options.mid.g ), this.options.mid.b + q * ( this.options.high.b - this.options.mid.b )];
                }
    
                this.d = mn.filtrutil.getCanvasData( params );
                        
                return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    var v = Math.min( 255, Math.max( 0, Math.round( this.d[pr] * 0.299 + this.d[pg] * 0.587 + this.d[pb] * 0.114 ) ) );
                    
                    this.d[pr] = this.t[v][0];
                    this.d[pg] = this.t[v][1];
                    this.d[pb] = this.t[v][2];
                }.$bind( this ) );
            }
        }
    } )();
    
    // unredeyes
    mn.filtr.filters.unredeyes = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    threshold: 1.6
                }, options || {} );
                
                this.d = mn.filtrutil.getCanvasData( params );
                
                return mn.filtriterator.linear( params, function( pr, pg, pb, pa ) {
                    var r = this.d[pr];
                    var g = this.d[pg];
                    var b = this.d[pb];
                    if ( ( ( g || b )? 2 * r / ( g + b ) : ( r? 2 : 0 ) ) > this.options.threshold ) {
                        this.d[pr] = ( g || b )? ( g + b ) / 2 : 0;
                    }
                }.$bind( this ) );
            }
        }
    } )();
    
    // unsharpmask
    mn.filtr.filters.unsharpmask = ( function() {
        return {
            supported: mn.client.hasCanvasData,
            process:   function( params, options ) {
                this.options = $extend( {
                    amount:    0,
                    radius:    0,
                    threshold: 0
                }, options || {} );
                
                this.options.amount    = ( ( Math.min( 500, Math.max( 0, this.options.amount ) ) / 2 ) * 0.016 );
                this.options.radius    = Math.min(   5, Math.max( 0, this.options.radius    ) ) / 10;
                this.options.threshold = Math.min( 255, Math.max( 0, this.options.threshold ) );
                
                this.options.amount++;
                this.options.threshold--;

                this.d   = mn.filtrutil.getCanvasData( params );
                this.dbl = mn.filtrutil.getCanvasData( {
                    canvas:  mn.filtrutil.createBlurCanvas( params, this.options.radius * 20 ),
                    options: params.options
                } );

                return mn.filtriterator.matrixarea( params, function( pr, pg, pb, pa, w, h, x, y, offsetPrev, offsetNext ) {
                    var rdif, gdif, bdif;

                    if ( ( ( rdif = this.d[pr] - this.dbl[pr] ) > this.options.threshold ) || ( rdif < -this.options.threshold ) ) this.d[pr] = $bound( this.options.amount * rdif + this.dbl[pr], 0, 255 );
                    if ( ( ( gdif = this.d[pg] - this.dbl[pg] ) > this.options.threshold ) || ( gdif < -this.options.threshold ) ) this.d[pg] = $bound( this.options.amount * gdif + this.dbl[pg], 0, 255 );
                    if ( ( ( bdif = this.d[pb] - this.dbl[pb] ) > this.options.threshold ) || ( bdif < -this.options.threshold ) ) this.d[pb] = $bound( this.options.amount * bdif + this.dbl[pb], 0, 255 );
                }.$bind( this ) );
            }
        }
    } )();
} )();


if ( ( typeof jQuery != 'undefined' ) && jQuery.fn ) {
    jQuery.fn.filtr = function( filter, options, callback ) {
        var elms = [];
        
        this.each( function() {
            if ( ( this.tagName.toLowerCase() == 'img' ) && !this.complete ) {
                return;
            }
            
            var res = mn.filtr.process( this, filter, options, callback );
            
            if ( res ) {
                elms.push( res );
            }
        } );
        
        return ( elms.length > 0 )?
            jQuery( elms ) :
            this;
    };
};

if ( ( typeof Prototype != 'undefined' ) && ( typeof Element != 'undefined' ) && ( typeof Element.Methods != 'undefined' ) ) {
    Element.addMethods( {
        filtr: function( element, filter, options, callback ) {
            if ( ( element.tagName.toLowerCase() == 'img' ) && !element.complete ) {
                return;
            }
            
            return $( mn.filtr.process( element, filter, options, callback ) );
        }
    } );
};