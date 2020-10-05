---
 layout: post 
 title: "T is for Testing: XAF & XPO - Test Data 2"
 github: Scissors.FeatureCenter
 tags: ["Testing", "XAF", "XPO", "Builder", "Patterns", "DevExpress"]
 series: t-is-for-testing-xaf-xpo
---

Testing is an important part of a developers responsibilities, especially in a fast moving agile world!
This is the first post in a [series](/series/{{page.series}}) on testing patterns I used and discovered when testing applications using XAF and XPO applications.

Although the patterns I use are focusing on testing XAF and XPO applications, most of them may apply to not only on testing and not only on XAF applications.
After learning about the builder pattern in the [last post](/2019/05/17/t-is-for-testing-xaf-xpo-builder-pattern-1.html) we now can focus on providing test data for our tests. So let's get started!

## Test data

Before we talk about testing business logic, we need to think about test data first. What data is expected, which is unexpected. What happens if we for example have an external system putting data into our database, bypassing application logic and validation.  
Providing test data especially for lookup data is a tedious task, but now we know the bloch's builder pattern we can use it to provide test data, and seed our data.  
In this example I will use a simple time tracking app. An employee can record an time entry on a project with an specific activity.

```cs
[Persistent("Person")]
public class Person : MakeifyBaseObject
{
    public Person(Session session) : base(session) { }

    string _Salutation;
    [Persistent("Salutation")]
    public string Salutation { get => _Salutation; set => SetPropertyValue(ref _Salutation, value); }

    string _FirstName;
    [Persistent("FirstName")]
    public string FirstName { get => _FirstName; set => SetPropertyValue(ref _FirstName, value); }

    string _LastName;
    [Persistent("LastName")]
    public string LastName { get => _LastName; set => SetPropertyValue(ref _LastName, value); }
}

[Persistent("Project")]
public class Project : MakeifyBaseObject
{
    public Project(Session session) : base(session) { }

    string _Name;
    [Persistent("Name")]
    public string Name { get => _Name; set => SetPropertyValue(ref _Name, value); }
}

[Persistent("Activity")]
public class Activity : MakeifyBaseObject
{
    public Activity(Session session) : base(session) { }

    string _Name;
    [Persistent("Name")]
    public string Name { get => _Name; set => SetPropertyValue(ref _Name, value); }
}

[Persistent("TimeEntry")]
public class TimeEntry : MakeifyBaseObject
{
    public TimeEntry(Session session) : base(session) { }

    Activity _Activity;
    [Persistent("Activity")]
    public Activity Activity { get => _Activity; set => SetPropertyValue(ref _Activity, value); }

    Project _Project;
    [Persistent("Project")]
    public Project Project { get => _Project; set => SetPropertyValue(ref _Project, value); }

    Person _Employee;
    [Persistent("Employee")]
    public Person Employee { get => _Employee; set => SetPropertyValue(ref _Employee, value); }

    DateTime? _Start;
    [Persistent("Start")]
    public DateTime? Start { get => _Start; set => SetPropertyValue(ref _Start, value); }

    DateTime? _End;
    [Persistent("End")]
    public DateTime? End { get => _End; set => SetPropertyValue(ref _End, value); }

    string _Description;
    [Persistent("Description")]
    [Size(SizeAttribute.Unlimited)]
    public string Description { get => _Description; set => SetPropertyValue(ref _Description, value); }
}
```

As you can see there is nothing fancy, just a bunch of persistent classes. Let's think about a possible business requirement:

- As a manager I want to know the project times, so I can charge the customer money.
  - Sum up all time entries grouped by project, employee and activity.
  - If there is no project it goes on the *no project* pile
  - if there is no activity it goes on the *general activity* pile
  - If there is no employee it goes on the *no employee* pile
  - If there is no start date it will count as 0
  - If there is no end date it count as 0

So we know for sure, we will need test data for projects, activities and employees. If we want to test only the business logic, we can write a unit test, so just use an `XPObjectSpaceProviderBuilder`, setup a `TestFixture` and use custom builders to prepare the test case. For now we will just do it as an `InMemory` test, but later on, we can do an integration test, with a real database to be sure we get the expected results (for example in a nightly build on the CI-Server).  
Let's look real quick at the `PersonBuilder` cause it contains a new concept for the builder pattern called `Guards`.

