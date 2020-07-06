---
 layout: post 
 title: 'Tasty - Delicious dotnet testing'
 comments: true
 tags: ["Tasty", "Testing", "BestPractices", "dotnet", "dotnetcore", "IntegrationTesting", "UITest", "UnitTesting", "Xenial", "async", "await"]
 series: Tasty
 github: Tasty
 author-github: xenial-io
---

I want to share some insights on a project I am working on for the last couple of months. I had the idea for the project when working at [Ranorex](//www.ranorex.com). So what is this, and why you should care.

## *Delicious* dotnet testing

When working at Ranorex I worked on a project called [Webtestit](//www.ranorex.com/shop/webtestit/). It supported Java and Javascript/Typescript tests at the time. In Java world it uses JUnit under the hood, and in JS world its [jasmine](//github.com/jasmine/jasmine). Internally we switched our testing from jasmine to [jest](//jestjs.io/) which is maintained by facebook.

In dotnet world we use [MSTest](//github.com/microsoft/testfx), [NUnit](//nunit.org/) or the *youngest*  member [xUnit](//xunit.net/) to test our applications/libraries. There are a couple more, but they never really got momentum.

So that's a lot of talk about available options, so why do I mention them? Because there is a **new kid** on the block - [Tasty](//github.com/xenial-io/Tasty).

Highly inspired by the syntax of javascript testing frameworks like jest and jasmine (or mocha) it tries to simplify the overhead of writing tests in C# (I didn't research F# or VB.NET yet).

So let's have a look at a very simple demo test case in Tasty:

```cs
using System;

using static Xenial.Tasty;
using Shouldly;

namespace Xenial.Delicious.CalculatorTests
{
    public class Calculator
    {
        public int Add(int a, int b) => a + b;
        public int Sub(int a, int b) => a - b;
        public int Div(int a, int b) => a / b;
    }

    class Program
    {
        static void Main(string[] args)
        {
            var sut = new Calculator();
            It("should add", () =>
            {
                sut.Add(1, 2).ShouldBe(3);
            });

            It("should subtract", () =>
            {
                sut.Sub(1, 2).ShouldBe(-1);
            });

            It("should not divide by 0", () =>
            {
                sut.Div(1, 0).ShouldBe(-1);
            });

            Run();
        }
    }
}

```

Let's run the project with `dotnet run`:

```txt
👍 [00:00:00.0475]  should add
👍 [00:00:00.0003]  should subtract
👎 [00:00:00.0068]  should not divide by 0
        System.DivideByZeroException: Attempted to divide by zero.
   at Xenial.Delicious.CalculatorTests.Calculator.Div(Int32 a, Int32 b) in C:\F\git\Tasty\test\integration\Xenial.Tasty.CalculatorTests\Program.cs:line 12
   at Xenial.Delicious.CalculatorTests.Program.<>c.<Main>b__0_2() in C:\F\git\Tasty\test\integration\Xenial.Tasty.CalculatorTests\Program.cs:line 34
   at Xenial.Delicious.Scopes.TastyScope.<>c__DisplayClass19_0.<It>b__0() in C:\f\git\Tasty\src\Xenial.Tasty\Tasty.Scope.cs:line 95
   at Xenial.Delicious.Execution.TestMiddleware.ExecuteTestMiddleware.<>c.<<UseTestExecutor>b__0_0>d.MoveNext() in C:\f\git\Tasty\src\Xenial.Tasty\Execution\TestMiddleware\ExecuteTestMiddleware.cs:line 15

=================================================================================================
Summary:              F1 |              I0 |             NR0 |              S2 | T3
Time:    [00:00:00.0068] | [00:00:00.0000] | [00:00:00.0000] | [00:00:00.0479] | [00:00:00.0547]
Outcome:          Failed
=================================================================================================
```

Neat! Using the `static using` feature of C#6 we can simply invoke some methods with a lambda function and we are ready to go.
`Run` will invoke the test cases.

But what is the whole point of this? I can do the same with xUnit you say. Sure that's true, **but** that's not everything that Tasty can do, but let's talk about why I think the modern dotnet needs a new testing approach.

### Motivation

Let's talk about the existing frameworks.

- MSTest was born somewhere in the time frame of [VisualStudio 2005](//en.wikipedia.org/wiki/Visual_Studio_Unit_Testing_Framework) and had a reboot as testfx/MSTestV2 in [mid 2016](//devblogs.microsoft.com/devops/taking-the-mstest-framework-forward-with-mstest-v2/).
- NUnit was originally a port of JUnit in the first place somewhat about the 2004 time frame and has been rewritten several times. At the time of writing it's on version 3.
- xUnit was [introduced by James Newkirk in 2007](//jamesnewkirk.typepad.com/posts/2007/09/announcing-xuni.html) and rewritten at least once.

That's almost 15 years. Time has changed a lot since then. .NET was windows only. Microsoft didn't do open source and DevOps wasn't even invented yet. There was no cloud. So let's think if those tools are still flexible and valuable enough.

Let's look at the [motivation of xUnit](https://xunit.net/docs/why-did-we-build-xunit-1.0).

Basically everything in there is aimed to reduce noise you have to write and execute tests.

I really like xUnit because it tries to get out of your way as much as it possible can, but there is much room for improvement.

Every time I need to implement a more complex test scenario, I need to lookup docs and use the class initialize or collection initialize things. The rules in which order they will be initialized is totally out of my control. This leads to more boilerplate code and weird behavior esp. when dealing with async code. When stuff fails in the init phase, error messages and debugging becomes really difficult.
It doesn't leverage the things I know about C# (except constructors and IDisposable), its very hard to extend (mostly because of lack of documentation), and most of all: it's very hard to structure and name test cases (and I know that you can do nested test classes).

Another problem I have with all frameworks is: They are like magical black boxes, don't run the same on trillions of test runners out there and you have little to no control about the environment you are running in or how reports should look like.

Data driven tests are another problem, esp. when you are working with domain experts on tests, that provide data in an external source (excel files, some kind of database etc etc). Most of them now have analyzers that will warn you if parameters don't match your test signature, but naming the test cases is a nightmare.
Don't get me wrong here, everything is possible with all the mentioned frameworks above, but writing all the boilerplate and knowing the internals of them is **hard**.

And last but not least: those frameworks are not really cross platform. All the tools (for example NCrunch) will never hit for example VSCode or VS for Mac.  It's getting harder and harder to write and execute tests on platforms unsupported by runners. With net5 we will be able to run dotnet from a raspberry pi to [fu**ing fridges](https://docs.tizen.org/application/dotnet/index).

Inspired by other awesome micro frameworks like [bullseye](//github.com/adamralph/bullseye) and [simple-exec](//github.com/adamralph/simple-exec) by [Adam Ralph](//adamralph.com/about/) I think it's time for a new era and approach of dotnet testing.

### Current and nearby features

At the time of writing this there are several things that are possible today, but there is a lot of work to do.

#### Test groups / Describe

In jest or other JS frameworks groups are description blocks that can be nested as you like.

```cs
static async Task<int> Main(string[] args)
{
    Describe("A group", () =>
    {
        It("can contain a test", () => true);

        Describe("with nesting", () =>
        {
            It("should be allowed", () => true);
        });

        Describe("that has multiple groups", () =>
        {
            Describe("with really deep nesting", () =>
            {
                It("should be allowed", () => true);
            });
        });
    });

    return await Run(args);
}
```

```txt
👍 [00:00:00.0075]  A group can contain a test
👍 [00:00:00.0001]  A group with nesting should be allowed
👍 [00:00:00.0000]  A group that has multiple groups with really deep nesting should be allowed

=================================================================================================
Summary:              F0 |              I0 |             NR0 |              S3 | T3
Time:    [00:00:00.0000] | [00:00:00.0000] | [00:00:00.0000] | [00:00:00.0078] | [00:00:00.0078]
Outcome:         Success
=================================================================================================
```

#### Focused and Ignored Tests

It should be possible to focus on single test cases or groups, this is esp. useful when debugging, troubleshooting failing tests or doing TDD.

```cs
static async Task<int> Main(string[] args)
{
    Describe("ForcedTests", () =>
    {
        It("Should not run #1", () => false);
        FIt("Should run #1", () => true);
        FIt("Should run #2", () => true);
        It("Should not run #2", () => false);

        FDescribe("All those tests are in focus mode", () =>
        {
            It("Focused #1", () => true);
            It("Focused #2", () => true);
            It("Focused #3", () => false)
                .Ignored("I'm ignored 😥");
        });
    });

    return await Run(args);
}
```

```txt
👍 [00:00:00.0064]  ForcedTests Should run #1
👍 [00:00:00.0003]  ForcedTests Should run #2
👍 [00:00:00.0001]  ForcedTests All those tests are in focus mode Focused #1
👍 [00:00:00.0002]  ForcedTests All those tests are in focus mode Focused #2
🙄 [00:00:00.0003]  ForcedTests All those tests are in focus mode Focused #3
        I'm ignored 😥

=================================================================================================
Summary:              F0 |              I1 |             NR2 |              S4 | T7
Time:    [00:00:00.0000] | [00:00:00.0003] | [00:00:00.0000] | [00:00:00.0071] | [00:00:00.0074]
Outcome:         Success
=================================================================================================
```

#### Return values

It should be easy to fail a test, but allow as much context as possible. So there are a lot of overloads that make your life a little bit easier.

```cs
static void Main(string[] args)
{
    Describe("Return values", () =>
    {
        It("can be void", () =>
        {
            var add = 1 + 1;
            Console.WriteLine($"1 + 2 = {add}");
        });

        It("with throwing an exception", () =>
        {
            void Sut() => throw new Exception("Foo");
            Sut();
        });

        It("can be booleans", () => true);

        It("can be tuples to provide context", () =>
        {
            return (false, "This is the reason for the fail");
        });

        It("can be async", async () =>
        {
            await Task.CompletedTask;
            return true;
        });
    });

    Run();
}
```

```txt
1 + 2 = 2
👍 [00:00:00.0089]  Return values can be void
👎 [00:00:00.0004]  Return values with throwing an exception
        System.Exception: Foo
   at Xenial.Delicious.ReturnValueTests.Program.<Main>g__Sut|0_6() in C:\F\git\Tasty\test\integration\Xenial.Tasty.ReturnValueTests\Program.cs:line 22
   at Xenial.Delicious.ReturnValueTests.Program.<>c.<Main>b__0_2() in C:\F\git\Tasty\test\integration\Xenial.Tasty.ReturnValueTests\Program.cs:line 23
   at Xenial.Delicious.Scopes.TastyScope.<>c__DisplayClass19_0.<It>b__0() in C:\F\git\Tasty\src\Xenial.Tasty\Tasty.Scope.cs:line 95
   at Xenial.Delicious.Execution.TestMiddleware.ExecuteTestMiddleware.<>c.<<UseTestExecutor>b__0_0>d.MoveNext() in C:\F\git\Tasty\src\Xenial.Tasty\Execution\TestMiddleware\ExecuteTestMiddleware.cs:line 15
👍 [00:00:00.0002]  Return values can be booleans
👎 [00:00:00.0006]  Return values can be tuples to provide context
        This is the reason for the fail
👍 [00:00:00.0013]  Return values can be async

=================================================================================================
Summary:              F2 |              I0 |             NR0 |              S3 | T5
Time:    [00:00:00.0010] | [00:00:00.0000] | [00:00:00.0000] | [00:00:00.0105] | [00:00:00.0116]
Outcome:          Failed
=================================================================================================
```

#### Datadriven tests

Because Tasty is just an intelligent wrapper around lambdas and collecting a tree of test cases, we can use interpolated strings to identify test cases. **YOU** are in *total* control. Of course there is a lot that could be done by providing a more descriptive syntax, but this early in the iteration cycle, I think it's reasonable concise.  

```cs
static async Task<int> Main(string[] args)
{
    Describe("Data driven tests", async () =>
    {
        var numbers = Enumerable.Range(0, 3);

        foreach (var number in numbers)
        {
            It($"can be as simple as a foreach #{number}", () => true);
        }

        numbers
            .Select((n) => It($"can be a linq expression #{n}", () => true))
            .ToList();

        using (var reader = File.OpenText("data.txt"))
        {
            var fileText = await reader.ReadToEndAsync();
            var cases = fileText.Split(Environment.NewLine);

            foreach (var @case in cases)
            {
                It($"can be anything, your imagination is the limit #{@case}", () => true);
            }
        }
    });

    return await Run();
}
```

```txt
👍 [00:00:00.0074]  Data driven tests can be as simple as a foreach #0
👍 [00:00:00.0000]  Data driven tests can be as simple as a foreach #1
👍 [00:00:00.0000]  Data driven tests can be as simple as a foreach #2
👍 [00:00:00.0000]  Data driven tests can be a linq expression #0
👍 [00:00:00.0000]  Data driven tests can be a linq expression #1
👍 [00:00:00.0000]  Data driven tests can be a linq expression #2
👍 [00:00:00.0001]  Data driven tests can be anything, your imagination is the limit #1 Hello
👍 [00:00:00.0000]  Data driven tests can be anything, your imagination is the limit #2 From
👍 [00:00:00.0000]  Data driven tests can be anything, your imagination is the limit #3 TXT

=================================================================================================
Summary:              F0 |              I0 |             NR0 |              S9 | T9
Time:    [00:00:00.0000] | [00:00:00.0000] | [00:00:00.0000] | [00:00:00.0077] | [00:00:00.0077]
Outcome:         Success
=================================================================================================
```

#### Declarative syntax

Besides the global import, its also possible to use the OOP style syntax and object model, although it's not that pretty right now:

```cs
static async Task<int> Main(string[] args)
{
    var scope = new TastyScope()
        .RegisterReporter(ConsoleReporter.Report)
        .RegisterReporter(ConsoleReporter.ReportSummary);

    var group = scope.Describe("I'm a group", () => { });

    group.It("with an test case", () => true);

    return await scope.Run();
}
```

```txt
👍 [00:00:00.0040]  I'm a group with an test case

=================================================================================================
Summary:              F0 |              I0 |             NR0 |              S1 | T1
Time:    [00:00:00.0000] | [00:00:00.0000] | [00:00:00.0000] | [00:00:00.0040] | [00:00:00.0040]
Outcome:         Success
=================================================================================================
```

#### Lifecycle

Because every test framework needs some lifecycle hooks, I start with the easiest one first.

##### Native

dotnet now supports tuples as native return values and I think they are a wonderful pattern for small groups of functions. In combination with C# local functions they really provide a nice syntax and no magic from Tasty is involved here:

```cs
class Calculator
{
    private Action<int> Printer;
    internal Calculator(Action<int> printer)
        => Printer = printer;

    private int Sum;

    internal void Add(int a, int b)
    {
        Sum += a + b;
        Print();
    }

    internal void Sub(int a, int b)
    {
        Sum += a - b;
        Print();
    }

    private void Print()
        => Printer(Sum);
}

static void Main(string[] args)
{
    Describe("LifecycleNativeTests", () =>
    {
        (Calculator calc, Action<int> printer) CreateSut(Action<int> printer)
        {
            var calc = new Calculator(printer);
            return (calc, printer);
        }

        It("should use C#'s features to do addition", () =>
        {
            var (calc, printer) = CreateSut(A.Fake<Action<int>>());

            calc.Add(1, 2);

            A.CallTo(() => printer(3)).MustHaveHappened();
        });

        It("should use C#'s features to do subtraction", () =>
        {
            var (calc, printer) = CreateSut(A.Fake<Action<int>>());

            calc.Sub(1, 2);

            A.CallTo(() => printer(-1)).MustHaveHappened();
        });
    });

    Run();
}
```

```txt
👍 [00:00:00.1228]  LifecycleNativeTests should use C#'s features to do addition
👍 [00:00:00.0019]  LifecycleNativeTests should use C#'s features to do subtraction

=================================================================================================
Summary:              F0 |              I0 |             NR0 |              S2 | T2
Time:    [00:00:00.0000] | [00:00:00.0000] | [00:00:00.0000] | [00:00:00.1247] | [00:00:00.1247]
Outcome:         Success
=================================================================================================
```

##### Built in

Because Tasty is basically a wrapper, we can use C#'s power to control the lifecycle, but use some hooks to make our life a little bit easier.

```cs
class Calculator
{
    private Action<int> Printer;
    internal Calculator(Action<int> printer)
        => Printer = printer;

    internal int Sum;

    internal void Add(int a, int b)
    {
        Sum += a + b;
        Print();
    }

    internal void Sub(int a, int b)
    {
        var r =  a - b;
        Sum += r;
        Print();
    }

    private void Print()
        => Printer(Sum);

    internal void Reset()
        => Sum = 0;
}

static void Main(string[] args)
{
    Describe("LifecycleTests", () =>
    {
        Describe("with expected side effects", () =>
        {
            Calculator? calc = null;
            Action<int>?  printer = null;

            BeforeEach(() =>
            {
                printer = A.Fake<Action<int>>();
                calc = new Calculator(printer);
                return Task.CompletedTask; // API is not ready yet, so we have to deal with tasks even if it's sync
            });

            It("should use Tasty's features to do addition", () =>
            {
                calc!.Add(1, 2);

                A.CallTo(() => printer!(3)).MustHaveHappened();
            });

            It("should use Tasty's features to do subtraction", () =>
            {
                calc!.Sub(1, 2);

                A.CallTo(() => printer!(-1)).MustHaveHappened();
            });
        });

        Describe("with side effects", () =>
        {
            var printer = A.Fake<Action<int>>();
            var calc = new Calculator(printer);

            AfterEach(() =>
            {
                calc.Reset();
                return Task.CompletedTask; // API is not ready yet, so we have to deal with tasks even if it's sync
            });

            It("should do addition", () =>
            {
                calc.Add(1, 1);

                A.CallTo(() => printer(2)).MustHaveHappened();
            });

            It("should do subtraction", () =>
            {
                calc.Sub(2, 2);

                A.CallTo(() => printer(0)).MustHaveHappened();
            });
        });
    });

    Run();
}

```

```txt
👍 [00:00:00.0308]  LifecycleTests with expected side effects should use Tasty's features to do addition
👍 [00:00:00.0016]  LifecycleTests with expected side effects should use Tasty's features to do subtraction
👍 [00:00:00.0013]  LifecycleTests with side effects should do addition
👍 [00:00:00.0003]  LifecycleTests with side effects should do subtraction

=================================================================================================
Summary:              F0 |              I0 |             NR0 |              S4 | T4
Time:    [00:00:00.0000] | [00:00:00.0000] | [00:00:00.0000] | [00:00:00.0341] | [00:00:00.0341]
Outcome:         Success
=================================================================================================
```

#### Pipelines, Middleware & Reporters

Similar to `aspnetcore` there is a test pipeline. Because there is no test discovery in the classical sense (compared to the annotated frameworks like xUnit) there are several pipelines controlling the execution of `TestGroups` and `TestCases`. You will be able to hook into the pipeline using custom middleware to control this flow, but that is beyond the scope of this introduction.

Reporters on the other hand let you control what kind of test result you want to produce. Want to export to Excel, or call some API's (For example Jira) in case of a test failure? Feel free to implement what ever you want there. Because every reporter is also async, it's pretty easy.
This will allow more complex reporters, for example in Blazor Webassembly running inside the browser using a Websocket/SignalR reporter reporting back into a report listener out of process.

However at the time of writing, there is only a console reporter yet. An xUnit compatible reporter is in research to provide richer UX in CI systems like Azure DevOps, Github Actions, Jenkins etc.

### Color Schemes & Localization

This is more a accessibility feature, but I think it's something all applications should be able to provide value to users with physical disabilities (color blindness, high contrast, etc...)

At this time it's possible to change the colors and icons used in the console reporter.

```cs
static void Main(string[] args)
{
    ConsoleReporter.Scheme = new ColorScheme
    {
        ErrorIcon = "🤬",
        ErrorColor = ConsoleColor.Magenta,
        SuccessIcon = "🥰",
        SuccessColor = ConsoleColor.White
    };

    Describe("ColorSchemes", () =>
    {
        It("can be adjusted", () => true);
        It("can be whatever you want", () => false);
    });

    Run();
}
```

```txt
🥰 [00:00:00.0068]  ColorSchemes can be adjusted
🤬 [00:00:00.0002]  ColorSchemes can be whatever you want

=================================================================================================
Summary:              F1 |              I0 |             NR0 |              S1 | T2
Time:    [00:00:00.0002] | [00:00:00.0000] | [00:00:00.0000] | [00:00:00.0068] | [00:00:00.0070]
Outcome:          Failed
=================================================================================================
```

### Future plans and vision

I've covered a lot about the features there are in there yet, but let's talk about the goals and visions I have for this project.

#### Test execution and flavors of testing

The first on is around the test execution itself. Right now there is no way to specify which tests run in what order. They will always run in the order you specify. The same goes with parallel test execution. Tests run linear at the time. This is great for a lot of tests, that focus more on integration or BDD style of tests. You can describe a BDD style *Given-When-Then* scenario very easily right now, because of linear test execution:

```cs

foreach(var user in users)
{
    Describe("Given a user", () =>
    {
        It($"with the name {user.name}");
        foreach(var password in passwords)
        {
            It($"and a password {password}", () => user.Password = password);
        }
        It("when logging in", async () => await logonService.Logon(user));

        It("should be logged on", () => user.IsLoggedIn);
    });
}
```

I can imagine a lot of syntactic sugar that makes this kind of scenarios easier, by just importing another *dialect* of tasty let's name it `using static Xenial.TastyBehavior`. That would result in a different method of building the testing tree and *execution engine* under the hood. Without loosing the control over the engine.

The same will go for unit*tasting* - make this phrase a thing! -  where parallel test execution and random execution order should be used to look into race conditions or hidden state. Think of this as like `using static Xenial.UnitTasting`. This will execute all tests inside this file as unit tests, in randomized and parallel order. The syntax will mirror the normal `Tasty` one but applies additional attributes on the `Describe` and `It` methods.

#### Code coverage and test impact analysis

I did already a little bit of prototyping with code coverage using [coverlet](//github.com/coverlet-coverage/coverlet) and they are going to expose their [api's as a nuget package](//github.com/coverlet-coverage/coverlet/pull/628/files).

A test platform without coverage reports is a little bit dull.

Also, without coverage there is also no way to support more advanced scenarios like [test impact analysis](//docs.microsoft.com/en-us/azure/devops/pipelines/test/test-impact-analysis?view=azure-devops).

If we are looking into the future, I also can imagine coverage reports for remote process execution, like for example E2E eg. UI tests. That will give you greater insights what kind of code paths you are covering with tests further up in the testing pyramid.

#### Live testing, code generation and protocols

As mentioned earlier, I think in a world with open compilers, tools like Omnisharp, VSCode and Visual Studio for Mac, it's time to think about a external test runner that controls tests execution and provides feedback to the IDE in a separate process. That would require an open protocol that IDE's and test executors understand to quickly run tests and report coverage and test outcome back to the IDE.
Currently there is no tool out there that does that in an open, language independent way. [wallabyjs](//wallabyjs.com/) and [ncrunch](//www.ncrunch.net/) are awesome tools but there isn't an common denominator between tooling in the IDE part and test execution on the other part. Take VSCode and language servers with the [Language Server Protocol](//microsoft.github.io/language-server-protocol/) as an inspiration.

On the other hand there are a lot of scenarios internally in the `Tasty` code base as well in generating test cases using the new [source generators feature](//devblogs.microsoft.com/dotnet/introducing-c-source-generators/) i can think of.
Using, for example, [gherkin](//cucumber.io/docs/gherkin/) to generate the bloat of boiler plate code that is needed to translate between business requirements and C# code.

#### Assertions and snapshot testing

Right now I have no intend to add another assertion library into the dotnet space. There are a lot of great ones out there and nothing should prevent you from using them. That's the reason Tasty does not come with an assertion library by default. As mentioned earlier, you have several ways to control if the test fails by returning a bool, tuple or throwing an exception. Most of them throw an exception (which is fine, besides performance). So you can use `xUnit`, `Nunit`, [Shouldly](//github.com/shouldly/shouldly) or [fluentassertions](//fluentassertions.com/).

There is one exception to all that: snapshot or [approval testing](//approvaltests.com/).
In JS land, esp with reactjs/vuejs this is a huge deal. I think further to blazor and other more C# scenarios like generating PDF reports and Excel files where snapshot testing can be extremely valuable. I did a lot of this kind of testing in the past with large success, but always found it either hard to do and tooling about approving and reporting differences is really chunky and hurts the flow a lot.

There is a lot that can improve there. GIT isn't going away anywhere soon, we can do a lot more than checking in a couple of binaries into version control and opening some diff tools.

### Summary and the community

I think there is no better time to rethink how we test dotnet applications in the future. But having a vision and doing this all on my own will not work. There is so much space for the community to decide how the future should look like. I also think there are some business opportunities for tooling and around snapshot testing as well. But I think this project should belong to the community in the first place and be open from day zero.
Let me know what do you think about Tasty and what do you think about my vision. There is just too much in my head to write all down at once, not leaving you back in total confusion afterwards.

Leave me issues, ideas, questions, thoughts or contributions in the [github repository](//github.com/xenial-io/Tasty) where you can also find a [quick start](https://tasty.xenial.io) and some details about consuming and contributing. Also feel free to use the disqus comments in the blog.

Make the future of dotnet testing delicious with Tasty

🍔 Manuel

![Tasty Logo](https://tasty.xenial.io/assets/img/icon-256x256.png)
<div>Icons made by <a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
