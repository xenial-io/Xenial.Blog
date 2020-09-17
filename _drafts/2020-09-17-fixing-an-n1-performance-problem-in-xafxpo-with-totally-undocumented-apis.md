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