---
 layout: post 
 title: "T is for Testing: XAF & XPO - Builder Pattern 1"
 comments: true
 tags: ["Testing", "XAF", "XPO", "Builder", "Patterns", "DevExpress"]
 series: t-is-for-testing-xaf-xpo
---

Testing is an important part of a developers responsibilities, especially in a fast moving agile world!
This is the first post in a [series](/series/{{page.series}}) on testing patterns I used and discovered when testing applications using XAF and XPO applications.

Although the patterns I use are focusing on testing XAF and XPO applications, most of them may apply to not only on testing and not only on XAF applications.
The following one is a modified version of the [builder pattern](//en.wikipedia.org/wiki/Builder_pattern) which is part of the [gang of four](https://en.wikipedia.org/wiki/Design_Patterns). It's called the [bloch's builder pattern](//www.codeproject.com/Articles/240756/Hierarchically-Implementing-the-Bolchs-Builder-Pat). So let's get started!

## Gang of four builder pattern

The classical builder pattern has some downsides if you try to build objects that have a hierarchal inheritance chain. You need a lot of casting, and it's hard to consume.

We want to build an XafApplication with a concrete TestApplication to use. Because an XafApplication it self is abstract we cant do really much to reuse a lot of code in the classical pattern. Let's look at the classical pattern first to understand the differences.

```cs
public class TestApplication : XafApplication
{
    public TestApplication() { }
    protected override LayoutManager CreateLayoutManagerCore(bool simple) => null;
    protected override ListEditor CreateListEditorCore(IModelListView modelListView, CollectionSourceBase collectionSource) => null;
}

public interface IAppBuilder
{
    string ConnectionString { get; set; }
    string Title { get; set; }
    CheckCompatibilityType CheckCompatibilityType { get; set; }
    XafApplication GetResult();
}

public class TestAppBuilder : IAppBuilder
{
    public string ConnectionString { get; set; }
    public string Title { get; set; }
    public CheckCompatibilityType CheckCompatibilityType { get; set; }
    public XafApplication GetResult()
    {
        var testApplication = new TestApplication
        {
            ConnectionString = ConnectionString;
            Title = Title;
        }
        testApplication.CheckCompatibilityType = CheckCompatibilityType ?? testApplication.CheckCompatibilityType
        return testApplication;
    }
}

public class TestAppBuildDirector
{
    private IAppBuilder _builder;
    public SportsCarBuildDirector(IAppBuilder builder)
    {
        _builder = builder;
    }

    public void Construct()
    {
        _builder.ConnectionString = "Some Test Connection String";
        _builder.Title = "Test Application";
    }
}

public class XafApplicationTest
{
    [Fact]
    public void AreConnectionStringAndTitleCorrect()
    {
        var builder = new TestAppBuilder();
        var director = new TestAppBuildDirector(builder);
        director.Construct();
        var application = builder.GetResult();

        application.ShouldSatisfyAllConditions(
            () => application.ConnectionString.ShouldBe("Some Test Connection String"),
            () => application.Title.ShouldBe("Test Application")
        );
    }
}

```

> In my tests i use the following libraries:  
> [XUnit](//xunit.net/)  
> [Shouldly](//github.com/shouldly/shouldly)

Yikes! Thats a lot of code (Lines of code 82, 4 classes, 1 interface).

We have an `TestAppBuildDirector` that is used for defining test data (of course we could pass them for example in the constructor). The `TestAppBuilder` that does the building. Neat from a [separation of concerns](//en.wikipedia.org/wiki/Separation_of_concerns) perspective, but hard to maintain and reason about. Test data is hidden from the test it self, which i consider an [anti-pattern](//en.wikipedia.org/wiki/Anti-pattern).

Look at the test itself, could you see what the correct values for the assertions should be? I can't. You need to navigate to the `builder`, then realizing the `director` holds the data. Navigate back to the test. Yuk!

```cs
var builder = new TestAppBuilder();
var director = new TestAppBuildDirector(builder);
director.Construct();
var application = builder.GetResult();

application.ShouldSatisfyAllConditions(
    () => application.ConnectionString.ShouldBe("Some Test Connection String"),
    () => application.Title.ShouldBe("Test Application")
);'
```

Now imagine to build a complex object like an XAF application with several stuff we need to control in our Tests, to mock behavior or assert simple stuff. Now imagine building a WinApplication integration test. Now you have to cast to an WinApplication in your tests, the pattern quickly falls apart. I've seen code bases with 100's of those builder director implementations, nobody want's to maintain that. Developers are getting frustrated and test less or stop testing at all! Time to change that and look at the bloch's builder pattern next.

## Bloch's builder pattern

```cs
public class TestApplication : XafApplication
{
    public TestApplication() { }
    protected override LayoutManager CreateLayoutManagerCore(bool simple) => null;
    protected override ListEditor CreateListEditorCore(IModelListView modelListView, CollectionSourceBase collectionSource) => null;
}

public abstract class XafApplicationBuilder<TApplication, TBuilder>
    where TApplication : XafApplication
    where TBuilder : XafApplicationBuilder<TApplication, TBuilder>
{
    public XafApplicationBuilder() {}

    protected virtual TBuilder This => (TBuilder)this;

    protected abstract TApplication Create();

    public virtual TApplication Build()
    {
        var application = Create();

        application.ConnectionString =
            string.IsNullOrEmpty(ConnectionString)
            ? application.ConnectionString
            : ConnectionString;

        application.CheckCompatibilityType =
            CheckCompatibilityType
            ?? application.CheckCompatibilityType;

        application.Title =
            string.IsNullOrEmpty(Title)
            ? application.Title
            : Title;

        return application;
    }

    protected string ConnectionString { get; set; }
    public TBuilder WithConnectionString(string connectionString)
    {
        ConnectionString = connectionString;
        return This;
    }

    protected CheckCompatibilityType? CheckCompatibilityType { get; set; }
    public TBuilder WithCheckCompatibilityType(CheckCompatibilityType checkCompatibilityType)
    {
        CheckCompatibilityType = checkCompatibilityType;
        return This;
    }

    protected string Title { get; set; }
    public TBuilder WithTitle(string title)
    {
        Title = title;
        return This;
    }
}

public class TestApplicationBuilder : TestApplicationBuilder<TestApplication, TestApplicationBuilder> { }

public class TestApplicationBuilder<TApplication, TBuilder> : XafApplicationBuilder<TApplication, TBuilder>
    where TApplication : TestApplication
    where TBuilder : HeadlessXafApplicationBuilder<TApplication, TBuilder>
{
    protected override TApplication Create() => (TApplication)new HeadlessXafApplication();
}

public class XafApplicationTest
{
    [Fact]
    public void IsConnectionStringCorrect()
    {
        var application = new TestApplicationBuilder()
            .WithConnectionString("Some Test Connection String")
            .WithTitle("Test Application")
            .Build();

        application.AreConnectionStringAndTitleCorrect(
            () => application.ConnectionString.ShouldBe("Some Test Connection String"),
            () => application.Title.ShouldBe("Test Application")
        );
    }
}

```

> In my tests i use the following libraries:  
> [XUnit](//xunit.net/)  
> [Shouldly](//github.com/shouldly/shouldly)

Thats not that bad (Lines of code 82, 5 classes).

Okay let's talk a little bit about whats going on here. There are a lot of [generics](//docs.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/) and really weird ones. [Recursive generics](//fernandof.wordpress.com/2007/09/23/recursive-generics-restrictions/) to be precise. But the code it self is pretty clear. We have a builder, we have a abstract `XafApplicationBuilder` class with 3 properties that are assigned. A `TestApplicationBuilder` class that is derived from that, that creates the actual instance of `TestApplication` and we have the test it self. But now look at the test code in isolation:

```cs
var application = new TestApplicationBuilder()
    .WithConnectionString("Some Test Connection String")
    .WithTitle("Test Application")
    .Build();

application.AreConnectionStringAndTitleCorrect(
    () => application.ConnectionString.ShouldBe("Some Test Connection String"),
    () => application.Title.ShouldBe("Test Application")
);
```

Can you spot the difference? The test data is no longer hidden! We can see what's going on!
It's a lot easier to understand the test case. We assign data in, we assert the behavior.

But wait, that only tests the builder it self?!? Yes you are correct. But it's crucial to understand the power of this pattern first before moving to the next part. Before we use that to test XAF application's business logic and almost everything an XafApplication can do (which is the reason of this series), let's explore the pattern a little more an look into about an integration or unit test that needs an WinApplication.

```cs
public class WinApplicationBuilder : WinApplicationBuilder<WinApplication, WinApplicationBuilder> { }

public class WinApplicationBuilder<TApplication, TBuilder> : XafApplicationBuilder<TApplication, TBuilder>
    where TApplication : WinApplication
    where TBuilder : WinApplicationBuilder<TApplication, TBuilder>
{
    protected override TApplication Create() => (TApplication)new WinApplication();

    public override TApplication Build()
    {
        var application = base.Build();

        application.SplashScreen =
            SplashScreen
            ?? application.SplashScreen;

        return application;
    }

    protected ISplash SplashScreen { get; set; }
    public TBuilder WithSplashScreen(ISplash splashScreen)
    {
        SplashScreen = splashScreen;
        return This;
    }
}

public class WinApplicationBuilderTests
{
    [Fact]
    public void HasSplashScreen()
    {
        var splash = A.Fake<ISplash>();
        var application = new WinApplicationBuilder()
            .WithSplashScreen(splash)
            .Build();

        application.SplashScreen.ShouldBe(splash);
    }

    [Fact]
    public void UsesSplashScreen()
    {
        var splash = A.Fake<ISplash>();
        var application = new WinApplicationBuilder()
            .WithSplashScreen(splash)
            .Build();

        application.StartSplash();
        application.StopSplash();

        A.CallTo(() => splash.Start()).MustHaveHappened()
            .Then(A.CallTo(() => splash.Stop()).MustHaveHappened());
    }
}
```

> In my tests i use the following libraries:  
> [XUnit](//xunit.net/)  
> [Shouldly](//github.com/shouldly/shouldly)  
> [FakeItEasy](//fakeiteasy.github.io/)

Can you see the pattern emerge? We don't need to re implement all the properties that are used in the `XafApplicationBuilder`. For each derived type we can change the builder, add properties, mock stuff out. If that is a lot of testing jargon for now, I'll cover that later in this series.

But look at those 2 tests. The first one `HasSplashScreen` tests the builder. That's something we already covered. But the second one `UsesSplashScreen` does actually test behavior of the `WinApplication` instance! We start the splash screen with `StartSplash` and stop it with `StopSplash`. After that we are asserting the `Start` call happened before the `Stop` call!

But wait, that only tests the `WinApplication` it self?!? Isn't that something the XAF-Team should do?!? Yes you are correct. But now you hopefully can see how this pattern builds out, and makes our test code much cleaner and easier to reason about. Start testing the behavior of your own Application! It's not that hard, and extremely useful!

Can you spot why the recursive generic is here so powerful?

```cs
var application = new WinApplicationBuilder()
    .Build();

application.StartSplash();
```

Look mom, no casts! The `StartSplash` is defined on the `WinApplication` class it self! But cause we narrowed down the types in the concrete `WinApplicationBuilder`, so we don't have to cast at all in our tests:

```cs
public class WinApplicationBuilder : WinApplicationBuilder<WinApplication, WinApplicationBuilder> { }
```

## Recap

We used the Bloch's builder pattern to make our tests more readable.  
Test code is equally important production code! Tread it with care! Refactor it like you would do production code!

> If you find interesting what I'm doing, consider becoming a [patreon](//www.patreon.com/biohaz999) or [contact me](//www.delegate.at/) for training, development or consultancy.

I hope this lays out a good foundation for this promising and very interesting [series](/series/{{page.series}}).
The source code for this class is on [github](//github.com/biohazard999/Scissors.FeatureCenter/blob/master/src/Scissors.ExpressApp/Builders/XafApplicationBuilder.cs).

Happy testing!