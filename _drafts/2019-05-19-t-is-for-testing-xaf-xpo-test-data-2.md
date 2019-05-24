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
In this example I will use a simple time tracking app. An employee can record an time entry on a project.

```cs

```
