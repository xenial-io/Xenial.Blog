---
 layout: post 
 title: "Vertiq - Blazor Application Framework - An Introduction"
 comments: true
 tags: [Vertiq, Blazor, dotnet, dotnetcore, asp, aspnet, .NET]
 github: Xenial.Commentator
 author-github: xenial-io
 series: vertiq
---

Happy Holidays everyone!  
This post will be published on 7th of Dezember.


<!-- Some might be wondering why it got so silent on this blog almost 2 years, but there is a very valid reason. Almost all my time went into development of this *little* gem called [Vertiq Framework](https://fc.vertiq.io)!  
So let's begin with with a little introduction first. 

## A *brief* problem overview

### Writing frontends for applications

Writing (frontends for) applications is hard. In .NET we had several options to write frontends for our users. 

We had Windows Forms, WPF, Silverlight, Xamarin, Xamarin.Forms, UWP, MAUI and the browser based ones like Webforms, MVC, Razor, and Razor Pages. And there is the *new* kid on the block Blazor. (Actually it's initial release was 2018 so thats 5 years!). We know some of them died and others are here to stay. I think Blazor is here to stay, so let me explain a little bit why i think so. We also have UNO which is quite neat, but a lot of people I worked with, try to stick to direct Microsoft based frameworks, because of support, *ease* of finding developers. You just don't wan't to invest thousands of hours of work and then your UI Framework goes out of fashion or support.  

Blazor totally changes the game how we write frontends because it uses a component based approach. The neat thing about Blazor is, that technically it really does not care if it's rendering HTML or any other component (in Winforms that might be a UserControl). Just keep that in mind where this comes into the vision of `Vertiq`, but more on that later.

Writing component based applications is very helpful because we can split up our UI into small reuseable chunks, that are easily testable and reuseable. If done right it finally solves that tricky part all other UI frameworks did somehow solve with patterns like MVC, MVVM, MVP. All of them **try** to *solve* the reuse your UI code. But to be honest, after almost working 20 years with .NET none of those patterns allowed to reuse the UI code in a meaning full way. Ever tried to write MVVM for WPF and a Xamarin application with the same ViewModel? Or reuse it in a console application? You guessed it: it's hard and all of the attempts I did failed in some or the other way.  
Either some abstractions just don't fit (for example ICommand) or their application infrastructure just is so different that you always need to think about all platforms you want to deliver to. Especially on larger projects and with growing team size this is problematic, because not everybody is an expert on every platform. 

### Delivering value

The main focus all developers should have is: **provide value** to our users. Working on technical details for hours and hours is fun, but without providing value to the user, basically it's wasting time, energy and money.

But we all know, we need those technical details to provide value. There are a lot of cross cutting conserns we need to tackle every day: `Validation`, `Security`, `Logging`, `Monitoring` etc. The list goes on an on. We all know requirements change, so we need to tackle those as well, but in the end it's our users that we should focus on the most. 

### Architecture, Domain-Logic and Design choices

Over the years we have seen a lot of architectures. From a simple Windows Forms with a single Database (ahh good old Northwind) to 2-Tier, 3-Tier, N-Tier up to now Microservices Cloud Native and probably dozents of others.

All of them relied on a single requirement that all have in common: **Transport Data from some server to the User and back**.  
There were all kind of technologies for that. First of all we have of course the direct database access, we had (and still have) SOAP, WCF, HTTP, WebSockets, SignalR, GRPC and also here the list seams endless.

But in the end the value lies purely to transport data from some server to a client and via versa.

All of them have strengths and weeknesses, but in the end we need to represent some data (objects) and display it to the user. The user does not care **HOW** it got there, so why *should you as the developer*?

Think of the good old days of Windows Forms where you double clicked a button and magically you were able to actual work get done?

Architecture and *Abstractions* are always a tradeoff between complexity, choice and ease of use of API's. But with all that technical noise we always need to consider, I think we should rethink the way we design or systems.

### Clients, Servers, Mobile, Apps, Offline & the Fridge

Technologie moves fast, Frameworks come and go. We've come a long long way from simple Console apps over Desktop to the Web, Mobile Applications and hell now even Fridges can run **your** code. All platforms come with their own challanges on their own. But one question always bouthert me the most: where should you place your business logic. Where should and will it run? Nowadays users expect their settings, data to move and roam across devices, and as a sweet cherry on top it should work reliable and resilient even if **offline** or *with low bandwithes*. 

Why do we still need to jump between all layers and do a lot of complicated stuff? We need to rethink the way we *think* application architectutre and design. In the end it's about messages flowing through systems and beeing displayed to the users in some form or the other. But we also need to be **efficient**. We don't want to put hundrets of megs on your smartphone, have poor performance, or need to download hundrets of thousand of files in the browser. And of course we want to run code on that lovely fridge.

### Modular, Monolithic, Micro, Macro, Cloud, AOT and more

Working in hundrets of projects tried so solve the same problem over and over again. We have those challeges, of course, because requirements change. The number of users, the load we have on our systems and the way we need to scale.  
But the amount of labor we need to restructure (and sometimes we might reuse functionallity for some customers) simply almost never scales. Either the amount of rework we need to put in is so high that the project just get's cancelled so it's simply cheaper to throw more money at it (nobody bought a stronger server, or just split load by simply *load balance* their application by some kind of user groups. *Liar*. **WE ALL DID**) that's because we did not care enough, had no time to do it, or the teams just didn't know better.

## The VertiQ Way

Now we know the problems teams need to tackle all day long, so *why* we don't think in a more broad way how we structure our applications to tackle those. -->