```cs
public abstract class XpObjectBuilder<TBuilder, TObject>
        where TObject : IXPObject
        where TBuilder : XpObjectBuilder<TBuilder, TObject>
{
    protected TBuilder This => (TBuilder)this;

    Session _Session;
    protected Session Session
    {
        get
        {
            GuardSession();
            return _Session;
        }

        set => _Session = value;

    }

    protected virtual void GuardSession()
    {
        if(_Session == null)
        {
            throw new ArgumentNullException(nameof(Session), $"Cannot create object without '{nameof(Session)}' use '{nameof(WithSession)}' to create '{typeof(TObject).FullName}'");
        }
    }

    public TBuilder WithSession(Session session)
    {
        Session = session;
        return This;
    }
}

public class PersonBuilder : PersonBuilder<PersonBuilder, Person> { };

public class PersonBuilder<TBuilder, TPerson> : XpObjectBuilder<TBuilder, TPerson>
    where TPerson : Person
    where TBuilder : PersonBuilder<TBuilder, TPerson>
{
    protected virtual TPerson Create() => (TPerson)new Person(Session);

    public virtual TPerson Build()
    {
        var person = Create();

        person.FirstName = FirstName ?? person.FirstName;
        person.Salutation = Salutation ?? person.Salutation;
        person.LastName = LastName ?? person.LastName;

        return person;
    }

    protected string Salutation { get; set; }
    public TBuilder WithSalutation(string salutation)
    {
        Salutation = salutation;
        return This;
    }

    protected string FirstName { get; set; }
    public TBuilder WithFirstName(string firstName)
    {
        FirstName = firstName;
        return This;
    }

    protected string LastName { get; set; }
    public TBuilder WithLastName(string lastName)
    {
        LastName = lastName;
        return This;
    }
}
```

Cause the person constructor needs an `Session` instance, we guard from improper usage, and inform the developer using the builder to use `WithSession` first.
Of course we could use a constructor to provide a `Session` (for example with DependencyInjection), but for now let's keep it like this. After that we can create a JohnDoePersonBuilder:

```cs
public class JohnDoePersonBuilder : JohnDoePersonBuilder<JohnDoePersonBuilder, Person> { };

public class JohnDoePersonBuilder<TBuilder, TPerson> : PersonBuilder<TBuilder, TPerson>
    where TPerson : Person
    where TBuilder : JohnDoePersonBuilder<TBuilder, TPerson>
{
    public JohnDoePersonBuilder()
    {
        WithSalutation("Mr.");
        WithFirstName("John");
        WithLastName("Doe");
    }
}
```

Now we can use the `JohnDoePersonBuilder` in our tests or even in production (for example when seeding the database). This allows the team to agree on a set of test data, but is able to change some properties in test variations.

## Test structure & Lazy test fixtures

