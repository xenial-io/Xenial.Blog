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

To tell XPO about our database we need to tell it some information about the database and it's relationship between entities with attributes. That allows XPO to *guess* what SQL statements it should generate. This is a very powerful abstraction to have, because you don't have to think all the time about SQL and can focus on business logic. That's fine for the most part but if the number of records grow (or tables and relationships get more complicated) that guess can horrible go wrong, or even worse, you give the wrong hint's to the ORM so it only can perform multiple queries to the database.

Expensive queries are also something that can occur with ORM's (like massive JOIN's) but that's not the focus of this blog post.

I'll give you a litte example in **very** naive C#.

> PLEASE NEVER DO SOMETHING LIKE THIS IN PRODUCTION. YOU HAVE BEEN WARNED. (Or I insist you NEED to [book some consulting hour's](https://www.delegate.at) from me)

```cs
    [DefaultClassOptions]
    [DefaultProperty(nameof(HourSum))]
    public class SlowOffer : BaseObject
    {
        public SlowOffer(Session session) : base(session) { }

        private string _Name;
        [Persistent("Name")]
        public string Name { get => _Name; set => SetPropertyValue(nameof(Name), ref _Name, value); }

        [NonPersistent]
        public int HourSum
        {
            get
            {
                var sum = 0;
                foreach (var item in OfferItems)
                {
                    sum += item.Hours;
                }
                return sum;
            }
        }

        [Association, Aggregated]
        public XPCollection<SlowOfferItem> OfferItems => GetCollection<SlowOfferItem>(nameof(OfferItems));
    }

    public class SlowOfferItem : BaseObject
    {
        public SlowOfferItem(Session session) : base(session) { }

        private int _Hours;
        [Persistent("Hours")]
        public int Hours { get => _Hours; set => SetPropertyValue(nameof(Hours), ref _Hours, value); }

        private SlowOffer _SlowOffer;
        [Persistent("SlowOffer"), Association]
        public SlowOffer SlowOffer { get => _SlowOffer; set => SetPropertyValue(nameof(SlowOffer), ref _SlowOffer, value); }
    }

```

> For all examples I use 300 `Offers` with 1000 `OfferItems` each. It's sorted by the `HourSum` property acending. I use SqlServer LocalDb for this tests on a Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz with 16 GB of memory and 2 disk SSD Raid 0 arangement.

This will result in horrible performance:

```txt
18.09.20 16:22:13.906 Executing sql 'select N0."Oid",N0."Name",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOffer" N0 where N0."GCRecord" is null'
18.09.20 16:22:13.908 Result: rowcount = 300, total = 11996, N0.{Oid,Guid} = 4800, N0.{Name,String} = 4796, N0.{OptimisticLockField,Int32} = 1200, N0.{GCRecord,Int32} = 1200
18.09.20 16:22:13.913 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOffer",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItem" N0 where (N0."GCRecord" is null and (N0."SlowOffer" = @p0))' with parameters {a786412c-907d-4b36-beb6-004395d38e9d}
18.09.20 16:22:13.927 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOffer,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000
18.09.20 16:22:13.931 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOffer",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItem" N0 where (N0."GCRecord" is null and (N0."SlowOffer" = @p0))' with parameters {cf656095-dcd6-46f1-b830-00af607693a9}
18.09.20 16:22:13.949 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOffer,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000
.
.
.
.
18.09.20 16:22:20.036 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOffer",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItem" N0 where (N0."GCRecord" is null and (N0."SlowOffer" = @p0))' with parameters {0be207ec-9430-44e7-964c-fd684303d051}
18.09.20 16:22:20.053 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOffer,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000
18.09.20 16:22:20.057 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOffer",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItem" N0 where (N0."GCRecord" is null and (N0."SlowOffer" = @p0))' with parameters {3b48cf0a-d610-4586-8dfb-fde802777653}
18.09.20 16:22:20.078 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOffer,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000
18.09.20 16:22:20.122 Executing sql 'select top 1 count(*) from "dbo"."SlowOffer" N0 where N0."GCRecord" is null'
18.09.20 16:22:20.126 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
18.09.20 16:22:20.127 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferItem" N0 where N0."GCRecord" is null'
18.09.20 16:22:20.170 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
```

What happens is: for every row in the `Orders` table a second select that selects all the related `OrderItems` collection get selected one by one. So in total there are at least 300 single `SELECT * from OrderItem where OrderId = X` statements dropped at your database.

Of course this happens because to sort the table on the client side, XPO needs to fetch all the records to order them.

To see some comparison:

1. Sort by `Name`: 0.814 seconds
2. Sort by `HourSum`: 6.622 seconds

The only reason why sorting by name is a lot faster is, that only the visible rows in the grid will be N+1 selected.

> I am not doing any memory analysis here, but of course this approach will take a lot of memory as well, because XPO needs to fetch all the data into memory before it can do any sorting on it.

If you don't sort by `HourSum` and scroll down the list, you will have a noticible lag when scrolling the list. This is caused by XPO lazy load collections by default.

