"use strict";



$(document).ready(function() {
    var attachFastClick = Origami.fastclick;
    attachFastClick(document.body);

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

    function hammerIt(elm) {
        var hammertime = new Hammer(elm, {});
        hammertime.get('pinch').set({
            enable: true
        });
        var posX = 0,
            posY = 0,
            scale = 1,
            last_scale = 1,
            last_posX = 0,
            last_posY = 0,
            max_pos_x = 0,
            max_pos_y = 0,
            transform = "",
            el = elm;
    
        hammertime.on('doubletap pan pinch panend pinchend', function(ev) {
            if (ev.type == "doubletap") {
                transform =
                    "translate3d(0, 0, 0) " +
                    "scale3d(2, 2, 1) ";
                scale = 2;
                last_scale = 2;
                try {
                    if (window.getComputedStyle(el, null).getPropertyValue('-webkit-transform').toString() != "matrix(1, 0, 0, 1, 0, 0)") {
                        transform =
                            "translate3d(0, 0, 0) " +
                            "scale3d(1, 1, 1) ";
                        scale = 1;
                        last_scale = 1;
                    }
                } catch (err) {}
                el.style.webkitTransform = transform;
                transform = "";
            }
    
            //pan    
            if (scale != 1) {
                posX = last_posX + ev.deltaX;
                posY = last_posY + ev.deltaY;
                max_pos_x = Math.ceil((scale - 1) * el.clientWidth / 2);
                max_pos_y = Math.ceil((scale - 1) * el.clientHeight / 2);
                if (posX > max_pos_x) {
                    posX = max_pos_x;
                }
                if (posX < -max_pos_x) {
                    posX = -max_pos_x;
                }
                if (posY > max_pos_y) {
                    posY = max_pos_y;
                }
                if (posY < -max_pos_y) {
                    posY = -max_pos_y;
                }
            }
    
    
            //pinch
            if (ev.type == "pinch") {
                scale = Math.max(.999, Math.min(last_scale * (ev.scale), 4));
            }
            if(ev.type == "pinchend"){last_scale = scale;}
    
            //panend
            if(ev.type == "panend"){
                last_posX = posX < max_pos_x ? posX : max_pos_x;
                last_posY = posY < max_pos_y ? posY : max_pos_y;
            }
    
            if (scale != 1) {
                transform =
                    "translate3d(" + posX + "px," + posY + "px, 0) " +
                    "scale3d(" + scale + ", " + scale + ", 1)";
            }
    
            if (transform) {
                el.style.webkitTransform = transform;
            }
        });
    }

    $('article img').each(function(i,e){
        hammerIt(e);
    });

    $('article img').featherlight({
        targetAttr: 'src',
        afterOpen: function(e){
            hammerIt(this.$content);
        }
    });
}); 