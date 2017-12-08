---
 layout: post 
 title: XAF best practices 2017
 comments: true
---

It's been a while since I blogged. The reason why I try to blog again was this [post](https://www.devexpress.com/Support/Center/Question/Details/T148978/how-to-measure-and-improve-the-application-s-performance#comment-22ceb33d-dc7c-439b-af68-fade58081a11) in the support forum. Especially about how I layout a XAF-Module in a real world scenario.

The most important thing i care about is code. I like to be explicit about code and discoverable things. So i don't like designer files and to much reflection magic.

This will be an ongoing series of posts, so stay tuned.

## Modules

No XAF-Application works without `Modules` so I'll think i start there.

XAF uses reflection to figure out a lot about your project, thats really cool to get started, but on the other hand it comes at a cost.
Performance and you need deep knowledge of the framework if something does not work as expected.

