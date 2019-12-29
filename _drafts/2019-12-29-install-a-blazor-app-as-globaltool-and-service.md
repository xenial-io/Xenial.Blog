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

So let's modify the csproj so we get a dotnet tool:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>netcoreapp3.1</TargetFramework>
    <RootNamespace>blazor_as_a_tool</RootNamespace>

    <IsPackable>true</IsPackable>
    <PackAsTool>true</PackAsTool>
    <ToolCommandName>blazor-as-a-tool</ToolCommandName>

  </PropertyGroup>

</Project>

```

If we now run `dotnet pack` we'll get some output like this:

```cmd
C:\F\git\blazor-as-a-tool>dotnet pack
Microsoft (R)-Build-Engine, Version 16.4.0+e901037fe für .NET Core
Copyright (C) Microsoft Corporation. Alle Rechte vorbehalten.

  Wiederherstellung in "41,77 ms" für "C:\F\git\blazor-as-a-tool\src\blazor-as-a-tool\blazor-as-a-tool.csproj" abgeschlossen.
  blazor-as-a-tool -> C:\F\git\blazor-as-a-tool\src\blazor-as-a-tool\bin\Debug\netcoreapp3.1\blazor-as-a-tool.dll
  blazor-as-a-tool -> C:\F\git\blazor-as-a-tool\src\blazor-as-a-tool\bin\Debug\netcoreapp3.1\blazor-as-a-tool.Views.dll
  blazor-as-a-tool -> C:\F\git\blazor-as-a-tool\src\blazor-as-a-tool\bin\Debug\netcoreapp3.1\blazor-as-a-tool.dll
  blazor-as-a-tool -> C:\F\git\blazor-as-a-tool\src\blazor-as-a-tool\bin\Debug\netcoreapp3.1\blazor-as-a-tool.Views.dll
  Das Paket "C:\F\git\blazor-as-a-tool\src\blazor-as-a-tool\bin\Debug\blazor-as-a-tool.1.0.0.nupkg" wurde erfolgreich erstellt.

C:\F\git\blazor-as-a-tool>
```

Wow! That was easy! Let's modify the project a little bit more and change the package output directory, so it's more convenient to use.

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>netcoreapp3.1</TargetFramework>
    <RootNamespace>blazor_as_a_tool</RootNamespace>
    <IsPackable>true</IsPackable>
    <PackAsTool>true</PackAsTool>
    <ToolCommandName>blazor-as-a-tool</ToolCommandName>

    <PackageOutputPath>$(MSBuildThisFileDirectory)..\..\artifacts\tools</PackageOutputPath>
  </PropertyGroup>

</Project>

```

We now have a project structure like this and a package that looks like this.

![Explorer view of the project](/img/posts/2019/2019-12-29-tool-explorer-structure.png)
![Package Explorer view of the tool](/img/posts/2019/2019-12-29-package-explorer-tool-structure.png)

Not that hard!

Let's try out the new tool by installing it:

```cmd
C:\F\git\blazor-as-a-tool>dotnet tool install -g --add-source artifacts\tools blazor-as-a-tool
Sie können das Tool über den folgenden Befehl aufrufen: blazor-as-a-tool
Das Tool "blazor-as-a-tool" (Version 1.0.0) wurde erfolgreich installiert.
```

Okay nice! Let's run it:

```cmd
C:\F\git\blazor-as-a-tool>blazor-as-a-tool
info: Microsoft.AspNetCore.DataProtection.KeyManagement.XmlKeyManager[0]
      User profile is available. Using 'C:\Users\mgrundner\AppData\Local\ASP.NET\DataProtection-Keys' as key repository and Windows DPAPI to encrypt keys at rest.
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: https://localhost:5001
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Production
info: Microsoft.Hosting.Lifetime[0]
      Content root path: C:\F\git\blazor-as-a-tool
```

Let's fire up the browser at [http://localhost:5000](http://localhost:5000)

![Blazor app is broken in browser](/img/posts/2019/2019-12-29-blazor-browser-broken.png)

Whoup's, that doesn't look right. Did you spot the error? The Content root path is still `Content root path: C:\F\git\blazor-as-a-tool`.

Okay let's fix that by adjusting it in `Program.cs`. But first we need to know how dotnet global tools are structured. So let's have a quick look at that. But where the heck should I look at? I have no idea how the inner stuff of dotnet works.

No worries, just use everything at your disposal and throw it at it. The good old `where` command.

```cmd
C:\F\git\blazor-as-a-tool>where blazor-as-a-tool
C:\Users\mgrundner\.dotnet\tools\blazor-as-a-tool.exe
```

Okay? Thats interesting, let's look at that folder:




```cs

```