After defining data we need in our tests, we can talk about another pattern that comes in handy when dealing with expensive test resources. [Lazy<T>](//docs.microsoft.com/en-us/dotnet/api/system.lazy-1?view=netframework-4.8) is a often overlooked type in the [.NET BCL](//docs.microsoft.com/en-us/dotnet/standard/net-standard). But it is a really helpful class (or [monad](//en.wikipedia.org/wiki/Monoid) if you want to think functional).  
It makes sure the instance you want to produces lazily, is created at the first usage, afterwards it always returns the same instance. Feels like a singleton, but of course it's not. [Singletons are evil](//stackoverflow.com/questions/137975/what-is-so-bad-about-singletons) (esp. when it comes to testing)!

We are using [xUnit](//xunit.net/) here, but the following pattern will work in [NUnit](//nunit.org/) as well, the usage is a little bit different.

### Test fixtures

Test fixtures allow us to share resources across tests. That's neat, normally we shouldn't do that, cause tests should be independent. But if resources are expensive to create, they are the way to go. Faster tests are better than slower tests, and slow tests means slow feedback. Slow feedback leads to no automatic testing, so let's not do that.

```cs
public class TimeEntryFixture : IDisposable, IObjectSpaceFactory
{
    public TimeEntryFixture()
    {
        var typesInfo = new TypesInfo();
        var typesInfoSource = new XpoTypeInfoSourceBuilder()
            .WithTypesInfo(typesInfo)
            .WithTypes(ModelTypes.Types.ToArray()) // Types that the test uses
            .Build();

        ObjectSpaceProviderBuilder = new XPObjectSpaceProviderBuilder()
            .InMemory() // Here comes the power of builders
            .WithTypesInfo(typesInfo)
            .WithTypesInfoSource(typesInfoSource);

        // Here is the lazy magic
        _ObjectSpaceProvider = new Lazy<IObjectSpaceProvider>(() => ObjectSpaceProviderBuilder.Build());
    }

    public XPObjectSpaceProviderBuilder ObjectSpaceProviderBuilder { get; }

    // The Lazy instance
    private Lazy<IObjectSpaceProvider> _ObjectSpaceProvider;
    // Once Value is accessed for the first time, the ObjectSpaceProvider is created an will be used until the process stops
    public IObjectSpaceProvider ObjectSpaceProvider => _ObjectSpaceProvider.Value;

    public void Dispose()
    {
        // Only dispose if the actual value was created
        // -> If nothing was created, there is nothing we need to dispose
        if(_ObjectSpaceProvider.IsValueCreated && _ObjectSpaceProvider.Value is IDisposable)
        {
            ((IDisposable)ObjectSpaceProvider).Dispose();
        }
    }

    // ObjectSpaceFactory will be covered later in this series
    public IObjectSpace CreateObjectSpace(Type objectType) => ObjectSpaceProvider.CreateObjectSpace();

    // Drop the database.
    public TimeEntryFixture ClearDataBase()
    {
        using(var os = ObjectSpaceProvider.CreateObjectSpace())
        {
            ((XPObjectSpace)os).Session.ClearDatabase();
        }

        // Just for cosmetics, then we can use expression body constructors in our tests
        return this;
    }
}
```

## The actual test

Now let's look at the usage:

```cs
// Extension method to provide a session to the builder
// There is a more elegant way, but we cover that later
public static class XpObjectBuilderExtensions
{
    public static TBuilder WithObjectSpace<TBuilder, TObject>(this TBuilder builder, IObjectSpace objectSpace)
        where TObject : IXPObject
        where TBuilder : XpObjectBuilder<TBuilder, TObject>
            => builder.WithSession(((XPObjectSpace)objectSpace).Session);
}

// We are using the TimeEntryFixture
public class TimeEntryTests : IClassFixture<TimeEntryFixture>
{
    readonly TimeEntryFixture _Fixture;
    public TimeEntryTests(TimeEntryFixture fixture)
        // Clear the database every time a test is executed
        => _Fixture = fixture.ClearDataBase();

    [Fact]
    public void JohnDoeShouldExist()
    {
        // Arrange: Create test data
        using(var os = _Fixture.ObjectSpaceProvider.CreateObjectSpace())
        {
            var johnDoe = new JohnDoePersonBuilder()
                // This is a little bit ugly now, but we will cover that in a later post.
                .WithObjectSpace<JohnDoePersonBuilder, Person>(os)
                .Build();
            os.CommitChanges();
        }

        using(var os = _Fixture.ObjectSpaceProvider.CreateObjectSpace())
        {
            //Act: find the person created
            var person = os.FindObject<Person>(null);

            //Assert
            person.ShouldSatisfyAllConditions(
                () => os.GetObjectsCount(typeof(Person), null).ShouldBe(1),
                () => person.ShouldNotBeNull(),
                () => person.Salutation.ShouldBe("Mr."),
                () => person.FirstName.ShouldBe("John"),
                () => person.LastName.ShouldBe("Doe")
            );
        }
    }

    [Fact]
    public void JaneDowShouldExist()
    {
        //Arrange: Now test data is slightly modified
        using(var os = _Fixture.ObjectSpaceProvider.CreateObjectSpace())
        {
            var johnDoe = new JohnDoePersonBuilder()
                .WithObjectSpace<JohnDoePersonBuilder, Person>(os)
                .WithSalutation("Mrs.")
                .WithFirstName("Jane")
                .Build();
            os.CommitChanges();
        }

        using(var os = _Fixture.ObjectSpaceProvider.CreateObjectSpace())
        {
            //Act: Find the person created
            var person = os.FindObject<Person>(null);

            //Assert: We didn't specify Doe, but of course it's still there 
            person.ShouldSatisfyAllConditions(
                () => person.ShouldNotBeNull(),
                () => person.Salutation.ShouldBe("Mrs."),
                () => person.FirstName.ShouldBe("Jane"),
                () => person.LastName.ShouldBe("Doe")
            );
        }
    }

    [Fact]
    public void JohnDoeShouldNotExist()
    {
        //Cause the database is cleared each time, nothing is there.
        using(var os = _Fixture.ObjectSpaceProvider.CreateObjectSpace())
        {
            var person = os.FindObject<Person>(null);

            person.ShouldBeNull();
        }
    }
}
```

> In my tests i use the following libraries:  
> [XUnit](//xunit.net/)  
> [Shouldly](//github.com/shouldly/shouldly)

Based on the comment's I made in the code, can you spot the places that probably need refactoring? Think about it and let me know in the comments! And what do you think is `IObjectSpaceFactory` is about?

## Recap

We learned the basics of not duplicating test data, unit testing when we need data access using an `ObjectSpaceProvider` and now we are prepared for the next post how to test and structure business logic.
Test code is equally important production code! Treat it with care! Refactor it like you would do production code!

> If you find interesting what I'm doing, consider becoming a [patreon](//www.patreon.com/biohaz999) or [contact me](//www.delegate.at/) for training, development or consultancy.

I hope this pattern helps testing your applications. The next post in this [series](/series/{{page.series}}) will cover testing business logic. The source code the [XpoTypeInfoSourceBuilder](//github.com/biohazard999/Scissors.FeatureCenter/blob/master/src/Scissors.ExpressApp.Xpo/Builders/XpoTypeInfoSourceBuilder.cs) and [XPObjectSpaceProviderBuilder](//github.com/biohazard999/Scissors.FeatureCenter/blob/master/src/Scissors.ExpressApp.Xpo/Builders/XPObjectSpaceProviderBuilder.cs) is on [github](//github.com/biohazard999/Scissors.FeatureCenter). The code of the actual tests will be online later this week.

Happy testing!
