---
 layout: post 
 title: "T is for Testing: XAF & XPO - Test Data 2"
 comments: true
 github: Scissors.XafTemplates
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
        WithFirstName("John");
        WithLastName("Doe");
        WithSalutation("Mr.");
    }
}
```