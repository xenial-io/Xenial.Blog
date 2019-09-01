"use strict";

/**
 * Simple localStorage with Cookie Fallback
 * v.1.0.0
 *
 * USAGE:
 * ----------------------------------------
 * Set New / Modify:
 *   store('my_key', 'some_value');
 *
 * Retrieve:
 *   store('my_key');
 *
 * Delete / Remove:
 *   store('my_key', null);
 */
 
var store = function store(key, value) {
 
    var lsSupport = false;
    
    // Check for native support
    if (localStorage) {
        lsSupport = true;
    }
    
    // If value is detected, set new or modify store
    if (typeof value !== "undefined" && value !== null) {
        // Convert object values to JSON
        if ( typeof value === 'object' ) {
            value = JSON.stringify(value);
        }
        // Set the store
        if (lsSupport) { // Native support
            localStorage.setItem(key, value);
        } else { // Use Cookie
            createCookie(key, value, 30);
        }
    }
    
    // No value supplied, return value
    if (typeof value === "undefined") {
        var data;
        // Get value
        if (lsSupport) { // Native support
            data = localStorage.getItem(key);
        } else { // Use cookie 
            data = readCookie(key);
        }
        
        // Try to parse JSON...
        try {
           data = JSON.parse(data);
        }
        catch(e) {
           data = data;
        }
        
        return data;
        
    }
    
    // Null specified, remove store
    if (value === null) {
        if (lsSupport) { // Native support
            localStorage.removeItem(key);
        } else { // Use cookie
            createCookie(key, '', -1);
        }
    }
    
    /**
     * Creates new cookie or removes cookie with negative expiration
     * @param  key       The key or identifier for the store
     * @param  value     Contents of the store
     * @param  exp       Expiration - creation defaults to 30 days
     */
    
    function createCookie(key, value, exp) {
        var date = new Date();
        date.setTime(date.getTime() + (exp * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString();
        document.cookie = key + "=" + value + expires + "; path=/";
    }
    
    /**
     * Returns contents of cookie
     * @param  key       The key or identifier for the store
     */
    
    function readCookie(key) {
        var nameEQ = key + "=";
        var ca = document.cookie.split(';');
        for (var i = 0, max = ca.length; i < max; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    
};

var getTheme = function() {
    var theme = store("theme");
    if(theme === "vs-light"){
        return "/css/style-vs-light.css";
    }
    if(theme === "vs-dark"){
        return "/css/style-vs-dark.css";
    }
    return "/css/style-vs-dark.css";
}

var getDxPoweredBy = function() {
    var theme = store("theme");
    if(theme === "vs-light"){
        return "/img/DevExpress-Powered-Color-Large.png";
    }
    if(theme === "vs-dark"){
        return "/img/DevExpress-Powered-White-Large.png";
    }
    return "/img/DevExpress-Powered-White-Large.png";
}

var setTheme = function(theme) {
    var theme = store("theme", theme);
    $("#main-stylesheet").attr("href", getTheme());
    $(".dx-powered-by").attr("src", getDxPoweredBy());
}

$(document).ready(function() {
    // var attachFastClick = Origami.fastclick;
    // attachFastClick(document.body);
    
    $('article .postcontent img').featherlight({
        targetAttr: 'src'
    });

    $(document).keydown(function(e) {
        if (e.keyCode == 27/*ESC*/) {
            $(".mobilenav").fadeOut(500);
            $(".top-menu").removeClass("top-animate");
            $(".mid-menu").removeClass("mid-animate");
            $(".bottom-menu").removeClass("bottom-animate");
            $(".icon").removeClass('expand');
            $("body").removeClass('noscroll');
        }
    });
        
    $(".icon").click(function() {
        $(".mobilenav").fadeToggle(500);
        $(".top-menu").toggleClass("top-animate");
        $(".mid-menu").toggleClass("mid-animate");
        $(".bottom-menu").toggleClass("bottom-animate");
        $(".icon").toggleClass('expand');
        $("body").toggleClass('noscroll');
    });      
     
    $(window).resize(function() {
      var wasVisible = $(".icon").hasClass('expand');
      if ($(window).width() > 1000) {            
            $(".mobilenav").show();
            $(".top-menu").removeClass("top-animate");
            $("body").removeClass("noscroll");
            $(".mid-menu").removeClass("mid-animate");
            $(".bottom-menu").removeClass("bottom-animate");
      } else {
          if(wasVisible) {
            $(".mobilenav").show();
            $(".top-menu").addClass("top-animate");
            $("body").addClass("noscroll");
            $(".mid-menu").addClass("mid-animate");
            $(".bottom-menu").addClass("bottom-animate");
          }
      }
    });

    $.extend($.expr[":"], {
        "containsIN": function(elem, i, match, array) {
            return (elem.textContent || elem.innerText || "").toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
        }
    });

    $("#searchbox").keyup(function() {
        var filter = $(this).val();
        $("#searchlist").find("a:not(:containsIN(" + filter + "))").parent().slideUp();
        $("#searchlist").find("a:containsIN(" + filter + ")").parent().slideDown();
    });

    videojs.options.fluid = true;

    $("#main-stylesheet").attr("href", getTheme());

    $("#theme-selector").change(function() {
        setTheme(this.value);
    });
    var currentTheme = store("theme");
    if(currentTheme){
        setTheme(currentTheme);
        $("#theme-selector").val(currentTheme);
    }
}); 