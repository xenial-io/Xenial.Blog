---
 layout: post 
 title: XAF best practices 2017-04
 series: xaf-best-practices-2017
 comments: true
 tags: ["DevExpress", "XAF", "BestPractices"]
---

In my last post i covered a small portion of business logic, containing controllers and actions. Today I'll cover 2 things: Avoiding string magic with View-ID's and how to build criterias.

### View-ID's

A lot of code i see when reviewing others XAF-Source code is dealing with View-ID's.

XAF generates 3 View's for every BusinessObject: a `DetailView`, a `ListView` and a `LookupListView`.
They are structured the following way: `NameOfTheBusinessObject_TypeOfView`.

Those view id's are often used in controllers, and sometimes stored in the database for more dynamic applications.

I didn't know about this handy helper class provided by the XAF-Team: The `DevExpress.ExpressApp.Model.NodeGenerators.ModelNodeIdHelper`!

It's a simple helper class with 4 very helpful methods: `GetDetailViewId`, `GetListViewId`, `GetLookupListViewId` and `GetNestedListViewId`!

Let's have a look:

```cs
var detailViewId = ModelNodeIdHelper.GetDetailViewId(typeof(LabelDemoModel)); //LabelDemoModel_DetailView
var listViewId = ModelNodeIdHelper.GetListViewId(typeof(LabelDemoModel)); //LabelDemoModel_ListView
var lookupListViewId = ModelNodeIdHelper.GetLookupListViewId(typeof(LabelDemoModel)); //LabelDemoModel_LookupListView
```

The last one `GetNestedListViewId` provides a `LookupLiewView` of a nested `ListView`. For example if you got an aggregate root `Person` with an one to many relationship `Contacts` (for example phone, email, ect.).

The usage will look something like this:

```cs
var nestedListViewId = ModelNodeIdHelper.GetNestedListViewId(typeof(Person), nameof(Person.Contacts)); //Person_Contacts_ListView
```

In this case XAF will generate a separate nested `ListView` of the `Contacts` type excluding the reference on `Person`. This is logical, cause in a nested ListView the `Person` field doesn't make sense.

Another thing i like to provide is a separate class in the `Contracts` assembly to provide easy access to all ViewId's that are used in code.

```cs
using System;
using System.Linq;
using DevExpress.ExpressApp.Model.NodeGenerators;

namespace Scissors.FeatureCenter.Modules.LabelEditorDemos.Contracts
{
    public static class ViewIds
    {
        public static class LabelDemoModel
        {
            public static readonly string DetailView = ModelNodeIdHelper.GetDetailViewId(typeof(BusinessObjects.LabelDemoModel));
            public static readonly string ListView = ModelNodeIdHelper.GetListViewId(typeof(BusinessObjects.LabelDemoModel));
            public static readonly string LookupListView = ModelNodeIdHelper.GetDetailViewId(typeof(BusinessObjects.LabelDemoModel));
        }
    }
}
```

So you can write a controller like this:

```cs
public LabelDemoModelObjectViewController()
{
    TargetViewId = ViewIds.LabelDemoModel.DetailView;
}
```

### Criterias

