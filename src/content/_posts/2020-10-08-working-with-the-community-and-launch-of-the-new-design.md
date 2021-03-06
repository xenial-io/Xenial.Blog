---
 layout: post 
 title: Working with the community and launch of the new design
 tags: [Community, Brand, Xenial, Blog, Blogging, DevExpress, MVP, XAF, XPO]
---

I've worked hard the last couple of weeks getting my new design out there and today is the day!

Building an online brand is hard work and needs to be considered carefully.
I've thought about this really long and carefully, did a couple of drafts in the past, but I never was happy with the results.

Until now. I did hundreds of iterations on the design, and there are still some places that I'm not 100% happy about,
but I think it's time for getting your feedback!

But first let me talk real quick a little bit about the community.

## Community

Without all the private feedback I've got over the last couple of weeks, this would just not have been possible.

That's why I **really love** working with the community.

> Some special thanks to [Paramethod](https://github.com/Paramethod), [hazard999](https://github.com/hazard999), [egarim](https://github.com/egarim)  
> and of course our newest MVP [jjcolumb](https://github.com/jjcolumb)! 🥳🥳🥳🥳

But what does it mean to be part of a community?

I wrote about this [in the past](2019/12/05/the-third-annual-csharp-advent-pretzel-journey.html#community), but just a quick recap on what it means working as an MVP in an open community and what it does *not*.

Back in the days I got voted as a MVP (I can't remember exactly when, @Dennis if you know, let me know in the comments below) I mainly read the [supportcenter](https://supportcenter.devexpress.com/) tickets related to [XAF](tags/XAF.html) and [XPO](tags/XPO.html) to learn more about the framework and ecosystem and tried to answer questions I knew the solution to, as well as getting inspiration on how to make our team more productive.

Also I tried to make the **hard** things *easier* by throwing out some [open source stuff](https://github.com/biohazard999?tab=repositories&q=&type=source&language=).  
To mention a few with more traction:

* [DXNugetPackageBuilder](https://github.com/biohazard999/DXNugetPackageBuilder)
* [FluentModelBuilder](https://github.com/biohazard999/Para.FluentModelBuilder)
* [DXImageAssemblyImporter](https://github.com/biohazard999/DXImageAssemblyImporter)
* [WindowsIntegration](https://github.com/biohazard999/Xpand.ExpressApp.Win.Para.WindowsIntegration) (this was the first one)

Some of them are obsolete now (`DXNugetPackageBuilder` is not longer needed, but for legacy apps it's still valuable).

I put a lot of effort and time into this and I am always happy when something I put out there helped *someone else* and I will continue to do so.

This is the **giving** back to the community part.
But a community is not only about *giving* it's also about **taking**.

I do it every day. Using open source, reading blog-posts, articles, docs, samples, reaching out to people helping me to achieve **my goal**.

People are investing hundreds of thousands of hours into problem solving online.

* Write a blog post about a problem so I have a space to look at if I ever encounter this again
* Write a tutorial / in depth for reference
* Write open source software
* Contribute by
  * Comment
  * Fix spelling
  * Provide documentation
  * Testing
  * Filing bugs/issues/ideas
* Provide funding

The last point is interesting, because we all know that we need money for living, but let me now focus on parts that I don't think are part of an open community:

* Spam
* Being rude
* Try to get support for free
* Be upset because someone in the community does not respond quickly enough / at all

The first 2 points are easy to explain. Nobody likes spam and nobody likes rude people. Like all people we have opinions and can disagree on topics, but we are professionals and should act like ones. We can discuss problems like grown ups and, of course, nobody can like everybody, but can talk on a professional level.

The second 2 points are more interesting.  
We have a lot of places to discuss today. We have [user groups](), [live community standups](), [online forums](), [Gitter Chat rooms](), [Facebook groups](), [LinkedIn](), [Github](), etc. We **love** to talk about stuff that gets us excited, we share ideas, solutions and ask questions.  **BUT** I don't think its a place to get free support. It's a chance to *speak* with experts *for free*. That does not mean you shouldn't ask questions! It only means, we can open doors, but you need to go through yourself. 
We are not a search engine. We are the search engine for a problem you googled for hours and couldn't find an answer to. Perhaps because you asked the *wrong question*. 
It's not a place to shoot up a bunch of code and think some *sucker* will do *your* job.

I have no problem (and I think most MVP's are happy) if people asks for contracts for [Code reviews](), [Freelancing]() or any [other work involved](). But it is *work*. **HARD work**. And time is limited and bills unfortunately don't pay themselves.  But you are using *my* time, so you should *pay* for it.  

Most of us MVP's are very generous on rates and given the amount of value you get for the price, it is more than fair if you compare the time you need spend yourself / your company on solving those tricky problems.

Let's get really quick on the last point I missed out: **Funding**  
If you can't give anything back to the community (some companies don't allow, etc.) consider *funding*. As for the new design I took the liberty to promote my funding options more prominently.
I don't do any advertisements on any of my sites. Running them is not free, writing the content is even more expensive. In average a post consists from research to published from 3-7 days. Don't get me wrong, I'm not begging for money, I just want to raise your awareness on how much effort and work goes into high quality work.

Enough talk as a moral apostle. Lets talk about the new design and some highlights!

## The new design

I just want to highlight a few features I really put a lot of effort on the new design as well as some technical details.

### Follow the xenial design language

As a veteran of my blog you saw my logo and my corporate colors probably a few times. I did a theme on the old blog, but never was happy how it blended in.  
Now every tool and website I will launch will follow the same design language.

I did [open source](https://github.com/xenial-io/Xenial.Template) that (although it's strictly not open source) and wrote an [npm package](https://www.npmjs.com/package/@xenial-io/xenial-template) for consistent future use.

### Light and dark themes

Whatever your preferred mode on your device is (mine is of course the dark mode) it should be respected by your operating system / browser settings. You can toggle your preferred style in the toolbar or in the hamburger menu on your mobile device.

### Responsive design mobile first

The last design was also mobile friendly but this time, I build everything mobile first. So this should be a first class experience on every device!

### New code highlight and bundeling

I needed a faster and smaller code highlighting that supports dark and light themes so I went for [prismjs](https://prismjs.com/) and [rollup](https://rollupjs.org/guide/en/) this time.

### New comment system

This is the heart of the new blog. Previously I used [disqus](https://disqus.com/) but this time I rolled for an own system for 2 reasons:

1. Performance
1. Privacy

So we can dig into technical details on the next post, let me know in the comments below if you are interested!

## Recap

I hope you like the new design, I will roll out this on all my sites and products in the future!

Thanks Manuel