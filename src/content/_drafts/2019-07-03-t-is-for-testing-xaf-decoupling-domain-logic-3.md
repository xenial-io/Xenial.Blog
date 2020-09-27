---
 layout: post 
 title: "T is for Testing: XAF & XPO: Decoupling Domain Logic 3"
 comments: true
 github: Scissors.FeatureCenter
 tags: ["Testing", "XAF", "XPO", "Builder", "Patterns", "DevExpress"]
 series: t-is-for-testing-xaf-xpo
---

Testing is an important part of a developers responsibilities, especially in a fast moving agile world!
This is the first post in a [series](/series/{{page.series}}) on testing patterns I used and discovered when testing applications using XAF and XPO applications.

Although the patterns I use are focusing on testing XAF and XPO applications, most of them may apply to not only on testing and not only on XAF applications.
After talking about test data in the [last post](/2019/05/26/t-is-for-testing-xaf-xpo-test-data-2.html) we should talk about decoupling and domain logic. So let's get started!

## Domain Logic

So what's domain logic anyway? According to Martin Fowler: . So what should that look like? What does that mean in terms of a LOB (Line of Business application). One of the oldest jokes I know: Ask an consultant about a particular problem the answer is always the same: It depends.

I see the term domain logic a bit misleading. I think every part of an successful software product is some kind of domain logic, but some parts are more important than others. I like to think of business logic: It's your unique selling point (USP). Sorry for using marketing jargon. It's your applications logic that does some crazy calculation or doing some kind of statistics about the data or if you write your own mail client (don't do that for a living :D) receiving and sending mails. If it's something you can imagine running from the commandline (without UI so speaking, but also the commandline is UI) than it's domain logic. If you need to create a window and do a button click to do that job, it's to coupled. Thats infrastructure and not domain. We cover functional testing later in the series.

So let's look at an ideal, extreme simplified, and totally not real world example what business logic looks like:

```cs

public class ProjectCalculator
{
    public int CalculateHoursOnProject(Project project, ProjectKind kind)
    {
        return project.Where(p => p.Kind == kind)
            .Select(p => p.TimeReports)
            .Sum(t => t.Time);
    }
} 

```

Only by looking at the code, thats clear domain logic. No dependencies, inputs, outputs, it's pure.
> Pure means no side effects. So every time you call the function, it would produce the same output, based on the same data.

Also I assume the classes `Project` and `TimeReport` are XPObject (or Poco's) and `ProjectKind` is an enum.

> Bonus: If you want to get fancy with the new C#7+ syntax you can write it `public int CalculateHoursOnProject(Project project, ProjectKind kind) => project.Where(p => p.Kind == kind).Select(p => p.TimeReports).Sum(t => t.Time);`

What would a test for this look like?

```cs

```