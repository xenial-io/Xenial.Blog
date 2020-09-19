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

Okay to be clear, this is an rather easy one and you don't want to go all the way down this performance optimization route (esp. for this example) but it's universal, easy to understand and applies to all 1+N aggregate calculation problems.

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

> Be warned! Some of them will probably break in the future, or don't work under all circumstances. I will mark them with a disclaimer.

But first let's talk about what's the N+1 problem is all about!

### The N+1 problem

Object Relational Mappers (or ORM for short) are a pattern to abstract away the database access and *project* SQL queries to objects. In our case it will be XPO that translates our access to the database.

To tell XPO about our database we need to tell it some information about the database and it's relationship between entities with attributes. That allows XPO to *guess* what SQL statements it should generate. This is a very powerful abstraction to have, because you don't have to think all the time about SQL and can focus on business logic. That's fine for the most part but if the number of records grow (or tables and relationships get more complicated) that guess can horrible go wrong, or even worse, you give the wrong hint's to the ORM so it only can perform multiple queries to the database.
To tell XPO about our database, we use attributes to specify relationships between entities. That allows XPO to *guess* what SQL statements it should generate. This is a very powerful abstraction, because you don't need to constantly think about SQL and can focus on business logic. That's fine for the most part but if the number of records grow (or tables and relationships get more complicated) that guess can go horribly wrong.

Expensive queries are also something that can occur with ORMs (like massive JOINs) but that's not the focus of this blog post.

I'll give you a litte example in **very** naive C#.

