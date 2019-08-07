---
 layout: post 
 title: "T is for Testing: XAF & XPO - Functional Tests 3"
 comments: true
 tags: ["Testing", "XAF", "XPO", "Builder", "Patterns", "DevExpress", "EasyTest", "Ranorex", "Webtestit"]
 series: t-is-for-testing-xaf-xpo
 github: XafEasyTestInCodeNUnit
---

Testing is an important part of a developers responsibilities, especially in a fast moving agile world!
This is the first post in a [series](/series/{{page.series}}) on testing patterns I used and discovered when testing applications using XAF and XPO applications.

Although the patterns I use are focusing on testing XAF and XPO applications, most of them may apply to not only on testing and not only on XAF applications.
After learning about test data in the [last post](/2019/05/26/t-is-for-testing-xaf-xpo-test-data-2.html) we now can focus on functional tests. So let's get started!

## Functional Tests

So let's think about what functional tests are.

* Simulate user input
* Assert behavior

Okay seams legit, but how can you actually to do that?

There are several technologies available, depending on the platform. For the web, I did a lot of testing in the past with [Selenium](http://seleniumhq.org). At my last job at [Ranorex](https://www.ranorex.com/) we wrote a whole product around Selenium called [Webtestit](https://www.ranorex.com/webtestit/)! (That's awesome by the way, check it out). From DevExpress there is [TestCafe](https://www.devexpress.com/products/testcafestudio/) but I didn't had a chance to use it in a real world project yet.  

For Windows-Desktop there are another load of options. There is [Ranorex Studio](https://www.ranorex.com/why-ranorex/), [Coded-UI-Tests](https://docs.microsoft.com/en-us/visualstudio/test/use-ui-automation-to-test-your-code?view=vs-2019) from Microsoft, [WinAppDriver](https://github.com/microsoft/WinAppDriver) from Microsoft, [Project Sikuli](http://doc.sikuli.org) and of course there is [EasyTest](https://documentation.devexpress.com/eXpressAppFramework/113206/Concepts/Debugging-Testing-and-Error-Handling/Functional-Testing).

To be honest I never looked into EasyTest until now, cause I don't like recorded tests. Those are incredible hard to maintain. That is not special to EasyTest it self. Almost all tools I mentioned above provide some kind of recording, but on EasyTest it self, I disliked it for another reason: A special script language. That wouldn't be that bad, if it would be a [turing-complete](https://en.wikipedia.org/wiki/Turing_completeness) language, but it isn't. The language is a [DSL](https://en.wikipedia.org/wiki/Domain-specific_language) special for tests, and it's easy to read, but I never got warm with it. Most of the teams I work with don't want to learn a new language, especially on top on new concepts (yes there are a lot of people out there, want to start testing, but have no idea how).

But then I discovered an [old blog post](https://community.devexpress.com/blogs/xaf/archive/2011/05/04/how-to-write-easytests-in-code.aspx) (!!) from [Tolis](https://github.com/apobekiaris) (the creator of [eXpand-framework](http://expandframework.com)) how to write EasyTests in C# and started to play with it. And what should I say? I'm in love. But let's talk about a powerful functional testing pattern first:

## Page-Object-Pattern

What's a page object? It's a powerful abstraction hiding the nitty gritty details of your UI out of the test and let you focus on what a user see's when he is using your UI.

It encapsulates selectors, actions and user interaction in an easy to maintain way.

> This sample is pure pseudo code, no implementation detail about any of the above mentioned technologies are used. This will lay the foundation for the real world example later in this post.

Imaging a typical XAF-Winforms application. Navigation on the left with a `Customer_ListView` `NavigationItem`, when you click on it, the `Customer_ListView` appears. It should be sorted by `Name`. On `DoubleClick` it should show the `Customer_DetailView` with the data. Change some fields, click on `SaveAndClose` and be sure that the `Grid` in the `ListView` is updated accordingly.
What would `PageObject's` look like?

```cs
public class RootPageObject
{
    public NavigationPageObject NavigateTo() => new NavigationPageObject();
}

public class NavigationPageObject
{
    public CustomerListViewPageObject Customers() => new CustomerListViewPageObject();
}

public class CustomerListViewPageObject
{
    public CustomerDetailViewPageObject NewRecord() => => new CustomerDetailViewPageObject();
    public CustomerDetailViewPageObject OpenRecord(int rowNumber) => new CustomerDetailViewPageObject();
    public string GetName(int rowNumber) => /**/;
}

public class CustomerDetailViewPageObject
{
    public CustomerListViewPageObject SaveAndClose() => new CustomerListViewPageObject();
    public CustomerDetailViewPageObject SetName(string name) => this;
}
```

If we want to write a test it could look like something like that:

```cs
[Fact]
public void NewCustomersShouldSortedByName()
{
    var app = new RootPageObject();
    var list = app.NavigateTo().Customers()
        .NewRecord()
            .SetName("Manuel")
            .SaveAndClose()
        .NewRecord()
            .SetName("Alice")
            .SaveAndClose();

    list.ShouldSatisfyAllConditions(
        () => list.GetName(0).ShouldBe("Alice"),
        () => list.GetName(1).ShouldBe("Manuel"),
    );
}

```

As you can see, the code is very clear. It mimics the behavior of the user. Navigate to the customers `ListView`, click on `New`, enter some data, `SaveAndClose`, hit `New` again, enter more data, check if the sorting is correct.

The test it self is easy to read, reason about and is [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself). Did you see any implementation detail? No? Me neither. And thats the goal with the Page-Object-Pattern.

The fluent object pattern here helps a lot with discoverability (intellisense). It's not necessary to apply the pattern, but it makes reading the tests a breeze (if you get code indention right ;))

> Hide the UI-Details inside the page object's to abstract away possible UI changes and increase maintainability through abstraction. Focus on what a user can do with your application, not on the actual UI or technical implementation details.

## Run EasyTests in Code with NUnit

Based on the sample Tolis created, the [nuget package fix]() the team was willing to do, and some hours of work I have a running [sample](https://github.com/biohazard999/XafEasyTestInCodeNUnit).

There are some considerations to make when writing tests in general. One of them is autonomy. To isolate potential bugs, and make 



#### PageObjectPattern

Let's have a look into one test case first to see if that pattern is worth anything:

```cs
using System.Collections.Generic;
using EasyTest.Tests.PageObjects;
using Shouldly;
using Xunit;

namespace EasyTest.Tests
{
    public class WebTests : CommonTests<WebTestApplicationHelper>
    {
        [Fact]
        public void UnlinkActionTest()
        {
            var departmentDetail = new ApplicationPageObject(Fixture)
                .NavigateToDepartment()
                .OpenRecordByTitle("Development Department");

            departmentDetail
                .Positions()
                .Assert(p =>
                {
                    p.RowCount.ShouldBe(2);
                    p.GetValues(0, "Title").ShouldBe(new Dictionary<string, string>
                    {
                        ["Title"] = "Developer"
                    });
                    p.UnlinkAction.Enabled.ShouldBeFalse();
                })
                .SelectRow(0)
                .Assert(p => p.UnlinkAction.Enabled.ShouldBeTrue())
                .ExecuteAction(p => p.UnlinkAction)
                .Assert(p =>
                {
                    p.RowCount.ShouldBe(1);
                    p.GetValues(0, "Title")
                    .ShouldBe(new Dictionary<string, string>
                    {
                        ["Title"] = "Manager"
                    });
                });

            departmentDetail
                .Contacts()
                .Assert(c => c.UnlinkAction.Enabled.ShouldBeFalse())
                .SelectRow(0)
                .Assert(c => c.UnlinkAction.Enabled.ShouldBeTrue());
        }
    }
}

```

I don't know much, but that looks like a nice structured test. It is totally clear what the test is supposed to do.
It is structured in a readable fashion, not too much technical details and is focused on the user. If I'm a user of my application thats exactly the way I would interact with the application.

For the sake of completeness here is the complete test code:

```cs
using System;
using System.Collections.Generic;
using EasyTest.Tests.PageObjects;
using EasyTest.Tests.Utils;
using Shouldly;

namespace EasyTest.Tests
{
    public abstract class CommonTests<T> : IDisposable where T : EasyTestFixtureBase, new()
    {
        protected T Fixture { get; }

        public CommonTests()
            => Fixture = new T();

        public void Dispose()
            => Fixture.Dispose();

        protected void ChangeContactNameTest_()
        {
            var contactList = new ApplicationPageObject(Fixture)
                .NavigateToContact()
                .Assert(d =>
                {
                    d.RowCount.ShouldBe(2);
                    d.GetValues(0, "Full Name")
                        .ShouldBe(new Dictionary<string, string>()
                        {
                            ["Full Name"] = "John Nilsen"
                        });

                    d.GetValues(1, "Full Name")
                        .ShouldBe(new Dictionary<string, string>()
                        {
                            ["Full Name"] = "Mary Tellitson"
                        });
                });

            var contactDetail = contactList
                .OpenRecordByFullName("Mary Tellitson")
                .Assert(c =>
                {
                    c.FullName.ShouldBe("Mary Tellitson");
                    c.Department.ShouldBe("Development Department");
                    c.Position.ShouldBe("Manager");
                })
                .ExecuteActionIf(f => f.IsWeb, c => c.EditAction)
                .Do(c =>
                {
                    c.FirstName = "User_1";
                    c.LastName = "User_2";
                    c.Position = "Developer";
                })
                .ExecuteAction(c => c.SaveAction)
                .Assert(c =>
                {
                    c.FullName.ShouldBe("User_1 User_2");
                    c.Position.ShouldBe("Developer");
                })
                .ExecuteAction(c => c.SaveAndCloseAction);

            contactList.GetValues(1, "Full Name", "Position").ShouldBe(new Dictionary<string, string>
            {
                ["Full Name"] = "User_1 User_2",
                ["Position"] = "Developer"
            });
        }

        protected void WorkingWithTasks_()
        {
            var taskDetail = new ApplicationPageObject(Fixture)
               .NavigateTo("Demo Task")
               .OpenRecord("Subject", "Fix breakfast");

            taskDetail
                .List("Contacts")
                .Assert(c => c.RowCount.ShouldBe(0))
                .ExecuteAction(c => c.LinkAction, f => new ListPageObject(f, "Contact"), contactsPopup =>
                {
                    contactsPopup
                        .SelectRow(0)
                        .ExecuteAction(x => x.Action("OK"));
                })
                .Assert(c =>
                {
                    c.RowCount.ShouldBe(1);
                    c.GetValues(0, "Full Name").ShouldBe(new Dictionary<string, string>
                    {
                        ["Full Name"] = "John Nilsen"
                    });
                });
        }

        protected void ChangeContactNameAgainTest_()
        {
            var application = new ApplicationPageObject(Fixture);

            var contactList = application
                .NavigateToContact()
                .Assert(c =>
                {
                    c.GetValues(0, "Full Name").ShouldBe(new Dictionary<string, string>
                    {
                        ["Full Name"] = "John Nilsen"
                    });
                    c.GetValues(1, "Full Name").ShouldBe(new Dictionary<string, string>
                    {
                        ["Full Name"] = "Mary Tellitson"
                    });
                });

            var contactDetail = contactList
                .OpenRecordByFullName("Mary Tellitson")
                .ExecuteActionIf(f => f.IsWeb, c => c.EditAction)
                .Assert(c =>
                {
                    c.FullName.ShouldBe("Mary Tellitson");
                    c.Department.ShouldBe("Development Department");
                })
                .Do(c =>
                {
                    c.FirstName = "User_1";
                    c.LastName = "User_2";
                })
                .ExecuteAction(c => c.SaveAction);

            application
                .NavigateToContact()
                .Assert(c =>
                {
                    c.GetValues(0, "Full Name").ShouldBe(new Dictionary<string, string>
                    {
                        ["Full Name"] = "John Nilsen"
                    });
                    c.GetValues(1, "Full Name").ShouldBe(new Dictionary<string, string>
                    {
                        ["Full Name"] = "User_1 User_2"
                    });
                });
        }
    }
}

using System.Collections.Generic;
using EasyTest.Tests.PageObjects;
using Shouldly;
using Xunit;

namespace EasyTest.Tests
{
    public class WebTests : CommonTests<WebTestApplicationHelper>
    {
        [Fact]
        public void ChangeContactNameTest() => ChangeContactNameTest_();

        [Fact]
        public void WorkingWithTasks() => WorkingWithTasks_();

        [Fact]
        public void ChangeContactNameAgainTest()
            => ChangeContactNameAgainTest_();

        [Fact]
        public void UnlinkActionTest()
        {
            var departmentDetail = new ApplicationPageObject(Fixture)
                .NavigateToDepartment()
                .OpenRecordByTitle("Development Department");

            departmentDetail
                .Positions()
                .Assert(p =>
                {
                    p.RowCount.ShouldBe(2);
                    p.GetValues(0, "Title").ShouldBe(new Dictionary<string, string>
                    {
                        ["Title"] = "Developer"
                    });
                    p.UnlinkAction.Enabled.ShouldBeFalse();
                })
                .SelectRow(0)
                .Assert(p => p.UnlinkAction.Enabled.ShouldBeTrue())
                .ExecuteAction(p => p.UnlinkAction)
                .Assert(p =>
                {
                    p.RowCount.ShouldBe(1);
                    p.GetValues(0, "Title").ShouldBe(new Dictionary<string, string>
                    {
                        ["Title"] = "Manager"
                    });
                });

            departmentDetail
                .Contacts()
                .Assert(c => c.UnlinkAction.Enabled.ShouldBeFalse())
                .SelectRow(0)
                .Assert(c => c.UnlinkAction.Enabled.ShouldBeTrue());
        }
    }
}

using System;
using Xunit;

namespace EasyTest.Tests
{
    public class WinTests : CommonTests<WinTestApplicationHelper>
    {
        [Fact]
        public void ChangeContactNameTest() => ChangeContactNameTest_();

        [Fact]
        public void WorkingWithTasks() => WorkingWithTasks_();

        [Fact]
        public void ChangeContactNameAgainTest()
            => ChangeContactNameAgainTest_();
    }
}

```

So now what? Let's look at the PageObjects. Don't be scared, we use recursive generics again as in the [last post](). 

```cs
using DevExpress.EasyTest.Framework;
using EasyTest.Tests.Utils;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EasyTest.Tests.PageObjects
{
    public abstract class PageObject<T> where T : PageObject<T>
    {

        protected readonly EasyTestFixtureBase Fixture;
        public PageObject(EasyTestFixtureBase fixture)
            => Fixture = fixture;

        protected T This => (T)this;

        public T Assert(Action<T> assert)
        {
            assert(This);
            return This;
        }

        public virtual ActionPageObject Action(string actionName) => new ActionPageObject(Fixture, actionName);

        public T ExecuteAction(Func<T, ActionPageObject> action)
        {
            action(This).Execute();
            return This;
        }

        public T ExecuteAction<TPageObject>(Func<T, ActionPageObject> action, Func<EasyTestFixtureBase, TPageObject> pageObjectFactory, Action<TPageObject> executor)
        {
            action(This).Execute();
            executor(pageObjectFactory(Fixture));
            return This;
        }

        public T ExecuteActionIf(Predicate<EasyTestFixtureBase> predicate, Func<T, ActionPageObject> action)
        {
            if (predicate(Fixture))
            {
                return ExecuteAction(action);
            }
            return This;
        }

        public T Do(Action<T> action)
        {
            action(This);
            return This;
        }
    }

    public class NestedListPageObject : NestedListPageObject<NestedListPageObject>
    {
        public NestedListPageObject(EasyTestFixtureBase fixture, string listName) : base(fixture, listName) { }

    }

    public abstract class NestedListPageObject<T> : ListPageObject<T>
        where T : NestedListPageObject<T>
    {

        public NestedListPageObject(EasyTestFixtureBase fixture, string listName) : base(fixture, listName) { }
    }

    public class ApplicationPageObject : ApplicationPageObject<ApplicationPageObject>
    {
        public ApplicationPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class ApplicationPageObject<T> : PageObject<T>
        where T : ApplicationPageObject<T>
    {
        public ApplicationPageObject(EasyTestFixtureBase fixture) : base(fixture) { }

        public DepartmentListPageObject NavigateToDepartment()
        {
            Fixture.CommandAdapter.DoAction("Navigation", "Department");
            return new DepartmentListPageObject(Fixture);
        }

        public ContactListPageObject NavigateToContact()
        {
            Fixture.CommandAdapter.DoAction("Navigation", "Contact");
            return new ContactListPageObject(Fixture);
        }

        public ListPageObject NavigateTo(string navigationName)
        {
            Fixture.CommandAdapter.DoAction("Navigation", navigationName);
            return new ListPageObject(Fixture, "Demo Task");
        }
    }

    public class ListPageObject : ListPageObject<ListPageObject>
    {
        public ListPageObject(EasyTestFixtureBase fixture, string tableName) : base(fixture, tableName) { }
    }

    public class ListPageObject<T> : PageObject<T>
        where T : ListPageObject<T>
    {
        protected string TableName { get; }
        protected ITestControl TestControl { get; }

        public ListPageObject(EasyTestFixtureBase fixture, string tableName) : base(fixture)
        {
            TableName = tableName;
            TestControl = Fixture.Adapter.CreateTestControl(TestControlType.Table, tableName);
        }

        public TDetailPageObject OpenRecord<TDetailPageObject>(string columnName, string value, Func<EasyTestFixtureBase, TDetailPageObject> pageObjectFactory)
        {
            Fixture.CommandAdapter.ProcessRecord(TableName, new string[] { columnName }, new string[] { value }, "");

            return pageObjectFactory(Fixture);
        }

        public DetailPageObject OpenRecord(string columnName, string value)
            => OpenRecord(columnName, value, f => new DetailPageObject(f));

        public int RowCount => TestControl.GetInterface<IGridBase>().GetRowCount();

        public Dictionary<string, string> GetValues(int rowIndex, params string[] columnNames)
            => columnNames.Select(columnName => new
            {
                ColumnName = columnName,
                Value = Fixture.CommandAdapter.GetCellValue(TableName, rowIndex, columnName)

            }).ToDictionary(x => x.ColumnName, x => x.Value);

        public ActionPageObject NestedAction(string actionName) => base.Action($"{TableName}.{actionName}");

        public ActionPageObject UnlinkAction => NestedAction("Unlink");
        public ActionPageObject LinkAction => NestedAction("Link");

        public T SelectRow(int rowIndex)
        {
            TestControl.GetInterface<IGridRowsSelection>().SelectRow(rowIndex);
            return This;
        }
    }

    public class DepartmentListPageObject : DepartmentListPageObject<DepartmentListPageObject>
    {
        public DepartmentListPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class DepartmentListPageObject<T> : ListPageObject<T>
        where T : DepartmentListPageObject<T>
    {
        public DepartmentListPageObject(EasyTestFixtureBase fixture) : base(fixture, "Department") { }

        public DepartmentDetailPageObject OpenRecordByTitle(string title)
            => OpenRecord("Title", title, f => new DepartmentDetailPageObject(f));
    }

    public class ContactListPageObject : ContactListPageObject<ContactListPageObject>
    {
        public ContactListPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class ContactListPageObject<T> : ListPageObject<T>
        where T : ContactListPageObject<T>
    {
        public ContactListPageObject(EasyTestFixtureBase fixture) : base(fixture, "Contact") { }

        public ContactDetailPageObject OpenRecordByFullName(string title)
            => OpenRecord("Full Name", title, f => new ContactDetailPageObject(f));
    }

    public class DetailPageObject : DetailPageObject<DetailPageObject>
    {
        public DetailPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class DetailPageObject<T> : PageObject<T>
        where T : DetailPageObject<T>
    {
        public DetailPageObject(EasyTestFixtureBase fixture) : base(fixture) { }

        public ListPageObject List(string tableName) => new ListPageObject(Fixture, tableName);

        public string GetValue(string fieldName) => Fixture.CommandAdapter.GetFieldValue(fieldName);
        public void SetValue(string fieldName, string value) => Fixture.CommandAdapter.SetFieldValue(fieldName, value);

        public ActionPageObject EditAction => Action("Edit");
        public ActionPageObject SaveAction => Action("Save");
        public ActionPageObject SaveAndCloseAction => Action("Save and Close");
        public ActionPageObject CloseAction => Action("Close");
    }


    public class ContactDetailPageObject : ContactDetailPageObject<ContactDetailPageObject>
    {
        public ContactDetailPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class ContactDetailPageObject<T> : DetailPageObject<T>
        where T : ContactDetailPageObject<T>
    {
        public ContactDetailPageObject(EasyTestFixtureBase fixture) : base(fixture) { }

        public string FirstName
        {
            get => GetValue("First Name");
            set => SetValue("First Name", value);
        }

        public string LastName
        {
            get => GetValue("Last Name");
            set => SetValue("Last Name", value);
        }

        public string FullName
        {
            get => GetValue("Full Name");
            set => SetValue("Full Name", value);
        }

        public string Department
        {
            get => GetValue("Department");
            set => SetValue("Department", value);
        }

        public string Position
        {
            get => GetValue("Position");
            set => SetValue("Position", value);
        }
    }

    public class DepartmentDetailPageObject : DepartmentDetailPageObject<DepartmentDetailPageObject>
    {
        public DepartmentDetailPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class DepartmentDetailPageObject<T> : DetailPageObject<T>
        where T : DepartmentDetailPageObject<T>
    {
        public DepartmentDetailPageObject(EasyTestFixtureBase fixture) : base(fixture) { }

        public PositionListPageObject Positions()
        {
            Fixture.CommandAdapter.DoAction("Positions", null);
            return new PositionListPageObject(Fixture);
        }

        public NestedListPageObject Contacts()
        {
            Fixture.CommandAdapter.DoAction("Contacts", null);
            return new NestedListPageObject(Fixture, "Contacts");
        }
    }

    public class PositionListPageObject : PositionListPageObject<PositionListPageObject>
    {
        public PositionListPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class PositionListPageObject<T> : NestedListPageObject<T>
        where T : PositionListPageObject<T>
    {
        public PositionListPageObject(EasyTestFixtureBase fixture) : base(fixture, "Positions") { }
    }

    public class ActionPageObject : ActionPageObject<ActionPageObject>
    {
        public ActionPageObject(EasyTestFixtureBase fixture, string actionName) : base(fixture, actionName) { }
    }

    public class ActionPageObject<T> : PageObject<T>
        where T : ActionPageObject<T>
    {
        protected string ActionName { get; }
        protected ITestControl TestControl { get; }

        public ActionPageObject(EasyTestFixtureBase fixture, string actionName) : base(fixture)
        {
            ActionName = actionName;
            TestControl = Fixture.Adapter.CreateTestControl(TestControlType.Action, actionName);
        }

        public bool Enabled => TestControl.GetInterface<IControlEnabled>().Enabled;

        public T Execute()
        {
            Fixture.CommandAdapter.DoAction(ActionName, null);
            return This;
        }
    }
}

```

Okay thats a lot of code, but under the hood it's the same stuff as before. Most of it is boilerplate code. But can you spot the difference? There are two ways to write `PageObjects`. Declarative and imperative. If you look back at `WorkingWithTasks_` method, we didn't write new PageObject classes, instead we used the imperative style. That is a valuable option, if your application is rather large and have a lot of nested navigation, but I would not recommend that cause you are leaking a lot of implementation details to the test. I rather prefer the declarative approach for 4 reasons:

1. Maintainability: Need to fix a caption? Ohhhh.... I need to change 300 tests...
1. Focus: What's the action again on that ListView? Can't remember the name, need to lookup in source or start the application
1. Localization: If you extend the page object pattern for localized captions, you can test your app in different languages!
1. Parameters: You can use parametrized tests more easily

## Recap

We learned about writing EasyTests in Code, the Page-Object-Pattern and how we can do functional testing in an maintainable fashion! Test code is equally important production code! Treat it with care! Refactor it like you would do production code!

I promised last time that we cover structuring and testing business logic, I promise the next post will cover that (but it's hard to cover that without a good sample project). And it was so thrilling to do UI-Automation with XAF first.

> If you find interesting what I'm doing, consider becoming a [patreon](//www.patreon.com/biohaz999) or [contact me](//www.delegate.at/) for training, development or consultancy.

I hope this pattern helps testing your applications. The next post in this [series](/series/{{page.series}}) will cover testing business logic. The source code the [applied pattern]() is as always on [github]().

Happy testing!
