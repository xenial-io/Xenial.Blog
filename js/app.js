"use strict";



$(document).ready(function() {
    var attachFastClick = Origami.fastclick;
    attachFastClick(document.body);
    
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
}); 