> PLEASE NEVER DO SOMETHING LIKE THIS IN PRODUCTION. YOU HAVE BEEN WARNED. (Or I insist you NEED to [book some consulting hours](https://www.delegate.at) with me)

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

> For all examples I use 300 `Offers` with 1000 `OfferItems` each. It's sorted by the `HourSum` property ascending. I use SqlServer LocalDb for these tests on a Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz with 16 GB of memory and a two SSD disks Raid 0 setup.  
The build configuration is set on Debug with an attached debugger.  
XPO log verbosity = 4  
XAF log verbosity = 3  
This means those numbers *will increase in Release* configuration, so we setting the base line pessimistic (and also aim for an better developer feedback cycle).

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

### Linq to the rescue?

You might be tempted to say: "Why not use the power of Linq?". So let's look at some code.

```cs
[DefaultClassOptions]
[DefaultProperty(nameof(HourSum))]
public class SlowOfferWithLinq : BaseObject
{
    public SlowOfferWithLinq(Session session) : base(session) { }

    private string _Name;
    [Persistent("Name")]
    public string Name { get => _Name; set => SetPropertyValue(nameof(Name), ref _Name, value); }

    [NonPersistent]
    // Sum up all the hours using Linq
    public int HourSum => OfferItems.Sum(m => m.Hours);

    [Association, Aggregated]
    public XPCollection<SlowOfferItemWithLinq> OfferItems => GetCollection<SlowOfferItemWithLinq>(nameof(OfferItems));
}

public class SlowOfferItemWithLinq : BaseObject
{
    public SlowOfferItemWithLinq(Session session) : base(session) { }

    private int _Hours;
    [Persistent("Hours")]
    public int Hours { get => _Hours; set => SetPropertyValue(nameof(Hours), ref _Hours, value); }

    private SlowOfferWithLinq _SlowOfferWithLinq;
    [Persistent("SlowOfferWithLinq"), Association]
    public SlowOfferWithLinq SlowOfferWithLinq { get => _SlowOfferWithLinq; set => SetPropertyValue(nameof(SlowOfferWithLinq), ref _SlowOfferWithLinq, value); }
}
```

Let's look at the queries generated:

```txt
19.09.20 10:35:31.422 Executing sql 'select N0."Oid",N0."Name",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferWithLinq" N0 where N0."GCRecord" is null'
19.09.20 10:35:31.425 Result: rowcount = 300, total = 11914, N0.{Oid,Guid} = 4800, N0.{Name,String} = 4714, N0.{OptimisticLockField,Int32} = 1200, N0.{GCRecord,Int32} = 1200
19.09.20 10:35:31.426 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOfferWithLinq",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItemWithLinq" N0 where (N0."GCRecord" is null and (N0."SlowOfferWithLinq" = @p0))' with parameters {a917fb15-82e1-471e-95b3-031a070d492d}
19.09.20 10:35:31.440 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOfferWithLinq,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000
19.09.20 10:35:31.451 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOfferWithLinq",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItemWithLinq" N0 where (N0."GCRecord" is null and (N0."SlowOfferWithLinq" = @p0))' with parameters {b625d838-3747-4ad4-aaac-032e79a7d3a6}
19.09.20 10:35:31.464 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOfferWithLinq,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000.
.
.
.
19.09.20 10:35:36.787 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOfferWithLinq",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItemWithLinq" N0 where (N0."GCRecord" is null and (N0."SlowOfferWithLinq" = @p0))' with parameters {e2774f41-7d31-4a5f-afa4-ffe8d3a21d47}
19.09.20 10:35:36.803 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOfferWithLinq,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000
19.09.20 10:35:36.851 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferWithLinq" N0 where N0."GCRecord" is null'
19.09.20 10:35:36.853 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 10:35:36.854 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferItemWithLinq" N0 where N0."GCRecord" is null'
19.09.20 10:35:36.877 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
```

This results in the following performance

1. Sort by `Name`: 0.735 seconds
2. Sort by `HourSum`: 5.672 seconds

As you can see, it seams like it performs slightly faster, but on average it is exactly the same as the naive approach.  
The reason for this is hard to spot (and that is why *lazy loading can be dangerous*, if you don't know what you are doing):

```cs
[NonPersistent]
// Sum up all the hours using Linq
public int HourSum => OfferItems.Sum(m => m.Hours);
```

We first load the entire collection and sum up after wards in memory. The reason for this is pretty simple by looking at the datatype of `OfferItems`.
It's a `XPCollection<SlowOfferItemWithLinq>`. In order to let the database the work, we need to make sure we work with an `IQueryable<SlowOfferItemWithLinq>`.

### Linq to the rescue with IQueryable

Know we know what we should aim for let's look at a Linq version of the code that uses an `IQueryable`:

```cs
[DefaultClassOptions]
[DefaultProperty(nameof(HourSum))]
public class FasterOfferWithLinq : BaseObject
{
    public FasterOfferWithLinq(Session session) : base(session) { }

    private string _Name;
    [Persistent("Name")]
    public string Name { get => _Name; set => SetPropertyValue(nameof(Name), ref _Name, value); }

    [NonPersistent]
    public int HourSum =>
        //Query the data store
        Session.Query<FasterOfferItemWithLinq>()
        //Filter it down to the current record
        .Where(i => i.FasterOfferWithLinq.Oid == Oid)
        //Sum the total hours
        .Sum(m => m.Hours);

    [Association, Aggregated]
    public XPCollection<FasterOfferItemWithLinq> OfferItems => GetCollection<FasterOfferItemWithLinq>(nameof(OfferItems));
}

public class FasterOfferItemWithLinq : BaseObject
{
    public FasterOfferItemWithLinq(Session session) : base(session) { }

    private int _Hours;
    [Persistent("Hours")]
    public int Hours { get => _Hours; set => SetPropertyValue(nameof(Hours), ref _Hours, value); }

    private FasterOfferWithLinq _FasterOfferWithLinq;
    [Persistent("FasterOfferWithLinq"), Association]
    public FasterOfferWithLinq FasterOfferWithLinq { get => _FasterOfferWithLinq; set => SetPropertyValue(nameof(FasterOfferWithLinq), ref _FasterOfferWithLinq, value); }
}
```

This will result in much leaner queries. Still does not solve the N+1 problem though:

```txt
19.09.20 10:58:05.069 Executing sql 'select N0."Oid",N0."Name",N0."OptimisticLockField",N0."GCRecord" from "dbo"."FasterOfferWithLinq" N0 where N0."GCRecord" is null'
19.09.20 10:58:05.070 Result: rowcount = 300, total = 11992, N0.{Oid,Guid} = 4800, N0.{Name,String} = 4792, N0.{OptimisticLockField,Int32} = 1200, N0.{GCRecord,Int32} = 1200
19.09.20 10:58:05.071 Executing sql 'select top 1 sum(N0."Hours") from "dbo"."FasterOfferItemWithLinq" N0 where (N0."GCRecord" is null and (N0."FasterOfferWithLinq" = @p0))' with parameters {a3797700-1fcf-429f-9c34-005322afa892}
19.09.20 10:58:05.075 Result: rowcount = 1, total = 4, SubQuery(Sum,N0.{Hours,Int32},) = 4
19.09.20 10:58:05.076 Executing sql 'select top 1 sum(N0."Hours") from "dbo"."FasterOfferItemWithLinq" N0 where (N0."GCRecord" is null and (N0."FasterOfferWithLinq" = @p0))' with parameters {3683bfc2-7314-452f-be51-00692f123965}
.
.
.
19.09.20 10:58:06.497 Executing sql 'select top 1 count(*) from "dbo"."FasterOfferWithLinq" N0 where N0."GCRecord" is null'
19.09.20 10:58:06.497 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 10:58:06.498 Executing sql 'select top 1 count(*) from "dbo"."FasterOfferItemWithLinq" N0 where N0."GCRecord" is null'
19.09.20 10:58:06.512 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 10:58:07.919 Executing sql 'select top 1 sum(N0."Hours") from "dbo"."FasterOfferItemWithLinq" N0 where (N0."GCRecord" is null and (N0."FasterOfferWithLinq" = @p0))' with parameters {820161dc-8568-412c-bf84-c4f148e8122f}
19.09.20 10:58:07.924 Result: rowcount = 1, total = 4, SubQuery(Sum,N0.{Hours,Int32},) = 4
```

This results in the following performance

1. Sort by `Name`: 0.156 seconds
2. Sort by `HourSum`: 1.554 seconds

As you can see, it performs a lot better. And for the *most parts* of your application this will be totally fine (esp. if you arn't dealing with too much records, or lists that arn't used that frequently).
The memory footprint of this method is also a lot better.

### PersistentAlias can perform better?

XPO has a feature called `PersistentAlias`. This allows you to specify an aggregate criteria that *can* be applied directly to the database:

```cs
[DefaultClassOptions]
[DefaultProperty(nameof(HourSum))]
public class SlowOfferWithPersistentAlias : BaseObject
{
    public SlowOfferWithPersistentAlias(Session session) : base(session) { }

    private string _Name;
    [Persistent("Name")]
    public string Name { get => _Name; set => SetPropertyValue(nameof(Name), ref _Name, value); }

    //Calculate the sum on the server side
    [PersistentAlias("OfferItems.Sum([Hours])")]
    //Tell XPO to calculate the alias when accessed client side or from code
    public int HourSum => (int)EvaluateAlias(nameof(HourSum));

    [Association, Aggregated]
    public XPCollection<SlowOfferItemWithPersistentAlias> OfferItems => GetCollection<SlowOfferItemWithPersistentAlias>(nameof(OfferItems));
}

public class SlowOfferItemWithPersistentAlias : BaseObject
{
    public SlowOfferItemWithPersistentAlias(Session session) : base(session) { }

    private int _Hours;
    [Persistent("Hours")]
    public int Hours { get => _Hours; set => SetPropertyValue(nameof(Hours), ref _Hours, value); }

    private SlowOfferWithPersistentAlias _SlowOfferWithPersistentAlias;
    [Persistent("SlowOfferWithPersistentAlias"), Association]
    public SlowOfferWithPersistentAlias SlowOfferWithPersistentAlias { get => _SlowOfferWithPersistentAlias; set => SetPropertyValue(nameof(SlowOfferWithPersistentAlias), ref _SlowOfferWithPersistentAlias, value); }
}
```

But wait this will perform the same as the second 2 attemts?

```txt
19.09.20 11:20:27.738 Executing sql 'select N0."Oid",N0."Name",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 11:20:27.739 Result: rowcount = 300, total = 12048, N0.{Oid,Guid} = 4800, N0.{Name,String} = 4848, N0.{OptimisticLockField,Int32} = 1200, N0.{GCRecord,Int32} = 1200
19.09.20 11:20:27.740 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOfferWithPersistentAlias",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItemWithPersistentAlias" N0 where (N0."GCRecord" is null and (N0."SlowOfferWithPersistentAlias" = @p0))' with parameters {11328106-f965-495d-89d0-00896fa631a1}
19.09.20 11:20:27.755 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOfferWithPersistentAlias,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000
.
.
.
19.09.20 11:20:33.695 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOfferWithPersistentAlias",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItemWithPersistentAlias" N0 where (N0."GCRecord" is null and (N0."SlowOfferWithPersistentAlias" = @p0))' with parameters {926fde40-af9c-4679-bdf9-fe0edcc49465}
19.09.20 11:20:33.718 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOfferWithPersistentAlias,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000
19.09.20 11:20:33.789 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 11:20:33.790 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 11:20:33.790 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferItemWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 11:20:33.805 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
```

This results in the following performance

1. Sort by `Name`: 0.671 seconds
2. Sort by `HourSum`: 6.501 seconds

But why is that? XAF will load data according to the `DataAccessMode` property of the `ListView`. Until now we always used the `Client` mode. Which is fine for the most part. It's the most convinient to use cause you *almost never*  need to think about the underlying database.  
That also means, it will do the calculation client side, which will result in the same queries as we know from the *naive* approach.

### PersistentAlias performs better with the correct DataAccessMode

We have several options [provided by XAF](https://docs.devexpress.com/eXpressAppFramework/113683/concepts/ui-construction/views/list-view-data-access-modes) to change the behavior how data will be loaded. I will list them in the order they where introduced in the framework. Every mode has it's own strenghts and weaknesses. I'll only look into the performance right now. Programming model varies between those and i will skip `Client` cause we looked at it before. The source code is exactly the same before. To change the `DataAccessMode` we change it's property in the `ModelEditor`.

#### ServerMode

In `ServerMode` only a fixed amount of records are fetched from the database, as well as including the sorting query and some support queries. Afterwards objects are fetched on demand.

```txt
19.09.20 11:55:45.275 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 11:55:45.275 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 11:55:45.276 Executing sql 'select top 201 N0."Oid" from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null order by (select sum(N1."Hours") as Res0 from "dbo"."SlowOfferItemWithPersistentAlias" N1 where ((N0."Oid" = N1."SlowOfferWithPersistentAlias") and N1."GCRecord" is null)) asc,N0."Oid" asc'
19.09.20 11:55:45.350 Result: rowcount = 201, total = 3216, N0.{Oid,Guid} = 3216
19.09.20 11:55:45.351 Executing sql 'select N0."Oid",N0."Name",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferWithPersistentAlias" N0 where (N0."GCRecord" is null and N0."Oid" in (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12,@p13,@p14,@p15,@p16,@p17,@p18,@p19,@p20,@p21,@p22,@p23,@p24,@p25,@p26,@p27,@p28,@p29,@p30,@p31,@p32,@p33,@p34,@p35,@p36,@p37,@p38,@p39,@p40,@p41,@p42,@p43,@p44,@p45,@p46,@p47,@p48,@p49,@p50,@p51,@p52,@p53,@p54))' with parameters {46ba6afd-f256-4022-bdea-fd2b2f782897},{896bab8f-fa1c-49c3-86b2-bdd402cf5d6f},{06fdb101-b631-400e-8059-b43045f9ade7},{98bb7226-34a0-4c28-b98a-01eb912f4301},{b757538f-e23b-46d9-b7c8-418d994948cf},{d207b29b-34f7-45ce-9b9b-3e43b3408de0},{e8e101ee-2436-4e86-9793-4308df454f6a},{677e53ad-fc8a-42ed-bdf1-e95d6350597c},{60a66648-e6a7-4db3-a266-76e97b6c9171},{be27ddc1-007a-47ff-80b2-94aaeda390db},{807f0630-ba67-41c2-9026-423ac510af28},{08fdb2eb-17bd-421b-9a30-5b1db7deb448},{3e3a847b-b072-410e-94d6-313124b40595},{0255aa9d-3aa2-416d-9f8b-d39b35ff7c59},{7400844e-cbf5-4866-ac00-be4dc82ac653},{0c8329a0-922f-4ed7-8d2a-f29387aa2485},{525c181e-4450-4047-a05e-30cffe6f74b4},{31eb5424-eca8-499e-b9fc-1ce195e81aaf},{aaaa2941-6ca1-408f-a1b5-a3363254ab20},{e05a4e80-e819-4489-a7c6-7aee929586e5},{7ebf89ce-4cd7-4ee6-8662-3444189c6f49},{39b8582f-18b0-4c1a-a892-af2ee642d017},{20551f64-26dc-44e3-a9fe-d9a53df42858},{378601c5-451b-4599-a935-1503632e6413},{97df3ae0-cbf7-4ac5-93e4-2d72e3ed0cb8},{02ab7573-1849-45f9-9bd0-af2eb6ee7e3d},{b10af579-5171-4cb7-b13c-d1d2c1f37614},{960ca321-aafc-4e6d-b3cd-eeac065097e6},{dedd0dd3-df7e-442b-b04a-e7104c92e246},{b9c19c80-bc6d-4187-8966-4cc7a9f0682f},{98051335-1cae-4cc3-9390-2bd01f4ce45d},{b4c0d5ab-cc8c-4d7b-af75-8e10ebc326c6},{c3ac8db8-a6bc-401e-b3fd-a4c421aa5da4},{53e1f977-9358-417d-9cc1-7f19730e37e7},{aa278ed8-ae87-4ae7-ba1a-f46d59fea054},{1a57b4dc-7812-48cc-83ae-15e184078c5f},{b1165266-f7f6-4fa8-bc61-d03fe5ad3189},{aa04ab5e-f414-4675-8742-09da704fc4ee},{e6f0323a-b777-4d3c-a090-eb843c21acb2},{58b240fe-bf88-40c0-a9b2-04a1c2c9b04c},{56abca80-57e2-4428-ae3c-098eb55a2069},{96f5d400-8ecd-4ac8-81c2-c60d409a0094},{3ac64779-7525-49fb-9b7c-08b5717d18ed},{c377feef-827a-40b3-a0ef-dc27cd4590b1},{fbaf10e8-6f37-4c82-b7f8-dd32858a5753},{d1f4f800-38bb-411c-87ec-f126ddf2fe09},{1298bbe6-efb6-4130-b9d3-a7dedef6f117},{e50d3230-1c90-49b9-8da3-4f5ec30b0806},{7e214d03-8c0f-4903-af70-3e9a41a0b5a1},{5e262430-d280-4edb-80b9-4794b25c1ded},{25e83824-44eb-4bba-aa3f-520e67de57d9},{d437d3ac-05cf-461e-80b2-dc2ce22469af},{80486b18-ac04-4915-9747-302621271374},{2b0c980d-4643-4d6a-8632-9dca0634f171},{8a48a310-81a1-4114-8f3f-5d7897ab7ca7}
19.09.20 11:55:45.352 Result: rowcount = 55, total = 2228, N0.{Oid,Guid} = 880, N0.{Name,String} = 908, N0.{OptimisticLockField,Int32} = 220, N0.{GCRecord,Int32} = 220
19.09.20 11:55:45.354 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOfferWithPersistentAlias",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItemWithPersistentAlias" N0 where (N0."GCRecord" is null and (N0."SlowOfferWithPersistentAlias" = @p0))' with parameters {46ba6afd-f256-4022-bdea-fd2b2f782897}
19.09.20 11:55:45.372 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOfferWithPersistentAlias,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000
.
.
.
19.09.20 11:55:46.007 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOfferWithPersistentAlias",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItemWithPersistentAlias" N0 where (N0."GCRecord" is null and (N0."SlowOfferWithPersistentAlias" = @p0))' with parameters {1a57b4dc-7812-48cc-83ae-15e184078c5f}
19.09.20 11:55:46.019 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOfferWithPersistentAlias,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000
19.09.20 11:55:46.026 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 11:55:46.027 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 11:55:46.028 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferItemWithPersistentAlias" N0 where N0."GCRecord" is null'
```

This results in the following performance

1. Sort by `Name`: 0.692 seconds
2. Sort by `HourSum`: 0.741 seconds

#### DataView

In `DataView` mode only visible columns are fetched from the database, as well as including the sorting query and some support queries. All records will be fetched in one query

```txt
19.09.20 12:03:31.738 Executing sql 'select top 2147483647 (select sum(N1."Hours") as Res0 from "dbo"."SlowOfferItemWithPersistentAlias" N1 where ((N0."Oid" = N1."SlowOfferWithPersistentAlias") and N1."GCRecord" is null)),N0."Name",N0."Oid" from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 12:03:31.821 Result: rowcount = 300, total = 10848, SubQuery(Sum,N1.{Hours,Int32},Select N1.{Hours,Int32}
  from "SlowOfferItemWithPersistentAlias" N1
 where N0.{Oid,Guid} = N1.{SlowOfferWithPersistentAlias,Guid} And N1.{GCRecord,Int32} Is Null) = 1200, N0.{Name,String} = 4848, N0.{Oid,Guid} = 4800
19.09.20 12:03:31.824 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 12:03:31.825 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 12:03:31.825 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferItemWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 12:03:31.839 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
```

This results in the following performance

1. Sort by `Name`: 0.071 seconds
2. Sort by `HourSum`: 0.078 seconds

#### InstantFeedback

In `InstantFeedback` mode records are loaded in an async manor. It operates almost the same as the `ServerMode` in terms of number of queries, but the user experience is much better, cause visible records will be fetched in the background.

```txt
19.09.20 12:08:07.766 Result: rowcount = 8, total = 2260, N0.{OID,Int32} = 32, N0.{TypeName,String} = 1412, N0.{AssemblyName,String} = 816
19.09.20 12:08:07.766 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 12:08:07.766 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 12:08:07.768 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 12:08:07.769 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 12:08:07.769 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferItemWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 12:08:07.788 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 12:08:07.862 Executing sql 'select top 201 N0."Oid" from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null order by (select sum(N1."Hours") as Res0 from "dbo"."SlowOfferItemWithPersistentAlias" N1 where ((N0."Oid" = N1."SlowOfferWithPersistentAlias") and N1."GCRecord" is null)) asc,N0."Oid" asc'
19.09.20 12:08:07.936 Result: rowcount = 201, total = 3216, N0.{Oid,Guid} = 3216
19.09.20 12:08:07.937 Executing sql 'select N0."Oid",N0."Name",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferWithPersistentAlias" N0 where (N0."GCRecord" is null and N0."Oid" in (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12,@p13,@p14,@p15,@p16,@p17,@p18,@p19,@p20,@p21,@p22,@p23,@p24,@p25,@p26,@p27,@p28,@p29,@p30,@p31,@p32,@p33,@p34,@p35,@p36,@p37,@p38,@p39,@p40,@p41,@p42,@p43,@p44,@p45,@p46,@p47,@p48,@p49,@p50,@p51,@p52,@p53,@p54))' with parameters {46ba6afd-f256-4022-bdea-fd2b2f782897},{896bab8f-fa1c-49c3-86b2-bdd402cf5d6f},{06fdb101-b631-400e-8059-b43045f9ade7},{98bb7226-34a0-4c28-b98a-01eb912f4301},{b757538f-e23b-46d9-b7c8-418d994948cf},{d207b29b-34f7-45ce-9b9b-3e43b3408de0},{e8e101ee-2436-4e86-9793-4308df454f6a},{677e53ad-fc8a-42ed-bdf1-e95d6350597c},{60a66648-e6a7-4db3-a266-76e97b6c9171},{be27ddc1-007a-47ff-80b2-94aaeda390db},{807f0630-ba67-41c2-9026-423ac510af28},{08fdb2eb-17bd-421b-9a30-5b1db7deb448},{3e3a847b-b072-410e-94d6-313124b40595},{0255aa9d-3aa2-416d-9f8b-d39b35ff7c59},{7400844e-cbf5-4866-ac00-be4dc82ac653},{0c8329a0-922f-4ed7-8d2a-f29387aa2485},{525c181e-4450-4047-a05e-30cffe6f74b4},{31eb5424-eca8-499e-b9fc-1ce195e81aaf},{aaaa2941-6ca1-408f-a1b5-a3363254ab20},{e05a4e80-e819-4489-a7c6-7aee929586e5},{7ebf89ce-4cd7-4ee6-8662-3444189c6f49},{39b8582f-18b0-4c1a-a892-af2ee642d017},{20551f64-26dc-44e3-a9fe-d9a53df42858},{378601c5-451b-4599-a935-1503632e6413},{97df3ae0-cbf7-4ac5-93e4-2d72e3ed0cb8},{02ab7573-1849-45f9-9bd0-af2eb6ee7e3d},{b10af579-5171-4cb7-b13c-d1d2c1f37614},{960ca321-aafc-4e6d-b3cd-eeac065097e6},{dedd0dd3-df7e-442b-b04a-e7104c92e246},{b9c19c80-bc6d-4187-8966-4cc7a9f0682f},{98051335-1cae-4cc3-9390-2bd01f4ce45d},{b4c0d5ab-cc8c-4d7b-af75-8e10ebc326c6},{c3ac8db8-a6bc-401e-b3fd-a4c421aa5da4},{53e1f977-9358-417d-9cc1-7f19730e37e7},{aa278ed8-ae87-4ae7-ba1a-f46d59fea054},{1a57b4dc-7812-48cc-83ae-15e184078c5f},{b1165266-f7f6-4fa8-bc61-d03fe5ad3189},{aa04ab5e-f414-4675-8742-09da704fc4ee},{e6f0323a-b777-4d3c-a090-eb843c21acb2},{58b240fe-bf88-40c0-a9b2-04a1c2c9b04c},{56abca80-57e2-4428-ae3c-098eb55a2069},{96f5d400-8ecd-4ac8-81c2-c60d409a0094},{3ac64779-7525-49fb-9b7c-08b5717d18ed},{c377feef-827a-40b3-a0ef-dc27cd4590b1},{fbaf10e8-6f37-4c82-b7f8-dd32858a5753},{d1f4f800-38bb-411c-87ec-f126ddf2fe09},{1298bbe6-efb6-4130-b9d3-a7dedef6f117},{e50d3230-1c90-49b9-8da3-4f5ec30b0806},{7e214d03-8c0f-4903-af70-3e9a41a0b5a1},{5e262430-d280-4edb-80b9-4794b25c1ded},{25e83824-44eb-4bba-aa3f-520e67de57d9},{d437d3ac-05cf-461e-80b2-dc2ce22469af},{80486b18-ac04-4915-9747-302621271374},{2b0c980d-4643-4d6a-8632-9dca0634f171},{8a48a310-81a1-4114-8f3f-5d7897ab7ca7}
19.09.20 12:08:07.941 Result: rowcount = 55, total = 2228, N0.{Oid,Guid} = 880, N0.{Name,String} = 908, N0.{OptimisticLockField,Int32} = 220, N0.{GCRecord,Int32} = 220
19.09.20 12:08:07.942 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOfferWithPersistentAlias",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItemWithPersistentAlias" N0 where (N0."GCRecord" is null and (N0."SlowOfferWithPersistentAlias" = @p0))' with parameters {46ba6afd-f256-4022-bdea-fd2b2f782897}
19.09.20 12:08:07.960 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOfferWithPersistentAlias,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000
.
.
.
19.09.20 12:08:08.704 Executing sql 'select N0."Oid",N0."Hours",N0."SlowOfferWithPersistentAlias",N0."OptimisticLockField",N0."GCRecord" from "dbo"."SlowOfferItemWithPersistentAlias" N0 where (N0."GCRecord" is null and (N0."SlowOfferWithPersistentAlias" = @p0))' with parameters {1a57b4dc-7812-48cc-83ae-15e184078c5f}
19.09.20 12:08:08.718 Result: rowcount = 1000, total = 44000, N0.{Oid,Guid} = 16000, N0.{Hours,Int32} = 4000, N0.{SlowOfferWithPersistentAlias,Guid} = 16000, N0.{OptimisticLockField,Int32} = 4000, N0.{GCRecord,Int32} = 4000
```

This results in the following performance

First user interaction:

1. Sort by `Name`: 0.040 seconds
2. Sort by `HourSum`: 0.030 seconds

Visible data loaded:

1. Sort by `Name`: ~~0.800 seconds
2. Sort by `HourSum`: ~~0.800 seconds

### InstantFeedbackView

In `InstantFeedbackView` mode records are loaded in an async manor. It operates almost the same as the `DataView` mode in terms of number of queries, but the user experience **can be** much better, cause all records will be fetched in the background.

```txt
19.09.20 12:13:23.101 Executing sql 'select N0."OID",N0."TypeName",N0."AssemblyName" from "dbo"."XPObjectType" N0'
19.09.20 12:13:23.102 Result: rowcount = 8, total = 2260, N0.{OID,Int32} = 32, N0.{TypeName,String} = 1412, N0.{AssemblyName,String} = 816
19.09.20 12:13:23.103 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 12:13:23.104 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 12:13:23.106 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 12:13:23.106 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 12:13:23.107 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferItemWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 12:13:23.128 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 12:13:23.197 Executing sql 'select top 201 N0."Oid" from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null order by (select sum(N1."Hours") as Res0 from "dbo"."SlowOfferItemWithPersistentAlias" N1 where ((N0."Oid" = N1."SlowOfferWithPersistentAlias") and N1."GCRecord" is null)) asc,N0."Oid" asc'
19.09.20 12:13:23.277 Result: rowcount = 201, total = 3216, N0.{Oid,Guid} = 3216
19.09.20 12:13:23.278 Executing sql 'select N0."Name",N0."Oid",(select sum(N1."Hours") as Res0 from "dbo"."SlowOfferItemWithPersistentAlias" N1 where ((N0."Oid" = N1."SlowOfferWithPersistentAlias") and N1."GCRecord" is null)),(select sum(N2."Hours") as Res0 from "dbo"."SlowOfferItemWithPersistentAlias" N2 where ((N0."Oid" = N2."SlowOfferWithPersistentAlias") and N2."GCRecord" is null)),N0."Name",N0."Oid",(select sum(N3."Hours") as Res0 from "dbo"."SlowOfferItemWithPersistentAlias" N3 where ((N0."Oid" = N3."SlowOfferWithPersistentAlias") and N3."GCRecord" is null)) from "dbo"."SlowOfferWithPersistentAlias" N0 where (N0."GCRecord" is null and N0."Oid" in (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12,@p13,@p14,@p15,@p16,@p17,@p18,@p19,@p20,@p21,@p22,@p23,@p24,@p25,@p26,@p27,@p28,@p29,@p30,@p31,@p32,@p33,@p34,@p35,@p36,@p37,@p38,@p39,@p40,@p41,@p42,@p43,@p44,@p45,@p46,@p47,@p48,@p49,@p50,@p51,@p52,@p53,@p54))' with parameters {46ba6afd-f256-4022-bdea-fd2b2f782897},{896bab8f-fa1c-49c3-86b2-bdd402cf5d6f},{06fdb101-b631-400e-8059-b43045f9ade7},{98bb7226-34a0-4c28-b98a-01eb912f4301},{b757538f-e23b-46d9-b7c8-418d994948cf},{d207b29b-34f7-45ce-9b9b-3e43b3408de0},{e8e101ee-2436-4e86-9793-4308df454f6a},{677e53ad-fc8a-42ed-bdf1-e95d6350597c},{60a66648-e6a7-4db3-a266-76e97b6c9171},{be27ddc1-007a-47ff-80b2-94aaeda390db},{807f0630-ba67-41c2-9026-423ac510af28},{08fdb2eb-17bd-421b-9a30-5b1db7deb448},{3e3a847b-b072-410e-94d6-313124b40595},{0255aa9d-3aa2-416d-9f8b-d39b35ff7c59},{7400844e-cbf5-4866-ac00-be4dc82ac653},{0c8329a0-922f-4ed7-8d2a-f29387aa2485},{525c181e-4450-4047-a05e-30cffe6f74b4},{31eb5424-eca8-499e-b9fc-1ce195e81aaf},{aaaa2941-6ca1-408f-a1b5-a3363254ab20},{e05a4e80-e819-4489-a7c6-7aee929586e5},{7ebf89ce-4cd7-4ee6-8662-3444189c6f49},{39b8582f-18b0-4c1a-a892-af2ee642d017},{20551f64-26dc-44e3-a9fe-d9a53df42858},{378601c5-451b-4599-a935-1503632e6413},{97df3ae0-cbf7-4ac5-93e4-2d72e3ed0cb8},{02ab7573-1849-45f9-9bd0-af2eb6ee7e3d},{b10af579-5171-4cb7-b13c-d1d2c1f37614},{960ca321-aafc-4e6d-b3cd-eeac065097e6},{dedd0dd3-df7e-442b-b04a-e7104c92e246},{b9c19c80-bc6d-4187-8966-4cc7a9f0682f},{98051335-1cae-4cc3-9390-2bd01f4ce45d},{b4c0d5ab-cc8c-4d7b-af75-8e10ebc326c6},{c3ac8db8-a6bc-401e-b3fd-a4c421aa5da4},{53e1f977-9358-417d-9cc1-7f19730e37e7},{aa278ed8-ae87-4ae7-ba1a-f46d59fea054},{1a57b4dc-7812-48cc-83ae-15e184078c5f},{b1165266-f7f6-4fa8-bc61-d03fe5ad3189},{aa04ab5e-f414-4675-8742-09da704fc4ee},{e6f0323a-b777-4d3c-a090-eb843c21acb2},{58b240fe-bf88-40c0-a9b2-04a1c2c9b04c},{56abca80-57e2-4428-ae3c-098eb55a2069},{96f5d400-8ecd-4ac8-81c2-c60d409a0094},{3ac64779-7525-49fb-9b7c-08b5717d18ed},{c377feef-827a-40b3-a0ef-dc27cd4590b1},{fbaf10e8-6f37-4c82-b7f8-dd32858a5753},{d1f4f800-38bb-411c-87ec-f126ddf2fe09},{1298bbe6-efb6-4130-b9d3-a7dedef6f117},{e50d3230-1c90-49b9-8da3-4f5ec30b0806},{7e214d03-8c0f-4903-af70-3e9a41a0b5a1},{5e262430-d280-4edb-80b9-4794b25c1ded},{25e83824-44eb-4bba-aa3f-520e67de57d9},{d437d3ac-05cf-461e-80b2-dc2ce22469af},{80486b18-ac04-4915-9747-302621271374},{2b0c980d-4643-4d6a-8632-9dca0634f171},{8a48a310-81a1-4114-8f3f-5d7897ab7ca7}
19.09.20 12:13:23.524 Result: rowcount = 55, total = 4236, N0.{Name,String} = 908, N0.{Oid,Guid} = 880, SubQuery(Sum,N1.{Hours,Int32},Select N1.{Hours,Int32}
  from "SlowOfferItemWithPersistentAlias" N1
 where N0.{Oid,Guid} = N1.{SlowOfferWithPersistentAlias,Guid} And N1.{GCRecord,Int32} Is Null) = 220, SubQuery(Sum,N2.{Hours,Int32},Select N2.{Hours,Int32}
  from "SlowOfferItemWithPersistentAlias" N2
 where N0.{Oid,Guid} = N2.{SlowOfferWithPersistentAlias,Guid} And N2.{GCRecord,Int32} Is Null) = 220, N0.{Name,String} = 908, N0.{Oid,Guid} = 880, SubQuery(Sum,N3.{Hours,Int32},Select N3.{Hours,Int32}
  from "SlowOfferItemWithPersistentAlias" N3
 where N0.{Oid,Guid} = N3.{SlowOfferWithPersistentAlias,Guid} And N3.{GCRecord,Int32} Is Null) = 220
```

This results in the following performance

First user interaction:

1. Sort by `Name`: 0.006 seconds
2. Sort by `HourSum`: 0.007 seconds

Visible data loaded:

1. Sort by `Name`: ~~0.0300 seconds
2. Sort by `HourSum`: ~~0.400 seconds

### ServerView

In `ServerView` nide only a fixed amount of records are fetched from the database, as well as including the sorting query and some support queries. Afterwards visible columns are fetched on demand similar to the `DataView` but with pagination and visible columns support.

```txt
19.09.20 12:19:10.763 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 12:19:10.764 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 12:19:10.764 Executing sql 'select top 201 N0."Oid" from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null order by (select sum(N1."Hours") as Res0 from "dbo"."SlowOfferItemWithPersistentAlias" N1 where ((N0."Oid" = N1."SlowOfferWithPersistentAlias") and N1."GCRecord" is null)) asc,N0."Oid" asc'
19.09.20 12:19:10.832 Result: rowcount = 201, total = 3216, N0.{Oid,Guid} = 3216
19.09.20 12:19:10.834 Executing sql 'select (select sum(N1."Hours") as Res0 from "dbo"."SlowOfferItemWithPersistentAlias" N1 where ((N0."Oid" = N1."SlowOfferWithPersistentAlias") and N1."GCRecord" is null)),N0."Name",N0."Oid",N0."Oid",(select sum(N2."Hours") as Res0 from "dbo"."SlowOfferItemWithPersistentAlias" N2 where ((N0."Oid" = N2."SlowOfferWithPersistentAlias") and N2."GCRecord" is null)) from "dbo"."SlowOfferWithPersistentAlias" N0 where (N0."GCRecord" is null and N0."Oid" in (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12,@p13,@p14,@p15,@p16,@p17,@p18,@p19,@p20,@p21,@p22,@p23,@p24,@p25,@p26,@p27,@p28,@p29,@p30,@p31,@p32,@p33,@p34,@p35,@p36,@p37,@p38,@p39,@p40,@p41,@p42,@p43,@p44,@p45,@p46,@p47,@p48,@p49,@p50,@p51,@p52,@p53,@p54))' with parameters {46ba6afd-f256-4022-bdea-fd2b2f782897},{896bab8f-fa1c-49c3-86b2-bdd402cf5d6f},{06fdb101-b631-400e-8059-b43045f9ade7},{98bb7226-34a0-4c28-b98a-01eb912f4301},{b757538f-e23b-46d9-b7c8-418d994948cf},{d207b29b-34f7-45ce-9b9b-3e43b3408de0},{e8e101ee-2436-4e86-9793-4308df454f6a},{677e53ad-fc8a-42ed-bdf1-e95d6350597c},{60a66648-e6a7-4db3-a266-76e97b6c9171},{be27ddc1-007a-47ff-80b2-94aaeda390db},{807f0630-ba67-41c2-9026-423ac510af28},{08fdb2eb-17bd-421b-9a30-5b1db7deb448},{3e3a847b-b072-410e-94d6-313124b40595},{0255aa9d-3aa2-416d-9f8b-d39b35ff7c59},{7400844e-cbf5-4866-ac00-be4dc82ac653},{0c8329a0-922f-4ed7-8d2a-f29387aa2485},{525c181e-4450-4047-a05e-30cffe6f74b4},{31eb5424-eca8-499e-b9fc-1ce195e81aaf},{aaaa2941-6ca1-408f-a1b5-a3363254ab20},{e05a4e80-e819-4489-a7c6-7aee929586e5},{7ebf89ce-4cd7-4ee6-8662-3444189c6f49},{39b8582f-18b0-4c1a-a892-af2ee642d017},{20551f64-26dc-44e3-a9fe-d9a53df42858},{378601c5-451b-4599-a935-1503632e6413},{97df3ae0-cbf7-4ac5-93e4-2d72e3ed0cb8},{02ab7573-1849-45f9-9bd0-af2eb6ee7e3d},{b10af579-5171-4cb7-b13c-d1d2c1f37614},{960ca321-aafc-4e6d-b3cd-eeac065097e6},{dedd0dd3-df7e-442b-b04a-e7104c92e246},{b9c19c80-bc6d-4187-8966-4cc7a9f0682f},{98051335-1cae-4cc3-9390-2bd01f4ce45d},{b4c0d5ab-cc8c-4d7b-af75-8e10ebc326c6},{c3ac8db8-a6bc-401e-b3fd-a4c421aa5da4},{53e1f977-9358-417d-9cc1-7f19730e37e7},{aa278ed8-ae87-4ae7-ba1a-f46d59fea054},{1a57b4dc-7812-48cc-83ae-15e184078c5f},{b1165266-f7f6-4fa8-bc61-d03fe5ad3189},{aa04ab5e-f414-4675-8742-09da704fc4ee},{e6f0323a-b777-4d3c-a090-eb843c21acb2},{58b240fe-bf88-40c0-a9b2-04a1c2c9b04c},{56abca80-57e2-4428-ae3c-098eb55a2069},{96f5d400-8ecd-4ac8-81c2-c60d409a0094},{3ac64779-7525-49fb-9b7c-08b5717d18ed},{c377feef-827a-40b3-a0ef-dc27cd4590b1},{fbaf10e8-6f37-4c82-b7f8-dd32858a5753},{d1f4f800-38bb-411c-87ec-f126ddf2fe09},{1298bbe6-efb6-4130-b9d3-a7dedef6f117},{e50d3230-1c90-49b9-8da3-4f5ec30b0806},{7e214d03-8c0f-4903-af70-3e9a41a0b5a1},{5e262430-d280-4edb-80b9-4794b25c1ded},{25e83824-44eb-4bba-aa3f-520e67de57d9},{d437d3ac-05cf-461e-80b2-dc2ce22469af},{80486b18-ac04-4915-9747-302621271374},{2b0c980d-4643-4d6a-8632-9dca0634f171},{8a48a310-81a1-4114-8f3f-5d7897ab7ca7}
19.09.20 12:19:10.993 Result: rowcount = 55, total = 3108, SubQuery(Sum,N1.{Hours,Int32},Select N1.{Hours,Int32}
  from "SlowOfferItemWithPersistentAlias" N1
 where N0.{Oid,Guid} = N1.{SlowOfferWithPersistentAlias,Guid} And N1.{GCRecord,Int32} Is Null) = 220, N0.{Name,String} = 908, N0.{Oid,Guid} = 880, N0.{Oid,Guid} = 880, SubQuery(Sum,N2.{Hours,Int32},Select N2.{Hours,Int32}
  from "SlowOfferItemWithPersistentAlias" N2
 where N0.{Oid,Guid} = N2.{SlowOfferWithPersistentAlias,Guid} And N2.{GCRecord,Int32} Is Null) = 220
19.09.20 12:19:10.995 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 12:19:10.995 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 12:19:10.996 Executing sql 'select top 1 count(*) from "dbo"."SlowOfferItemWithPersistentAlias" N0 where N0."GCRecord" is null'
19.09.20 12:19:11.010 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
```

This results in the following performance

1. Sort by `Name`: 0.079 seconds
2. Sort by `HourSum`: 0.236 seconds

> **Important**: When using `PersistentAlias` for aggregate calculations always consider using a `DataAccessMode` that can perform database side calculation.  
There is no silverbullet and you need to measure careful in different configurations what fit's best.

All comes with a cost. All data access modes have [some limitations](https://docs.devexpress.com/eXpressAppFramework/113683/concepts/ui-construction/views/list-view-data-access-modes#non-persistent-object-support-limitations). If you need grouping and sorting capabilities by some fields (or even just display `NonPersistent` members) you are *out of luck*. It is also *may* be limited to the complexity you can fit into a single criteria.  

## Techniques that overcome the N+1 problems

Now we learned about the N+1 problem and some useful ways to overcome some of the performance problems that XAF provides we will cover 2 supported and 1 unsupported techniques how to avoid the N+1 problem completely.  
One that is database agnostic and one is not.

### CQRS pattern - XPO stored aggregates

CQRS stands for `Command-Query-Responsibility-Segregation`. It's a pattern to split the `Query` part (in our case the calculation of the total sums) from the `Command` part (e.g. handling with the order objects)

When dealing with statistics or calculated data, instead of calculating on the fly, we can calculate the data upfront. We can use several techniques to do that and it highly depends on your business needs.
It all depends on how *stale* data is allowed to be. This is not a performance discussion though. You need to talk to your business on the right strategy for that.

> I'm not going into all details on every single technique on CQRS.  
If you are interested on more powerful techniques on this let me know in the comments below.

Imagine we store the sum of every order everytime an `Order` is saved. We will store that data in a separate table to keep our `Query` part from the `Command` part. With XPO it's quite easy to do that, cause we have a single point of truth for updating the `Query` table:

```cs
[DefaultClassOptions]
public class FasterOfferWithCQRS : BaseObject
{
    public FasterOfferWithCQRS(Session session) : base(session) { }

    protected override void OnSaving()
    {
        //Find the related query record, delete it if we are deleted
        //create a new one if not found
        //copy the properties and the sum
        //We do that in transaction to avoid duplicates
        var query = Session.FindObject<FasterOfferWithCQRSQuery>(PersistentCriteriaEvaluationBehavior.InTransaction, new BinaryOperator(nameof(FasterOfferWithCQRSQuery.FasterOfferWithCQRS), this, BinaryOperatorType.Equal));

        if (IsDeleted && query != null)
        {
            Session.Delete(query);
        }
        if (query == null)
        {
            query = new FasterOfferWithCQRSQuery(Session);
        }
        if (query != null)
        {
            query.FasterOfferWithCQRS = this;
            query.Name = Name;
            query.HourSum = OfferItems.Sum(o => o.Hours);
        }
        base.OnSaving();
    }

    private string _Name;
    [Persistent("Name")]
    public string Name { get => _Name; set => SetPropertyValue(nameof(Name), ref _Name, value); }

    [Association, Aggregated]
    public XPCollection<FasterOfferItemWithCQRS> OfferItems => GetCollection<FasterOfferItemWithCQRS>(nameof(OfferItems));
}

public class FasterOfferItemWithCQRS : BaseObject
{
    public FasterOfferItemWithCQRS(Session session) : base(session) { }

    protected override void OnSaving()
    {
        //Mark the parent as saved, if we change
        FasterOfferWithCQRS?.Save();
        base.OnSaving();
    }

    protected override void OnDeleting()
    {
        //Mark the parent as saved, even if we are deleted
        FasterOfferWithCQRS?.Save();
        base.OnDeleting();
    }

    private int _Hours;
    [Persistent("Hours")]
    public int Hours { get => _Hours; set => SetPropertyValue(nameof(Hours), ref _Hours, value); }

    private FasterOfferWithCQRS _FasterOfferWithCQRS;
    [Persistent("FasterOfferWithCQRS"), Association]
    public FasterOfferWithCQRS FasterOfferWithCQRS { get => _FasterOfferWithCQRS; set => SetPropertyValue(nameof(FasterOfferWithCQRS), ref _FasterOfferWithCQRS, value); }
}

[DefaultProperty(nameof(HourSum))]
public class FasterOfferWithCQRSQuery : BaseObject
{
    public FasterOfferWithCQRSQuery(Session session) : base(session) { }

    private FasterOfferWithCQRS _FasterOfferWithCQRS;
    [Persistent("FasterOfferWithCQRS")]
    [MemberDesignTimeVisibility(false)] //We don't want to see the data in the view, we only want the reference as a foreign key
    //Save the reference for comparison. We also can use a unique index on this if needed, but we omit that for simplicity
    public FasterOfferWithCQRS FasterOfferWithCQRS { get => _FasterOfferWithCQRS; set => SetPropertyValue(nameof(FasterOfferWithCQRS), ref _FasterOfferWithCQRS, value); }

    private string _Name;
    [Persistent("Name")]
    public string Name { get => _Name; set => SetPropertyValue(nameof(Name), ref _Name, value); }

    private int _HourSum;
    [Persistent("HourSum")]
    public int HourSum { get => _HourSum; set => SetPropertyValue(nameof(HourSum), ref _HourSum, value); }
}
```

> **Important**: this only covers this very basic example, and highly depends on your configuration (e.g. SecuriySystem, Defered deletion etc.). You will need good testing on that to not get stale or out of sync.  
Database side foreignkeys can help to mark stale objects, as well as triggers to handle that on a database level.  
Also this *simple* technique only works if you are the only on that writes into the database.  
I will cover mode advanced scenarios in the future, just let me know in the comments below.

This will result in a slower write performance for the `Order` but a **huge** speed improvment on the `Query` table. I've set the `DataAccessMode` of the `Query` table to `DataView` and left the `DataAccessMode` for the `OrderTable` in `Client` mode:

`Order`:

```txt
19.09.20 13:39:21.249 Executing sql 'select N0."Oid",N0."Name",N0."OptimisticLockField",N0."GCRecord" from "dbo"."FasterOfferWithCQRS" N0 where N0."GCRecord" is null'
19.09.20 13:39:21.250 Result: rowcount = 300, total = 11996, N0.{Oid,Guid} = 4800, N0.{Name,String} = 4796, N0.{OptimisticLockField,Int32} = 1200, N0.{GCRecord,Int32} = 1200
19.09.20 13:39:21.264 Executing sql 'select top 1 count(*) from "dbo"."FasterOfferWithCQRS" N0 where N0."GCRecord" is null'
19.09.20 13:39:21.265 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 13:39:21.266 Executing sql 'select top 1 count(*) from "dbo"."FasterOfferItemWithCQRS" N0 where N0."GCRecord" is null'
19.09.20 13:39:21.309 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
```

This results in the following performance

1. Sort by `Name`: 0.014 seconds

> *Hint*: we can still provide an `NonPersistent` `HourSum` field in the `Order` class, but make sure users can't display, filter, group by this field in any `ListView`. In `DetailViews` this should not be a huge performance penalty.

`Query`:

```txt
19.09.20 13:40:32.895 Executing sql 'select top 2147483647 N0."HourSum",N0."Name",N0."Oid" from "dbo"."FasterOfferWithCQRSQuery" N0 where N0."GCRecord" is null'
19.09.20 13:40:32.896 Result: rowcount = 300, total = 10796, N0.{HourSum,Int32} = 1200, N0.{Name,String} = 4796, N0.{Oid,Guid} = 4800
19.09.20 13:40:32.900 Executing sql 'select top 1 count(*) from "dbo"."FasterOfferWithCQRSQuery" N0 where N0."GCRecord" is null'
19.09.20 13:40:32.900 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
```

This results in the following performance

1. Sort by `Name`: 0.005 seconds
2. Sort by `HourSum`: 0.004 seconds

> **Important**: This will of course result in data duplication and use more disk space.  
Keep that in mind when designing your datacenter.  
It also will slow down bulk inserts, cause a lot of more records need to be created.

### Use the database at your advantage - Views

Until now every technique we used does not care about the database underneath. If you don't plan to support more than one or two databases (and be honest, when did you switch your database the last time?) use the **power** of your database.
Databases are good at this. Thats their *job*. But we need to drop down to **SQL**. Don't be afraid, it has a lot of benifits on the long run.

This time there is a little bit more code but it's not that difficult:

```cs
[DefaultClassOptions]
public class FasterOfferWithView : BaseObject, IOffer
{
    public FasterOfferWithView(Session session) : base(session) { }

    private string _Name;
    [Persistent("Name")]
    public string Name { get => _Name; set => SetPropertyValue(nameof(Name), ref _Name, value); }

    [Association, Aggregated]
    public XPCollection<FasterOfferItemWithView> OfferItems => GetCollection<FasterOfferItemWithView>(nameof(OfferItems));

    public void AddRange(IEnumerable<IOfferItem> items) => OfferItems.AddRange(items.OfType<FasterOfferItemWithView>());
}

public class FasterOfferItemWithView : BaseObject, IOfferItem
{
    public FasterOfferItemWithView(Session session) : base(session) { }

    private int _Hours;
    [Persistent("Hours")]
    public int Hours { get => _Hours; set => SetPropertyValue(nameof(Hours), ref _Hours, value); }

    private FasterOfferWithView _FasterOfferWithView;
    [Persistent("FasterOfferWithView"), Association]
    public FasterOfferWithView FasterOfferWithView { get => _FasterOfferWithView; set => SetPropertyValue(nameof(FasterOfferWithView), ref _FasterOfferWithView, value); }
}

//The actual object that maps to the view
[DefaultProperty(nameof(HourSum))]
public class FasterOfferWithViewQuery : BaseObject
{
    public FasterOfferWithViewQuery(Session session) : base(session) { }

    private FasterOfferWithView _FasterOfferWithView;
    [Persistent("FasterOfferWithView")]
    [MemberDesignTimeVisibility(false)]
    [NoForeignKey] //We don't want a foreign key here, cause it's a on the fly reference
    public FasterOfferWithView FasterOfferWithView { get => _FasterOfferWithView; set => SetPropertyValue(nameof(FasterOfferWithCQRS), ref _FasterOfferWithView, value); }

    private string _Name;
    [Persistent("Name")]
    public string Name { get => _Name; set => SetPropertyValue(nameof(Name), ref _Name, value); }

    private int _HourSum;
    [Persistent("HourSum")]
    public int HourSum { get => _HourSum; set => SetPropertyValue(nameof(HourSum), ref _HourSum, value); }
}

public class CreateViewDatabaseUpdater : ModuleUpdater
{
    public CreateViewDatabaseUpdater(IObjectSpace objectSpace, Version currentDBVersion) : base(objectSpace, currentDBVersion)
    {
    }

    //We use after update schema cause XPO generates a table for FasterOfferWithViewQuery on the fly
    public override void UpdateDatabaseAfterUpdateSchema()
    {
        base.UpdateDatabaseAfterUpdateSchema();

        //Drop the table, ignore if it exists
        DropTable("FasterOfferWithViewQuery", true);
        //Drop the view, ignore if it exists
        ExecuteNonQueryCommand(@"DROP VIEW [dbo].[FasterOfferWithViewQuery]", true);

        //Create the view and map all the columns. SUM from the join
        ExecuteNonQueryCommand(@"CREATE VIEW [dbo].[FasterOfferWithViewQuery]
AS select [FasterOfferWithView].[Oid] as Oid, 
[FasterOfferWithView].[Oid] as [FasterOfferWithView], 
[FasterOfferWithView].[Name] as [Name], 
[FasterOfferWithView].[OptimisticLockField] as [OptimisticLockField], 
[FasterOfferWithView].[GCRecord] AS [GCRecord],
sum([FasterOfferItemWithView].[Hours]) AS [HourSum]
from FasterOfferWithView
inner join FasterOfferItemWithView on [FasterOfferWithView].[Oid] = [FasterOfferItemWithView].[FasterOfferWithView]
group by [FasterOfferWithView].[Oid], [FasterOfferWithView].[Name], [FasterOfferWithView].[OptimisticLockField], [FasterOfferWithView].[GCRecord]
", true);

    }
}

public sealed partial class fixing_an_n_plus_1_perf_problem_in_xaf_xpoModule : ModuleBase
{
    //Register the updater in the module
    public override IEnumerable<ModuleUpdater> GetModuleUpdaters(IObjectSpace objectSpace, Version versionFromDB) => new ModuleUpdater[]
    {
        new CreateViewDatabaseUpdater(objectSpace, versionFromDB)
    };
}

```

`Order`:

```txt
19.09.20 14:45:18.378 Executing sql 'select N0."Oid",N0."Name",N0."OptimisticLockField",N0."GCRecord" from "dbo"."FasterOfferWithView" N0 where N0."GCRecord" is null'
19.09.20 14:45:18.380 Result: rowcount = 300, total = 12078, N0.{Oid,Guid} = 4800, N0.{Name,String} = 4878, N0.{OptimisticLockField,Int32} = 1200, N0.{GCRecord,Int32} = 1200
19.09.20 14:45:18.388 Executing sql 'select top 1 count(*) from "dbo"."FasterOfferWithView" N0 where N0."GCRecord" is null'
19.09.20 14:45:18.389 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 14:45:18.390 Executing sql 'select top 1 count(*) from "dbo"."FasterOfferItemWithView" N0 where N0."GCRecord" is null'
19.09.20 14:45:18.410 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
```

This results in the following performance

1. Sort by `Name`: 0.009 seconds

> *Hint*: we can still provide an `NonPersistent` `HourSum` field in the `Order` class, but make sure users can't display, filter, group by this field in any `ListView`. In `DetailViews` this should not be a huge performance penalty.

`Query`:

```txt
19.09.20 14:46:07.290 Executing sql 'select top 2147483647 N0."HourSum",N0."Name",N0."Oid" from "dbo"."FasterOfferWithViewQuery" N0 where N0."GCRecord" is null'
19.09.20 14:46:07.356 Result: rowcount = 300, total = 10878, N0.{HourSum,Int32} = 1200, N0.{Name,String} = 4878, N0.{Oid,Guid} = 4800
19.09.20 14:46:07.360 Executing sql 'select top 1 count(*) from "dbo"."FasterOfferWithViewQuery" N0 where N0."GCRecord" is null'
19.09.20 14:46:07.362 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
```

This results in the following performance

1. Sort by `Name`: 0.079 seconds
2. Sort by `HourSum`: 0.070 seconds

That's pretty impressiv! Finally let's have a look at the totally unsupported pitched version that saved me several times.

### Totally unsupported - There will be dragons - N+N query version

> **WARNING**: THIS WILL AND CAN BREAK IN THE FUTURE!  
FROM THIS POINT ON YOU ARE ON YOUR OWN.

What if we can not avoid N+1 queries, but at least come down to N+N queries? That means we let XAF use a normal `Client` mode ListView and do 1 additional query for all records in that perticular `ListView`?

There is one not by XAF supported feature called `Session.Prefetch` but it has also some limitations. We need a way to do 1 query when the **first** N+1 query would occur, afterwards we cache it and just lookup data from this cache.  
We cant use static fields, cause we have no idea when to purge the cache. But there is one *undocumented* feature of XPO called `IWideDataStorage` we can leverage.

```cs
[DefaultClassOptions]
[DefaultProperty(nameof(HourSum))]
public class FasterOffer : BaseObject
{
    public FasterOffer(Session session) : base(session) { }

    private string _Name;
    [Persistent("Name")]
    public string Name { get => _Name; set => SetPropertyValue(nameof(Name), ref _Name, value); }

    //We are still non persistent
    [NonPersistent]
    public int HourSum
    {
        get
        {
            //Check if the current session implements the interface
            if (Session is IWideDataStorage storage)
            {
                //If we hit our first N+1 query. Nothing will be stored
                if (!storage.TryGetWideDataItem(GetType().FullName, out var _))
                {
                    //This is an inline method, your can use a static method as well.
                    //Just make sure you don't catch a memory leak by storing references the GC can't handle
                    Dictionary<Guid, int> CalculateHours()
                        => Session.Query<FasterOffer>()
                            .Select(o => new
                            {
                                Oid = o.Oid, //Select the primary key
                                HourSum = o.OfferItems.Sum(m => m.Hours) //Calculate the sum
                            })
                            .ToDictionary(o => o.Oid, o => o.HourSum); //Project to a dictionary, tuple, whatever

                    //Do a efficient query
                    var hours = CalculateHours();
                    //Store it in the store. I typically use the FullName of the current type so it won't collide
                    storage.SetWideDataItem(GetType().FullName, hours);
                }
                //Look in the store, if it's there we are fine
                if (storage.TryGetWideDataItem(GetType().FullName, out var store) && store is Dictionary<Guid, int> cache)
                {
                    if (cache.TryGetValue(Oid, out var hourSum))
                    {
                        return hourSum;
                    }
                }
            }
            //We never should reach this point
            //Do the right thing as fallback anyway
            return OfferItems.Sum(m => m.Hours);
        }
    }

    [Association, Aggregated]
    public XPCollection<FasterOfferItem> OfferItems => GetCollection<FasterOfferItem>(nameof(OfferItems));
}

public class FasterOfferItem : BaseObject
{
    public FasterOfferItem(Session session) : base(session) { }

    private int _Hours;
    [Persistent("Hours")]
    public int Hours { get => _Hours; set => SetPropertyValue(nameof(Hours), ref _Hours, value); }

    private FasterOffer _FasterOffer;
    [Persistent("FasterOffer"), Association]
    public FasterOffer FasterOffer { get => _FasterOffer; set => SetPropertyValue(nameof(FasterOffer), ref _FasterOffer, value); }
}
```

Let's look at the queries generated in the **Client** mode:

```txt
19.09.20 15:51:57.286 Executing sql 'select N0."Oid",N0."Name",N0."OptimisticLockField",N0."GCRecord" from "dbo"."FasterOffer" N0 where N0."GCRecord" is null'
19.09.20 15:51:57.287 Result: rowcount = 300, total = 11950, N0.{Oid,Guid} = 4800, N0.{Name,String} = 4750, N0.{OptimisticLockField,Int32} = 1200, N0.{GCRecord,Int32} = 1200
19.09.20 15:51:57.289 Executing sql 'select N0."Oid",(select sum(N1."Hours") as Res0 from "dbo"."FasterOfferItem" N1 where ((N0."Oid" = N1."FasterOffer") and N1."GCRecord" is null)) from "dbo"."FasterOffer" N0 where N0."GCRecord" is null'
19.09.20 15:51:57.359 Result: rowcount = 300, total = 6000, N0.{Oid,Guid} = 4800, SubQuery(Sum,N1.{Hours,Int32},Select N1.{Hours,Int32}
  from "FasterOfferItem" N1
 where N0.{Oid,Guid} = N1.{FasterOffer,Guid} And N1.{GCRecord,Int32} Is Null) = 1200
19.09.20 15:51:57.363 Executing sql 'select top 1 count(*) from "dbo"."FasterOffer" N0 where N0."GCRecord" is null'
19.09.20 15:51:57.363 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 15:51:57.364 Executing sql 'select top 1 count(*) from "dbo"."FasterOfferItem" N0 where N0."GCRecord" is null'
19.09.20 15:51:57.387 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4

```

This results in the following performance

1. Sort by `Name`: 0.082 seconds
2. Sort by `HourSum`: 0.076 seconds

> **Note**: Cause XAF recreates a `Session` object every time it's refreshed, will fetch the second query only once in the livetime of the session.  
You can control the cache what ever way you like.  
Beware that you will pay the cost of calculating the aggregates of ALL objects in the `DetailView` context as well (cause there is no natural way to figure out if you are currently displayed in a `DetailView`).  
There are several strategies you can further improve this technique, but for now I think this is pretty impressive.

This is really awesome performance for very little effort. Of course you can combine those techniques. Use `XPQuery` combined with `XPView` and so on.
The main goal of this post is how to identify performance bottlenecks in your application and how to overcome them when dealing with aggregates especially in `ListViews`.

### Summary - Lessions learned

1. Performance is hard
1. Measure, measure, measure
1. Pick the right tool (and always keep memory and database load in sight)
1. Never combine `PersistentAlias` with client mode aggregates if possible
1. Use your database as a tool
1. If everything performance wise breaks down: use and measure the last 3 options
1. Use N+N query wisely. It doesn't have the same befinits like all the other `DataAccessModes` but it behaves linear, and can help calculate complicated business rules only once and avoid the N+1 problem.
1. Everything is a tradeoff (implementation time, memory, cpu time, stale data)
1. Use `DataView` or `InstantFeedbackView` in combination with `PersistentAlias` where ever you will need to do aggregation with larger amounts of data
1. `ServerMode`, `ServerView` and `InstantFeedback` will drive your `DBA` crazy, if used uncorrectly
1. Aim for UX first and stay with `Client` mode as much as you can
1. You really need good reasons for `CQRS`. It adds **loads** of performance, but increases complexity and maintainance a **lot**
1. Database `VIEWS` are cheaper from maintainance perspective than `CQRS`

I didn't even dig into execution plans or something special database wise. That is totally out of scope of this post.  
One thing I always recomend is: stick with the `Client` `DataAccessMode` as long as you can, esp. for smaller record sets. It will perform really well, if you keep an eye on *chatty* requests (N+1).

We had no `Indexes` what so ever (except the default ones XPO creates for us). Databases are pretty damn fast.

### Bonus round

Last test done with 3000 `Offers` and 3.000.000 `OfferItems` with the N+N query approach:

```txt
19.09.20 15:51:57.286 Executing sql 'select N0."Oid",N0."Name",N0."OptimisticLockField",N0."GCRecord" from "dbo"."FasterOffer" N0 where N0."GCRecord" is null'
19.09.20 15:51:57.287 Result: rowcount = 300, total = 11950, N0.{Oid,Guid} = 4800, N0.{Name,String} = 4750, N0.{OptimisticLockField,Int32} = 1200, N0.{GCRecord,Int32} = 1200
19.09.20 15:51:57.289 Executing sql 'select N0."Oid",(select sum(N1."Hours") as Res0 from "dbo"."FasterOfferItem" N1 where ((N0."Oid" = N1."FasterOffer") and N1."GCRecord" is null)) from "dbo"."FasterOffer" N0 where N0."GCRecord" is null'
19.09.20 15:51:57.359 Result: rowcount = 300, total = 6000, N0.{Oid,Guid} = 4800, SubQuery(Sum,N1.{Hours,Int32},Select N1.{Hours,Int32}
  from "FasterOfferItem" N1
 where N0.{Oid,Guid} = N1.{FasterOffer,Guid} And N1.{GCRecord,Int32} Is Null) = 1200
19.09.20 15:51:57.363 Executing sql 'select top 1 count(*) from "dbo"."FasterOffer" N0 where N0."GCRecord" is null'
19.09.20 15:51:57.363 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4
19.09.20 15:51:57.364 Executing sql 'select top 1 count(*) from "dbo"."FasterOfferItem" N0 where N0."GCRecord" is null'
19.09.20 15:51:57.387 Result: rowcount = 1, total = 4, SubQuery(Count,,) = 4

```

This results in the following performance

1. Sort by `Name`: 0.920 seconds
2. Sort by `HourSum`: 0.876 seconds

### Recap

There is no one size fit's it all. Performance will always be hard. But I hope you learned some techniques to measure an improve your applications performance.

If you find interesting what I'm doing, consider becoming a [patreon](//www.patreon.com/biohaz999) or [contact me](//www.delegate.at/) for training, development or consultancy.

> **New Kid on the block**: You now can support me on several channels for all kind of projects. Head over to my [new baby called Tasty](https://tasty.xenial.io/support/). [Tasty](https://tasty.xenial.io) is a delicious dotnet testing platform you can use with and in any application. I would be more than happy if you support me and the project.  
There will be a new page for [Xenial](https://www.xenial.io/) soon. The project with the pure goal to make you even be **more** productive with XAF, XPO and all business related development.

Stay awesome!  
Manuel
> PLEASE NEVER DO SOMETHING LIKE THIS IN PRODUCTION. YOU HAVE BEEN WARNED. (Or I insist you NEED to book some consulting hour's from me)
