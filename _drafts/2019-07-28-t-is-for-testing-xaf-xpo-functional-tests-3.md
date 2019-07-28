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

There are serveral technologies available, depending on the platform. For the web, I did a lot of testing in the past, with [Selenium](). At my last job at [Ranorex]() we wrote a whole product around Selenium called [Webtestit]()! (That's awesome by the way, check it out). From DevExpress there is [TestCafe]() but I didn't had a chance to use it in a real world product yet.  

For Windows-Desktop there are another load of options. There is [Ranorex Studio](), [Coded-UI-Tests]() from Microsoft, [WinAppDriver]() from Microsoft, [Project Sikuli](http://doc.sikuli.org) and of course there is [EasyTest]().

To be honest I never looked into EasyTest until now, cause I don't like recorded tests. Those are incredible hard to maintain. That is not special to EasyTest it self. Almost all tools I mentioned above provide some kind of recording, but on EasyTest it self, I disliked it for another reason: A special script language. That wouldn't be that bad, if it would be a [turing-complete]() language, but it isn't. The language is a [DSL]'() special for tests, and it's easy to read, but I never got warm with it. Most of the teams I work with don't want to learn a new language, especially on top on new concepts (yes there are a lot of people out there, want to start testing, but have no idea how).

But then I discovered an [old blog post]() (!!) from [Tolis] (the creator of [eXpand-framework]()) how to write EasyTests in C# and started to play with it. And what should I say? I'm in love. But let's talk about a powerful functional testing pattern first:

## Page-Object-Pattern