Next we look how we can avoid strings when building criterias. This will help a lot if you need to refactor code later and don't want to break every criteria you've written so far.
There are 2 possible options. The first one is using the `FieldsClass` that is now integrated into `CodeRush` since [17.1.5](https://www.devexpress.com/products/coderush/coderush-for-roslyn-whats-new.xml#1715)

![XPO FieldsClass](/img/posts/2018/2018-03-12_XPO_Fields.png)

Another way is to use the power of Expressions. Thats the stuff that powers LINQ.

Lets have a look:

```cs
using System;
using System.Linq.Expressions;
using System.Text;

namespace Scissors.Utils
{
    public static class ExpressionHelper
    {
        public static MemberExpression GetMemberExpression(Expression expression)
        {
            if(expression is MemberExpression)
            {
                return (MemberExpression)expression;
            }
            if(expression is LambdaExpression)
            {
                var lambdaExpression = expression as LambdaExpression;
                if(lambdaExpression.Body is MemberExpression)
                {
                    return (MemberExpression)lambdaExpression.Body;
                }
                if(lambdaExpression.Body is UnaryExpression)
                {
                    return ((MemberExpression)((UnaryExpression)lambdaExpression.Body).Operand);
                }
            }
            return null;
        }

        public static string GetPropertyPath(Expression expr)
        {
            var path = new StringBuilder();
            var memberExpression = GetMemberExpression(expr);

            do
            {
                path.Insert(0, $".{memberExpression.Member.Name}");

                if(memberExpression.Expression is UnaryExpression ue)
                {
                    memberExpression = GetMemberExpression(ue.Operand);
                }
                else
                {
                    memberExpression = GetMemberExpression(memberExpression.Expression);
                }
            }
            while(memberExpression != null);

            path.Remove(0, 1);
            return path.ToString();
        }
    }
}
```

Now lets have a look what that does:

```cs
using System;
using System.Linq;
using System.Linq.Expressions;
using Shouldly;
using Xunit;

namespace Scissors.Utils.Tests
{
    public class ExpressionHelperTests
    {
        class TargetClass
        {
            public TargetClass A { get; set; }
            public TargetClass B { get; set; }
            public TargetClass C { get; set; }
        }

        string PropertyName<TRet>(Expression<Func<TargetClass, TRet>> expression)
            => ExpressionHelper.GetPropertyPath(expression);

        [Fact]
        public void SimplePathA()
            => PropertyName(m => m.A).ShouldBe("A");

        [Fact]
        public void SimplePathB()
            => PropertyName(m => m.B).ShouldBe("B");

        [Fact]
        public void SimplePathC()
            => PropertyName(m => m.C).ShouldBe("C");

        [Fact]
        public void ComplexPath1()
            => PropertyName(m => m.A.A.A.B.C.A).ShouldBe("A.A.A.B.C.A");

        [Fact]
        public void ComplexPath2()
            => PropertyName(m => m.C.A.B).ShouldBe("C.A.B");
    }
}
```

Awesome! That helps us to write a simple helper class for XPO:

```cs
using System;
using System.Linq;
using System.Linq.Expressions;
using DevExpress.Data.Filtering;
using DevExpress.Xpo;
using Scissors.Utils;

namespace Scissors.Xpo
{
    public class ExpressionHelper<TObj>
    {
        public string Property<TRet>(Expression<Func<TObj, TRet>> expr)
            => GetPropertyPath(expr);

        public OperandProperty Operand<TRet>(Expression<Func<TObj, TRet>> expr)
            => GetOperand(expr);

        public OperandProperty TypeOperand<TRet>(Expression<Func<TObj, TRet>> expr)
            => new OperandProperty($"{ExpressionHelper.GetPropertyPath(expr)}.{XPObjectType.ObjectTypePropertyName}.TypeName");

        public BinaryOperator IsType<TRet>(Expression<Func<TObj, TRet>> expr, Type t)
            => TypeOperand(expr) == t.FullName;

        public static string GetPropertyPath<TRet>(Expression<Func<TObj, TRet>> expr)
            => ExpressionHelper.GetPropertyPath(expr);

        public static OperandProperty GetOperand<TRet>(Expression<Func<TObj, TRet>> expr)
            => new OperandProperty(ExpressionHelper.GetPropertyPath(expr));

        public static BinaryOperator GetObjectTypeOperator<TRet>(Expression<Func<TObj, TRet>> expr, Type objectType)
            => new OperandProperty($"{ExpressionHelper.GetPropertyPath(expr)}.{XPObjectType.ObjectTypePropertyName}") == objectType.FullName;

        public static BinaryOperator GetObjectTypeOperator()
            => new OperandProperty(XPObjectType.ObjectTypePropertyName) == typeof(TObj).FullName;
    }
}
```

Cool stuff! How do we use it?
Extend the `LabelDemoModel` class:

```cs
    [Persistent]
    public class LabelDemoModel : ScissorsBaseObjectOid
    {
        public static readonly ExpressionHelper<LabelDemoModel> Field = new ExpressionHelper<LabelDemoModel>();
    }
```

Now we can use it like this:

```cs
var criteria = LabelDemoModel.Field.Operand(m => m.Text) == "Test";
```

That is very handy, cause you now never need to update the `FieldsClass`. It will cost a little bit performance, but I think the advantages outweigh the disadvantages.
And cause the DevExpress team implemented several operators you can write even more complex operators!

```cs
var criteria = BugModel.Field.Operand(m => m.Done).Not() & BugModel.Field.Operand(m => m.User).IsNotNull() & BugModel.Field.Operand(m => m.States[StateModel.Field.Operand(s => s.Active).Count() > 0];
```

It's a little bit more verbose, but on the other hand it's easy to read, refactor and you get full intellisense! The other methods on the `ExpressionHelper<T>` class are for dealing with the `ObjectType` of an XPO class a lot. But most of the time you don't need them.

Another thing I like to do very often is add a class that collects the CriteriaOperators used in an module in the `Contracts` or `Domain` assembly. So you can reuse the criterias:

```cs
public static class LabelDemoModelCriterias
{
    public static CriteriaOperator NotEmpty()
        => LabelDemoModel.Field.Operand(m => m.Text).IsNotNull()
            & new FunctionOperator(FunctionOperatorType.IsNullOrEmpty, LabelDemoModel.Field.Operand(m => m.Text));
}
```

I hope this will help some people write more robust XAF applications.
Tell me what you think!