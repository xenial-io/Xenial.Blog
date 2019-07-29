---
 layout: post 
 title: "T is for Testing: XAF & XPO - Functional Tests 3"
 comments: true
 github: Scissors.XafTemplates
 tags: ["Testing", "XAF", "XPO", "Builder", "Patterns", "DevExpress", "EasyTest", "Ranorex", "Webtestit"]
 series: t-is-for-testing-xaf-xpo
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

There are several technologies available, depending on the platform. For the web, I did a lot of testing in the past, with [Selenium](http://seleniumhq.org). At my last job at [Ranorex](https://www.ranorex.com/) we wrote a whole product around Selenium called [Webtestit](https://www.ranorex.com/webtestit/)! (That's awesome by the way, check it out). From DevExpress there is [TestCafe](https://www.devexpress.com/products/testcafestudio/) but I didn't had a chance to use it in a real world project yet.  

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
public void NewCustomerShouldBeInGrid()
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

The fluent object pattern here helps a lot with discoverability. It's not necessary to apply the pattern, but it makes reading the tests a breeze (if you get code indention right ;))

> Hide the UI-Details inside the page object's to abstract away possible UI changes and increase maintainability through abstraction. Focus on what a user can do with your application.

