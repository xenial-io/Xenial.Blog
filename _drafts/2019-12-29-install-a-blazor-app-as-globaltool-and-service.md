---
 layout: post 
 title: Install a blazor app as globaltool and service
 comments: true
 tags: ['blazor', 'service', 'netcoreapp30', 'dotnetcore', 'dotnet', 'global-tool', 'Xenial', 'EasyTest', 'XAF']
---
The year is almost over, and I hope you had nice christmas holidays! I did relax a little bit, but as maybe some of you know I'm working hard on getting [Xenial](https://www.xenial.io) alive. For those that don't know what Xenial is - stay tuned, there will be a announcement around end of january - However, I'll tease a little screenshot right now.

![Screenshot of Xenial.DevTools.Firewall](/img/posts/2019/2019-12-29-xenial-devtools-firewall-teaser.png)

I'll show how I build that, but first let me explain what it does and why I guess it's an awesome idea.

The screenshot you are looking at is a tool you can install, for example on an UI-Test machine. It's should allow you to do two things:

1. See all Firewall rules that are on that particular machines (with a given prefix, in this case `Xenial`)
1. Allow developers to interact with this tool via an HTTP endpoint to add, list and delete firewall rules.

You may ask your self, why do you want to do something like this? Isn't that a huge security flaw? Yes and no. It's not supposed to be exposed to the internet, it's an internal development tool to make UI-Tests easier. Why HTTP and a REST-API? In a modern world where we use *a lot* of different programming languages (C#, Java/Typescript, Java, etc.) I think it's the most accessible way possible. Sure you could do that same thing with named pipes for example. But I think this does not need to be *that* efficient. It should do it's job, and do that well. If you consider all the cross cutting concerns (logging, auth, etc.) I think `ASP.NET Core` does a great job for all sorts of services and applications.

But why don't you just turn off the firewall? Nope, I'm not going to do that. (Especially in a UI-Test we want to be as close as possible to the end user scenario as possible)

Can't you just add firewall rules in the test case and delete them afterwards? Yeah sure, that is possible, if you grant right's to the test execution runner. That's fine for example if you got one or two machines, but then you have to turn off `UAC` as well. You get the point I guess.

So my thought was: What is the most painless way of getting a service up and running has some nice API and UI and can be packaged up as a simple nuget package and can be consumed with a few lines of command line that only require elevated privileges **ONCE**?

### dotnet tools to the rescue

As you may know, there is this litte thing called [dotnet tools](//andrewlock.net/new-in-net-core-3-local-tools/) (and esp [global tools](//docs.microsoft.com/en-us/dotnet/core/tools/global-tools)). From implementation detail there is no difference between global and local tools, only from consumption view.

> dotnet tools are just command-line applications

We know that `aspnet core applications` are also only command-line applications as well! So I was wondering, can we pack up an blazor application as well? You can bet on that!

So let's start by creating a new blazor application:

```cmd
dotnet new blazorserver
```

That results in this

```xml
 <PropertyGroup>
    <TargetFramework>netcoreapp3.1</TargetFramework>
    <RootNamespace>blazor_as_a_tool</RootNamespace>
  </PropertyGroup>
```

So let's add the 