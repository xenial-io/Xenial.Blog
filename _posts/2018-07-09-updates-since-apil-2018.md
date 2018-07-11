---
 layout: post 
 title: Updates since April 2018
 comments: true
 tags: [Ranorex, Webtestit, Selenium, TypeScript, UITest, XAF, Windows10, DesktopBridge, APPX, Deployment, Misc, Chromely, Blaster, Blazor, Electron, Patreon, Chromium, Scissors, OpenSource, GitHub, Personal, Retro, Recap]
---
Since my [last post]() a few months past by, so I wanted to provide a recap what happened since i [joined Ranorex](). This is in no particular order, or importance, it's more a recap and update for my [patreons]() and my other readers. Also it's a rather long time frame to get the order of things happened right. I think it's more important *what* changed and *why* not *when* (but maybe this is worth it's own blog post).  

So let's look at some aspects. I'll try to use a kinda retrospective approach:

| Key | Why | Description |  
| --- | --- | --- |
| WNC | What (we/I) like | Would not change |
| SC | what we should change in my opinion | Should change |
| A | what we can do in my opinion | Action )

So this will give you some direction what I am thinking on my own, and where I am heading into next.

## Ranorex / My daily bread

Okay, this is a huge topic, but I'll keep it short: It's awesome `\m/`.  
Working on tools for developers and testers was always a dream of mine. Doing this with a team of awesome people is even more enjoyable and also challenging. Working with designers, testers, other developers, marketing, corporate leaders all at once can be challenging, but it's amazing what you can achieve with people collaborating in a open and own paced way.  

### General

### Technical

#### TypeScript

Okay it's now about 3 months since i [joined Ranorex]() and since then I develop in [TypeScript](). *Leaving* .NET land was hard, but it was worth the effort. I like a lot about TS, cause C# lacks some functional programing approaches I know from F# and other functional brothers. But of course it's not perfect. I stumbled upon [PureScript]() a few days ago, so I will definitely look into that.  
Sometimes i miss C# though. :)

* WNC
  * TypeScript's control flow based type analysis!
  * 'Script like' but type safe by default!
  * NPM is **HUGE**!
  * Ultra easy patching of external dependencies (yes i look at you [nuget]())!
  * Pattern matching!
  * Runtime performance, cause it's JavaScript at the end!
* SC
  * More functional type safety (yes i look at you lodash)
  * TypeScripts type system sometimes gets in your way, especially with external libraries
  * Force immutability in some way like null checks
  * Npm is sometimes briddle. It breaks, when you don't need it to break (for example on release day)
  * Quality of external dependencies / Semver does not work all the time
* A
  * Be aware of dependency hell
  * Be careful about dependencies (and look out for dependencies of dependencies)
  * For libraries written in JavaScript: Add the type definitions beforehand you use the library. Don't be lazy, it's expensive to do it too late.
  * Contribute more to open source directly. Don't be shy, they don't bite you.

Most of the things I *complain* about, is more on a ecosystem level. [NPM](), [Node]() and the whole ecosystem around it is rather new to me, so it's maybe more a lack of experience by me. A lot in this ecosystem is very lean and pragmatic though, which I like, but it's not that mature yet, so there are dragons sometimes.

#### Selenium

I did some work with [selenium]() in the past, but was rather disappointed after some time. UI tests are *hard*. Test the right things, the right way is *even harder*. But time goes by, and the web changes fast. We passed the [jQuery age]() and entered [bootstrap]() and [accessibility age](). We got CSS selectors that are [sane](). Selenium client libraries are available in almost every language. Some more [sane](), some [fewer](). So let's recap.

* WNC
  * It's mature, but it's reliable!
  * It's fast!
  * **HUGE** [language support]()!
  * All browsers are on board for WebDriver, even [Edge]() and [Windows]()!
* SC
  * Almost every language has found **different** more or less different characteristic flavors of some patterns. If something works with java, it does not work in protractor for example.
  * Drivers behave weird sometimes
  * Debugging is not baked in
* A
  * Community should work hard together if it still cares about selenium
  * More open source utility libraries that easy the use of selenium, for example of using it with various frontend frameworks (bootstrap, vue, ect...)

Selenium and especially WebDriver are awesome pieces of software. They are based on open standards. But testers *are not developers* (take this with a gran of salt). Testing is *hard*. Blogging about testing is *even harder*. Writing testing libraries and apply testing patterns on a library level is *holy grail hard*.  
But we should move forward as an industry. Testing **[is part of production]()**. So let's treat test code (esp UI tests) not as the [little fat cousin]() of production.  
Write libraries, put them on [github]()! Talk on conferences about it. There is nothing to be ashamed of being a tester :)

#### Webtestit Beta


> 

## OpenSource

### Chromium
#### Chromely

#### Blazor

#### Blaster

## DevExpress/XAF/XPO

### Release 18.1.15

### Scissors.FeatureCenter

### MVP-Program

## Patreon


## Personal

### Birthday

### Vacation

## Recap/Focus