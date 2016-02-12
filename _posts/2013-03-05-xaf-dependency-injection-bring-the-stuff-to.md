--- 
layout: post
title: "XAF Dependency Injection - bring the stuff together"
comments: false
tags: ["XPO", "XAF", "WebApi", "Web", "WebMvc", "MVC", "Unity", "UnitTesting", "DI", "async", "await"]
---
## XAF Dependency Injection - bring the stuff together #

Somebody of you know that we actually use [FunnelWeb](http://www.funnelweblog.com/). Don't get me wrong, it is a good blog engine, but it's buggy, and it is a playground. 

I like opensource projects, and i like to contribute to FunnelWeb to make it a better blog engine. But my spare time is really, ...hmm rare? I try to make the best out of this problem and try to write a blog engine (oh no, not another one) that uses all the XPO/XAF/WebApi/WebMvc/Unity/DI/async/await features i blogged about earlier and get the thing into a real working application.

Some facts i want to keep in mind when i implement this thing:

* I *like* to import (or even better, reuse) the existing database of funnelweb
* I **will** create this in TDD (from the **first** to the **last** line of code)
* I **will** create a full blown XAF/XPO/WebApi/WebMvc application
* I *like* to manage the whole thing out of XAF
* I *like* to create a API that allows me easily to import (or communicate) with other engines
* I **will** follow clean-coder
* I **will** share this code open-source
* I **have to** use *TFSService* or *TFS* with `GIT` or `TFS-SCC`
* I *like* to use *Continious deployment*
* I *like* that other XAF users *can* contribute, and *are able to* learn from my experiences
* I like code [kata's](http://osherove.com/tdd-kata-1/) & I like [trains](http://www.youtube.com/watch?v=hHkKJfcBXcw) ;)

In the next weeks i will try to code every WE till this thing is done.

Your help, thoughts, meanings and other ideas are wellcome! 

Thanks, Manuel
