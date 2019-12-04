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

We also aimed for usage compatibility. So from an end user perspective everything needed to be compatible.

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

Cause there are a lot of dependencies and goals to solve, we decided to tackle our problems in multiple phases.

1. Switch to new csproj file to ease multi targeting `net642` and `netcoreapp2.0` later
1. Update all dependencies to the latest version
1. Look for all easy replacements for the dependencies that already have `netstandard2.0` support
1. Lookout for alternatives for those dependencies that are either deprecated or don't provide an easy `netstandard2.0` part.
1. Switch to `System.Composition` and drop `MEF`
1. Use the new `System.CommandLine.Experimental` package for the deprecated `NDesk.Options`
1. Add the data files feature
1. After all dependencies are on `netstandard2.0` switch `Pretzel.Logic` to `netstandard2.0`
1. Multitarget `Pretzel` and `Pretzel.Tests` to `net462`and `netcoreapp2.0`
1. Build and package the `Pretzel.Tool` global tool
1. Somewhere in between provide more docs for usage and plugin authors

## The problems

Early on in the project we had some tough decisions to made. We wanted to be compatible with old plugins, but after we started to work on it we knew we need to make some tradeoffs.

We either could do cross compiling for `netcoreapp2.0` and use different dependencies for `net461` and `netstandard2.0` and do a lot of `#if DEF` compilation, or we force plugin authors to update and recompile their plugins. We choose the second option, cause it's 1.0 anyway and it would messed up the code **a lot**. Sometimes it's just better to release old burdens.

## The execution

I'll not going to cover that in full detail, but you can see [the list of PR's](https://github.com/Code52/pretzel/pulls?utf8=%E2%9C%93&q=is%3Apr+author%3Abiohazard999+) but give a higher level of perspective and don't want to bore you with all nitty gritty details.

##### Converting the project to the new csproj format

That was a quite easy task. I used the awesome dotnet global tool from [hvanbakel](https://github.com/hvanbakel) called [migrate-2019 or former migrate-2017](https://github.com/hvanbakel/CsprojToVs2017) to convert the project to the new project format. 

```cmd
dotnet migrate-2017 migrate
```

After a bit of cleanup it was building and tests were still passing.

The tricky part was here: The new package format does output the artifacts not under `bin/Debug` but under `bin/Debug/[TFM]`. So getting the build and packaging back ready was a little bit tricky.

##### Update the packages to the latest version

That one was also easy (except for `System.IO.Abstractions`) using the [dotnet outdated tool](https://github.com/jerriep/dotnet-outdated).

```cmd
dotnet outdated -u
```

`System.IO.Abstractions` did make some unit tests fail, so we moved on and fixed that later. I've upgraded to the latest version that made the tests pass manually, and luckily enough that version already supported `netstandard2.0`. We decided to upgrade to the latest version later on, cause we were confident enough that everything was working trough our automated and manual tests.

##### Multitarget Pretzel.Logic for net462/netstandard2.0 and replace MEF with System.Composition

Cause `netstandard2.0` is somehow compatible with `net462` this was the first [real big PR](https://github.com/Code52/pretzel/pull/328).

It took from 5th September to 17th September, 48 commits and 64 comments through the code review. That was the second largest PR in the journey.

That was one of the points in the journey where we finally decided we need to force plugin authors to recompile. But we didn't just throw a new dependency in, we deeply thought about how we want our plugin architecture and API surface will look like in the future.

Cause `MEF` and `System.Composition` are somewhat the same conceptional, they are fundamentally different from API. There is a lack of recomposition, metadata is handled differently. There is no built in way to register objects into the container and so on.

But on the other hand I got such a great overview how the project is composed and how it's architecture looks like in detail.

At that point we dropped support for `ScriptCS` (for now) cause there is no package provided by the `ScriptCS` team that supports `System.Composition`. Cause there is no support for `netcoreapp2.0` and we will need to replace it anyway.

Most of the changes are just changing the visibility of members and adding some attributes. At this point nothing in our test suite helped us. Correct configuration of Composition/DI is often not covered by automated unit tests in a project, cause integration tests normally will cover that. That meant a lot of trial and error.

I've never used `System.Composition` before. It was quite a learning curve (and a lot of false assumptions I made) but most of the error messages were very helpful (esp. compared to MEF1 & MEF2). We also managed to eliminate some architectural flaws in pretzel. So that was a good start.

##### Fix warnings and remove used obsolete API's

After upgrading to the latest versions of the packages there were a [ton of warnings](https://github.com/Code52/pretzel/pull/333) (I think about 300+). It was crucial to remove them before moving further.

Never let your warnings go wild. You'll miss important warnings if your project has hundreds and hundreds of warnings.

Most of them were related to xUnit and the new analyzer package. We found some *bug's* in some test cases and also improved the readability of test failures a lot. That helped later on switching to the latest `System.IO.Abstraction` package. I was unable to fix the issues cause of bad error messages in the test. Eg.: *Expected value was **true** but actual value was **false***

The automated fixes by the xunit analyzer helped a lot here.



## The conclusion

Did we release pretzel as a global tool and made the 1.0 happen? Not yet. Are we almost there? Yes!

As you can see on [the project](https://github.com/Code52/pretzel/projects/1) there are some goals open we want to tackle before **finally** releasing 1.0, does that mean we failed? **Absolutely NOT**. There are a few things open (like for example ScriptCS support) we don't even know if it will land in 1.0.

Was it worth all the effort, tears and blood that flow into the project? **Absolutely YES**. I learned a lot contributing to the project, a lot on motivation, goals, planning and working in the open with people I never met in person. I worked a lot remotely, but working on open source is completely different. It's such a great feeling to work with people that are **really** appreciate your work. Cause every little bit matters **a lot**.

It's a [great time to be a dotnet developer](https://www.infogain.com/making-an-impact/its-a-great-time-to-be-a-net-developer/).

Hope you had as much joy reading my article as I have working on this awesome open source project as I have. Feel free to jump in! Try out pretzel, give it a star on github. Happy holidays and have a nice remaining C# Advent to anybody out there.

Manuel

Ps. Again big thanks to Matthew for the slot on this series!

> If you find interesting what I'm doing, consider becoming a [patreon](//www.patreon.com/biohaz999) or [contact me](//www.delegate.at/) for training, development or consultancy.