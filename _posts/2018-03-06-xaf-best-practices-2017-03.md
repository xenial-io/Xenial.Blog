---
 layout: post 
 title: XAF best practices 2017-03
 comments: true
 tags: ["DevExpress", "XAF", "BestPractices"]
---

In my last post we had a look how I like to implement `BusinessObjects` and a simple editor. In this post I will focus on one of the main areas for writing custom code: `Controllers` and `Actions`.

## Controllers

As you know there are normally 2 types of Controllers. ViewControllers and WindowControllers. Thats very basic and not that accurate for a real application. Most of the time you deal with different types of things in an application. BusinessLogic, view, state and so on.  
Most of the applications i saw did a really bad job when it's about seperating all this concernces. So let's have a look at `ViewControllers` first.

First of all: delete those stupid designer files. They will haunt you later on.

### ViewControllers

If you implement BusinessLogic most of the controllers will fit for one Type of BusinessObject. This is especially true for controllers with `Actions`.

Normally i like to call them BusinessObjectViewController, this is a good descriptive name for them (if they act for List and DetailViews and a single BusinessObject).

So let's have a look:

