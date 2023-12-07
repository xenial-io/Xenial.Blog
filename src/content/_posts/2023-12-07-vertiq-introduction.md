---
 layout: post 
 title: "Vertiq - Blazor Application Framework - An Introduction"
 comments: true
 tags: [Vertiq, Blazor, dotnet, dotnetcore, asp, aspnet, .NET]
 github: Vertiq.Samples.Todo
 author-github: vertiq-io
 series: vertiq
---

Happy Holidays everyone!  
Some might be wondering why it got so silent on this blog for almost 2 years, but there is a very valid reason. Almost all my time went into the development of this *little* gem called [Vertiq Framework](https://fc.vertiq.io)!  
So let's begin with with a teaser and little problem introduction first.

![Todo App Screenshot](/img/posts/2023/2023-12-07-vertiq-introduction-todo-app.png)

## A *brief* problem overview

### Writing frontends for applications

Writing (frontends for) applications is hard. In .NET we had several options to write frontends for our users.

We had Windows Forms, WPF, Silverlight, Xamarin, Xamarin.Forms, UWP, MAUI and the browser-based ones like Webforms, MVC, Razor, and Razor Pages. And there is the *new* kid on the block Blazor. (Actually, its initial release was 2018, so thats 5 years!). We know some of them died and others are here to stay. I think Blazor is here to stay, so let me explain a little bit why i think so. We also have UNO which is quite neat, but a lot of people I worked with, try to stick to direct Microsoft-based frameworks, because of support, *ease* of finding developers. You just don't want to invest thousands of hours of work, and then your UI Framework goes out of fashion or support.

Blazor totally changes the game how we write frontends because it uses a component-based approach. The neat thing about Blazor is, that technically it really does not care if it's rendering HTML or any other component (in Winforms that might be a UserControl). Just keep that in mind where this comes into the vision of `Vertiq`, but more on that later.

Writing component-based applications is very helpful because we can split up our UI into small reusable chunks that are easily testable and reusable. If done right, it finally solves that tricky part all other UI frameworks did somehow solve with patterns like MVC, MVVM, MVP. All of them **try** to *solve* the reuse your UI code. But to be honest, after almost working 20 years with .NET, none of those patterns allowed reusing the UI code in a meaningful way. Ever tried to write MVVM for WPF and a Xamarin application with the same ViewModel? Or reuse it in a console application? You guessed it: it's **hard** and all the attempts I've seen it fail in some or the other way.  
Either some abstractions just don't fit (for example, ICommand) or their application infrastructure just is so different that you always need to think about all platforms you want to deliver to. Especially on larger projects and with growing team size, this is problematic because not everybody is an expert on every platform.

### Delivering value

The main focus all developers should have is: **provide value** to our users. Working on technical details for hours and hours is fun, but without providing value to the user, basically it's wasting time, energy and money.

But we all know, we need those technical details to provide value. There are a lot of cross-cutting concerns we need to tackle every day: `Validation`, `Security`, `Logging`, `Monitoring` etc. The list goes on and on. We all know requirements change, so we need to tackle those as well, but in the end, it's on our users that we should focus on the most.

### Architecture, Domain-Logic, and Design choices

Over the years we have seen a lot of architectures. From a simple Windows Forms application with a single Database (ahh good old Northwind) to 2-Tier, 3-Tier, N-Tier up to now Microservices Cloud Native and probably dozens of others.

All of them relied on a single requirement that all have in common: **Transport Data from some server to the User and back**.  
There were all kinds of technologies for that. First of all, we have of course the direct database access, we had (and still have) SOAP, WCF, HTTP, WebSockets, SignalR, GRPC, and also here the list seams endless.

But in the end, the value lies purely to transport data from some server to a client and via versa.

All of them have strengths and weaknesses, but in the end we need to represent some data (objects) and display it to the user. The user does not care **HOW** it got there, so why *should you as the developer*?

Think of the good old days of Windows Forms where you double-clicked a button, and magically you were able to actual work get done?

Architecture and *Abstractions* are always a tradeoff between complexity, choice and ease of use of API's. But with all that technical noise we always need to consider, I think we should rethink the way we design or systems.

### Clients, Servers, Mobile, Apps, Offline & the Fridge

Technology moves fast, Frameworks come and go. We've come a long way from simple Console apps over Desktop to the Web, Mobile Applications, and hell now even Fridges can run **your** code. All platforms come with their own challenges on their own. But one question always bothered me the most: where should you place your business logic. Where should and will it run? Nowadays, users expect their settings, data to move and roam across devices, and as a sweet cherry on top it should work reliable and resilient even if **offline** or *with low bandwidthes*.

Why do we still need to jump between all layers and do a lot of complicated stuff? We need to rethink the way we *think* application architecture and design. In the end, it's about messages flowing through systems and being displayed to the users in some form or the other. But we also need to be **efficient**. We don't want to put hundreds of megs on your smartphone, have poor performance, or need to download hundreds of thousand of files in the browser. And of course we want to run code on that lovely fridge.

### Modular, Monolithic, Micro, Macro, Cloud, AOT, and more

Working in hundreds of projects tried so solve the same problem over and over again. We have those challenges because requirements change. The number of users, the load we have on our systems and the way we need to scale.  
But the amount of labor we need to restructure (and sometimes we might reuse functionality for some customers) simply almost never scales. Either the amount of rework we need to put in is so high that the project just get's cancelled, so it's simply cheaper to throw more money at it (nobody bought a stronger server, or just split a load by simply *load balance* their application by some kind of user groups. *Liar*. **WE ALL DID**) that's because we did not care enough, had no time to do it, or the teams just didn't know better.

## The Vertiq Way

Now we know the problems teams need to tackle all day long, so *why* we don't think in a broader way how we structure our applications to tackle those.

Before I go into details, let's look at a demo:

### The Todo Sample

Let's look at the most iconic basic example for any frontend technology: [The Todo App](https://todo.vertiq.io/).

![Todo App Screenshot](/img/posts/2023/2023-12-07-vertiq-introduction-todo-app.png)

<script src="https://gist.github.com/biohazard999/03ba58bbc580c0c416adc9d13dd1bc81.js"></script>

I won't walk you through the code here, but look at the line count. **185** lines. For a complete Todo App with database persistence and simple validation logic. I'm using XPO in this sample, but Vertiq itself does not care. You can use EF Core or whatever you like. If you want do [dive into the code](https://github.com/vertiq-io/Vertiq.Samples.Todo/blob/master/src/VertiqTodoSample.ShellModule/Pages/Index.razor) it's available on [github](https://github.com/vertiq-io/Vertiq.Samples.Todo).

This itself already might not be too impressive, but let's look at what's happening under the scene.

![Architecture Diagram](https://www.mermaidchart.com/raw/f970ffe1-0358-4323-8858-56e9d4561499?theme=dark&version=v0.1&format=svg)

If you don't like [`MudBlazor`](https://mudblazor.com/) (which is quite awesome) as your render platform, you can look at our [compatibility table](https://fc.vertiq.io/compatibility) for [other render platforms](https://fc.vertiq.io/whats-new/3-0). Currently we support [DevExpress](https://www.devexpress.com/#webui), [Radzen](https://blazor.radzen.com/), [bit BlazorUI](https://components.bitplatform.dev/) and [Blazority (Clarity UI)](https://blazority.com/). You even can build your own, but that's a story for another day.

![Todo App BitBlazor](/img/posts/2023/2023-12-07-vertiq-introduction-todo-app-bitblazor.png)

![Todo App DevExpress](/img/posts/2023/2023-12-07-vertiq-introduction-todo-app-dx.png)

### Modular Architecture, Abstractions & you are in control

Vertiq is built from the ground up using a modular architecture. When I say *modular*, I **really mean modular**. That does not mean that every module is its own assembly or nuget package, but often thats the case. A module is not a *deployment unit* but a **logical unit**. That means a single assembly can contain multiple modules.  
By being fully modular, it does not mean it's slow or does heavily rely on reflection. It was always designed to be forward looking to be `AOT` and `Trimming` friendly (by using source generators), although AOT & Trimming support is still in the making (.NET8 launched in November, so give us some time to breath 😎). As a framework where mobile (or WASM) applications is a primary target, performance and download size is a top priority to us.

But in 99% of the cases, you don't need to know how modules work together, unless you are writing larger *plugin style* applications.

Normally, a **Vertiq** application consists of 2 (user) modules and an application class:

```mermaid

```

As you can see a typical vertiq application consists of a `XXXShellModule` this is basically the basis for all your app (think of it as the `Startup.cs`) here are all the core decisions, service registrations and so on for your app. All modules define their module dependencies to determine the loading order. The `Application` is a `runtime` container for configuring and launching your app. Normally those are sitting in your `XXX.ShellModule.csproj` project.

The other important project is what we call a `Hosting` module. In our case thats a `XXXServerModule`. This module is our *root* module which is meant to be the top level module that defines all dependencies it needs to **host** our application. Technically, there is nothing special about it from a *module perspective*. If you are familiar with the *onion architecture* this is where the application bit's come in. I don't like to call it that way, because onions make me *cry*.

That results in a *quite* scary dependency tree:

![App Screenshot #1](/img/posts/2023/2023-12-07-vertiq-introduction-module-tree.png)

But although it **seems** overcomplicated and not performant, it *actually is*, because the loading is linear:

```txt
[Vertiq] Creating modules in the following order:
        VertiqHstsModule
        VertiqHttpsRedirectionModule
        VertiqBlazorFrameworkFilesModule
        VertiqStaticFilesModule
        VertiqRoutingModule
        VertiqDefaultTemplateModule
        VertiqEndpointsModule
        VertiqFluxorModule
        VertiqBlazorHubModule
        VertiqRazorPagesModule
        VertiqMediatorStoreModule
        VertiqComponentsModule
        VertiqComponentsBitBlazorModule
        VertiqBlazorServerModule
        VertiqFallbackToPageModule
        VertiqUseControllersModule
        VertiqExceptionHandlerModule
        VertiqDeveloperExceptionPageModule
        VertiqHttpLoggingModule
        VertiqAppStoreModule
        VertiqMaterialDesignIconsIconPackModule
        VertiqFluxorConventionsModule
        VertiqMermaidModule
        VertiqBitBlazorTemplatesModule
        VertiqXpoSchemaUpdateModule
        VertiqNewtonsoftJsonSerializationModule
        VertiqHttpTransportServerModule
        VertiqBlazorServerDefaultModule
        VertiqTodoSampleShellModule
        VertiqDiagnosticModule
        VertiqTodoSampleServerModule
```

We try be predictable, debuggable, and traceable as much as possible.

Being so modular comes with a great benifit: **EVERY** piece of code in Vertiq is designed to be replaced, interceptable and controlled from another module. That means: you are in **total control**. For us that means: **We** can provide **value** by building highly functional and reusable modules/components on a really fine granular scale.

### Application State, Security, Validation & More

Working with hundreds of teams, I think the most two common questions I've got are:

1. Where to put application/user state (any why it always breaks when I add background operations)
1. Where to put business logic (any why is it so hard to test, so meh just skip it)

Let's start with 1.

A lot of the *magic* vertiq relies on the *flux/redux* patter. Sounds scary, but its a so simple yet powerful pattern. It basically means: nothing happens at the same time *ever*, it get's queued up, nothing gets lost, but there is one *immutable* truth: The application state.

```mermaid

```

> Here a special shoutout to [Peter Morris](https://github.com/mrpmorris) the creator of [Fluxor](https://github.com/mrpmorris/Fluxor) for creating this awesome library! Vertiq would not have been possible without your effort!

Using the `MVU` pattern which is a perfect fit for `Blazor` applications. But not only we can use the `MVU` we also can use `Reactive UI` patterns in combination, which makes it super powerful, yet simple and performant.

Now to point 2.

As you've seen in the **Todo App** before we use an async mediator pattern to communicate *between* **clients** and **servers**.

That isn't just a *simple* **command & query** aka **CQRS** pattern, it is a **pipeline** that allows messages to be *validated*, *blocked*, *redirected* on each side. The `Handler` is where your business logic goes (at least in the entry level). So it's a clear path to success.

> As for Auth and other aspects we of course support the `BFF` pattern as well as `OICD` and other mechanisms (thanks to the powerful modular approach).

Marrying those two patterns together allows *you to focus on the business logic* without caring too much about the application state, but **without** loosing control over it.

### Templates, UI Aspects, Component Model and multi platform

The powerful rendering engine of Vertiq allows you to intercept and control every aspect of your UI. Although currently *only* **HTML** is supported out of the box (for now), you can control and even render to native components if you want to. Thanks to [Blazor Mobile Bindings](https://github.com/Dreamescaper/BlazorBindings.Maui) you basically can render to any target you like.

But we didn't stop there, you can even control and intercept how single [Icons](https://fc.vertiq.io/icons) are rendered. Thanks to a powerful [Component Model](https://fc.vertiq.io/extensibility/component-model) you can declaratively control how labels, etc are rendered.

Templates allow you to quickly get started, and drop in corporate design in at a later point in time.

## Not a Toy

We've successfully built dozens of applications, from small to large, online, offline, hybrid and embedded.

![App Screenshot #1](/img/posts/2023/2023-12-07-vertiq-introduction-app1.png)
![App Screenshot #2](/img/posts/2023/2023-12-07-vertiq-introduction-app2.png)
![App Screenshot #3](/img/posts/2023/2023-12-07-vertiq-introduction-app3.png)

So we think it's time to share our product with you! If you are interested in a tour, some additional information or any questions, feel free to [reach out to me via email](mailto:m.grundner@delegate.at?subject=Vertiq) or my [other channels](/about)!

Let me know what you think and feel free to comment below!

Also check out our [Feature Center](https://fc.vertiq.io/) that is also our interactive documentation!

## Happy Holidays!

I wish you and your family all the best and happy holidays!

Stay awesome!  
Manuel
