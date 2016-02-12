"use strict";
// HAMBURGLERv2

function togglescroll() {
  $('body').on('touchstart', function(e) {
    if ($('body').hasClass('noscroll')) {
      e.preventDefault();
    }
  });
}

// PUSH ESC KEY TO EXIT
$(document).keydown(function(e) {
  if (e.keyCode == 27) {
    $(".mobilenav").fadeOut(500);
    $(".top-menu").removeClass("top-animate");
    $("body").removeClass("noscroll");
    $(".mid-menu").removeClass("mid-animate");
    $(".bottom-menu").removeClass("bottom-animate");
  }
});

$(document).ready(function() {
    var attachFastClick = Origami.fastclick;
    attachFastClick(document.body);
    
    $('article img').featherlight({
        targetAttr: 'src'
    });
    $('.menu-btn').click(function(){
        $('.responsive-menu').toggleClass('expand')
    });
    
    togglescroll();
    $(".icon").click(function() {
        $(".mobilenav").fadeToggle(500);
        $(".top-menu").toggleClass("top-animate");
        $("body").toggleClass("noscroll");
        $(".mid-menu").toggleClass("mid-animate");
        $(".bottom-menu").toggleClass("bottom-animate");
    });
    
    var adaptToBiggerScreen = function(){
        if ($(window).width() > 1000) {
            $('nav.mobilenav').show();
            $('nav.mobilenav ul').removeClass('fa-lg');
        } else {
            $('nav.mobilenav ul').addClass('fa-lg');
        }
    };
     
    $(window).resize(function() {
       adaptToBiggerScreen();
    });
    
    adaptToBiggerScreen();
}); 