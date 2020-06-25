---
 layout: post 
 title: 'Tasty - Delicious dotnet testing'
 comments: true
 tags: ["Tasty", "Testing", "BestPractices", "dotnet", "dotnetcore", "IntegrationTesting", "UITest", "UnitTesting", "Xenial", "async", "await"]
---

I want to share some insights on a project I am working on for the last couple of months. I had the idea for the project when working at [Ranorex](//www.ranorex.com). So what is this, and why you should care.

## *Delicious* dotnet testing

When working at Ranorex I worked on a project called [Webtestit](//www.ranorex.com/shop/webtestit/). It supported Java and Javascript/Typescript tests at the time. In Java world it uses JUnit under the hood, and in JS world its [jasmine](//github.com/jasmine/jasmine). Internally we switched our testing from jasmine to [jest](//jestjs.io/) which is maintained by facebook.

In dotnet world we use [MSTest](//github.com/microsoft/testfx), [NUnit](//nunit.org/) or the *youngest*  member [xUnit](//xunit.net/) to test our applications/libraries. There are a couple more, but they never really got momentum.

So that's a lot of talk about available options, so why do I mention them? Cause there is a **new kid** on the block - [Tasty](//github.com/xenial-io/Tasty).

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
            It("should add", () =>
            {
                var sut = new Calculator();
                sut.Add(1, 2).ShouldBe(3);
            });

            It("should subtract", () =>
            {
                var sut = new Calculator();
                sut.Sub(1, 2).ShouldBe(-1);
            });

            It("should not divide by 0", () =>
            {
                var sut = new Calculator();
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
- NUnit were a port of JUnit in the first place somewhat about the 2004 time frame and has been rewritten several times. At the time of writing it's on version 3.
- xUnit was [introduced by James Newkirk in 2007](//jamesnewkirk.typepad.com/posts/2007/09/announcing-xuni.html) and rewritten at least once.

Let's look at the [motivation of xUnit](https://xunit.net/docs/why-did-we-build-xunit-1.0).

Basically everything in there is aimed to reduce noise you have to write and execute tests.

I really like xUnit cause it tries to reduce the amount of boilerplate as much as it possible can, but there is much room for improvement.

Every time I need to implement a more complex test scenario, I need to lookup docs and use the class initialize or collection initialize things. The rules in which order they will be initialized is total out of my control. This leads to more boilerplate code and weird behavior esp. when dealing with async code. When stuff fails in the init phase, error messages and debugging becomes really difficult.
It doesn't leverage the things I know about C# (except constructors and IDisposable), its very hard to extend (mostly cause of lack of documentation), and most of all: it's very hard to structure and name test cases.

Another problem I have with all frameworks is: They are like magical black boxes, don't run the same in trillions of test runners out there and you have little to no control about the environment you are running in or how report's should look like.

Data driven tests are another problem, esp. when you are working with domain experts on tests, that provide data in an external source (excel files, some kind of database etc etc). Most of them now have analyzers that will warn you if parameters don't match your test signature, but naming the test cases is a nightmare.
Don't get me wrong here, everything is possible with all the mentioned frameworks above, but writing all the boilerplate and knowing the internals of them is **hard**.

And last but not least: those frameworks are not really cross platform. All the tools (for example NCrunch) will never hit for example VSCode or VS for Mac. You need to have the runners being able to have support for a platform it's getting harder and harder to write and execute tests. With net5 we will be able to run dotnet from a raspberry pi to [fucking fridges](https://docs.tizen.org/application/dotnet/index).

Inspired by other awesome micro frameworks like [bullseye](//github.com/adamralph/bullseye) and [simple-exec](//github.com/adamralph/simple-exec) by [Adam Ralph](//adamralph.com/about/) I think it's time for a new era and approach of dotnet testing.

### Current and nearby features

### Future plans
