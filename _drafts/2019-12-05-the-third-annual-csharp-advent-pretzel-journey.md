---
 layout: post 
 title: "The Third Annual C# Advent - The journey of porting pretzel to dotnetcore"
 comments: true
 github: Pretzel
 tags: ["Advent", "Pretzel", "dotnetcore", "Jekyll", "OpenSource", "GitHub"]
 series: The-Third-Annual-CSharp-Advent
---

Happy 5th of December! This post is a [winter special](https://crosscuttingconcerns.com/The-Third-Annual-csharp-Advent) for the awesome idea of [Matthew](https://twitter.com/mgroves) from [crosscuttingconcerns](https://crosscuttingconcerns.com) called The Third Annual C# Advent. So happy third birthday C# Advent!

At the time for registering for the slot I was working on [pretzel](https://github.com/Code52/pretzel) and tough I want to share my journey how we managed to port it to dotnet core.

## The history

First a brief history of pretzel. I migrated from [FunnelWeb to Pretzel](/series/migrating-from-funnelweb-to-pretzel/) back in 2016. I wanted to avoid [Jekyll](https://jekyllrb.com/) at the time, cause there was no [WSL](https://docs.microsoft.com/en-us/windows/wsl/about) back in the day, and it was a pain to use on windows back in the day.

 - It is a garage project from [Code52](http://code52.org/pretzel/)
 - Originally written in net451
 - Support for [Liquid](https://shopify.github.io/liquid/)
 - Support for [Razor](https://docs.microsoft.com/en-us/aspnet/core/mvc/views/razor?view=aspnetcore-3.0)
 - Support for [custom plugins](https://github.com/Code52/pretzel/wiki/Plugins)


