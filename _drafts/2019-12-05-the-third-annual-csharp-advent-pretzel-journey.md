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

 - It is a *garage* project from [Code52](http://code52.org/pretzel/)
 - Originally written in net451
 - Support for [Liquid](https://shopify.github.io/liquid/)
 - Support for [Razor](https://docs.microsoft.com/en-us/aspnet/core/mvc/views/razor?view=aspnetcore-3.0)
 - Support for [custom plugins](https://github.com/Code52/pretzel/wiki/Plugins)
 - Uses [MEF](https://docs.microsoft.com/en-us/dotnet/framework/mef/) under the hood
 - And a lot of dependencies that needed to be replaced
     - [Nowin](https://www.nuget.org/packages/Nowin/) Fast Owin Web server in pure .Net
     - [RazorEngine](https://www.nuget.org/packages/RazorEngine) RazorEngine - A Templating Engine based on the Razor parser.
     - [NDesk.Options](https://www.nuget.org/packages/NDesk.Options/) NDesk.Options is a callback-based program option parser for C#
     - [AjaxMin](https://www.nuget.org/packages/AjaxMin/) JavaScript and CSS minification Library for use in .NET applications that want to provide minification or parsing functionality.
     - [DotlessClientOnly](https://www.nuget.org/packages/DotlessClientOnly/) This is a project to port the hugely useful Less libary to the .NET world. It give variables, nested rules and operators to CSS.
     - [System.IO.Abstractions](https://www.nuget.org/packages/System.IO.Abstractions/) A set of abstractions to help make file system interactions testable.
     - [ScriptCs](https://www.nuget.org/packages/ScriptCs.Hosting/) ScriptCs.Hosting provides common services necessary for hosting scriptcs in your application.

## The goal

Before I started working on the project, I thought it would be awesome to have pretzel as a [dotnet global tool](https://docs.microsoft.com/en-us/dotnet/core/tools/global-tools) cause it's a perfect fit for that. It also means I could reduce ceremony on getting pretzel running on [azure devops](https://azure.microsoft.com/en-us/services/devops/). Currently I use a [cake script](https://cakebuild.net/) that basically downloads the latest release from pretzel, unpacks it and then execute some batch commands on it. But that has, of course, some downsides to it. It has a lot of ceremony and moving parts and has therefore multiple points of failure. First download nuget via powershell, restore cake, run the build script that downloads pretzel, afterwards launch pretzel.

With the help of an global tool we can run (if at least dotnetcore2.2 is installed):

```cmd
dotnet tool install -g Pretzel.Tool
pretzel build
```

Thats it! I doubt it could get any easier!

Another goal was to support [jekyll's data files](https://jekyllrb.com/docs/datafiles/). It was a happy [coincidence](https://github.com/Code52/pretzel/issues/331) that [SunaCode](https://github.com/SunaCode) was asking for that feature, cause my main reason for starting working on pretzel was exactly this feature after I read about using [static comments for jekyll](https://mademistakes.com/articles/jekyll-static-comments/) to finally replace [disqus](https://fatfrogmedia.com/delete-disqus-comments-wordpress/) cause it is hard to justify for privacy and performance reasons for a blog. Since I started my own business starting this year, I now am responsible for that stuff and I really need to care.

We didn't want to force old users to switch to `netcoreapp2.2`, so we wanted to support full framework with a reasonable amount of work and aimed to target `net462` cause it's the first version that fully supports `netstandard2.0`.

## The community

I used the term *we* a lot in the post so far. That's rather rare from my perspective cause I'm only a one man shop (so far). What do I mean with *we*?

After I prepared my [first PR](https://github.com/Code52/pretzel/pull/324) it lit [laedit](https://github.com/laedit) on fire as well. He is a former lead contributor to pretzel, but due lack of time (as this is often the case with side projects) he *stopped contributing*.

We discussed goals, problems, strategies and chances on the project.
He did all the code reviews, jumped in when I needed help (esp. for making the build green again on CI). Also he had the awesome idea to [create a project](https://github.com/Code52/pretzel/projects/1) on github to make our progress **more visible**. He also named the project after me, which was a little bit frightening, but also motivating on the other hand. The 1.0 in the name of the project was the most frightening part, nobody really want's to *ship* 1.0 but I really am proud to be the *chosen one*.

But the most important thing: **WE** kept the project on fire, kept good vibes (even if we had sometimes a *hard* debate on technical implementation *details*) and had always the goal in front of our inner eye. It is fun to work with such an open minded community, esp. with such a great guy than laedit! Big shout outs to you my friend, it wouldn't be possible without your effort!

> The community is the *thing* that drives **any** open source project!
> So jump in and [start with it](https://up-for-grabs.net/#/) now!
> Write issues, test things, write docs, do code reviews, write code or write blogs!
> Every little bit matters **a lot**. And remember. Be *kind* to each other! (Hey it's christmas, what would your mom think about you ;))

## The plan

Cause there are a lot of 