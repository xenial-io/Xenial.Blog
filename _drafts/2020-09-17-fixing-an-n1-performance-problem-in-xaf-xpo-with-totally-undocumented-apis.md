---
 layout: post 
 title: Fixing an N+1 performance problem in XAF/XPO with totally undocumented APIs
 comments: true
 github: fixing-an-n-plus-1-perf-problem-in-xaf-xpo
 tags: ["XAF", "XPO", "Performance", "BestPractices", "ORM"]
---

We all know (or not) that using an abstraction over any kind of datasource can lead to performance problems. That's nothing new and is quite common with ORM's.

Let's look at the business problem we need to solve first before discussing why N+1 happens and what we can do to avoid it.
It's a quite common problem with relational databases, an especially when dealing with any ORM. So we need to be careful to avoid it and there are several options we have when dealing with that kind of problem.

## The scenario (is quite artificial but will serve the purpose)

Okay to be clear, this is an rather easy one and you don't want to go all the way down this performance optimization route (esp. for this example) but it's universial, easy to understand and applies to all 1+N aggregate calculation problems.

Let's imagine you have a simple `Offer` and `OfferItem` class that are in a `1 + N` relationship.

```txt
  Offer                       OfferItem
+-----------------+         +-----------------+
| OfferId         |         | OfferItemId     |
| Name (str)      |         |                 |
|                 |         |  Hours (int)    |
|                 +-------->+  FK_Offer       |
|                 |         |                 |
|                 |         |                 |
+-----------------+         +-----------------+
```

So let's imagine we want to calculate the sum of the hour's and display them in the offer's `ListView`. We have now several options and I will step through them from **naive** (slow) till **crazy** (fast). The last couple of techniques use some internals of XPO and are *not supported* by XPO, but I found them so useful so it would be a shame not not mention them.

> Be warned! Some of them will probably break in the future, or don't work under all circumstances. I will mark them with an disclaimer.

But first let's talk about what's the N+1 problem is all about!

### The N+1 problem

Object Relational Mappers (or ORM's for short) are a pattern to abstract away the database access and *project* SQL queries to objects. In our case that will be XPO that translate our access to the database.

To tell XPO about our database, we use attributes to specify relationships between entities. That allows XPO to *guess* what SQL statements it should generate. This is a very powerful abstraction, because you don't need to constantly think about SQL and can focus on business logic. That's fine for the most part but if the number of records grow (or tables and relationships get more complicated) that guess can go horribly wrong.

Expensive queries are also something that can occur with ORMs (like massive JOIN's) but that's not the focus of this blog post.

I'll give you a litte example in **very** naive C#.

> PLEASE NEVER DO SOMETHING LIKE THIS IN PRODUCTION. YOU HAVE BEEN WARNED. (Or I insist you NEED to book some consulting hour's from me)
