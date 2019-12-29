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

![Folder structure of a global tool installed #1](/img/posts/2019/2019-12-29-global-tools-structure1.png)
![Folder structure of a global tool installed #2](/img/posts/2019/2019-12-29-global-tools-structure2.png)

Interesting! I have no idea why the dotnet team decided to do the double versioning (I guess that has to do with tools referencing other packages), but at least we have some idea how everything is structured. It's no magical black box, it's just a bunch of files on disk! So let's adjust the content path.

> In my first try I used `Path.GetDirectoryName(Process.GetCurrentProcess().MainModule.FileName)` and of course that is wrong cause there is only the `exe` file there.

```cs
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace blazor_as_a_tool
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                //We use the path of the executing assembly, that is blazor_as_a_tool.dll in this case
                .UseContentRoot(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location))
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
    }
}
```

Let's try it out:

```cmd
dotnet tool uninstall -g blazor-as-a-tool
dotnet pack
dotnet tool install -g --add-source artifacts\tools blazor-as-a-tool
```

And run the application:

```cmd
C:\F\git\blazor-as-a-tool>blazor-as-a-tool
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: https://localhost:5001
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Production
info: Microsoft.Hosting.Lifetime[0]
      Content root path: C:\Users\mgrundner\.dotnet\tools\.store\blazor-as-a-tool\1.0.0\blazor-as-a-tool\1.0.0\tools\netcoreapp3.1\any
```

> Did you notices the content root path now is deep in the dotnet tools structure?

Now let's look at [http://localhost:5000](http://localhost:5000)

![Working Blazor global tool](/img/posts/2019/2019-12-29-working-blazor-global-tool.png)

Profit!

### Bonus points, or can we run it as a windows service?

Now we have a running application that works, but can we make it a windows service?
Of course, it's just a console application, but we need to inject a little helper from Microsoft to confirm to the OS rules and include `Microsoft.Extensions.Hosting.WindowsServices` into the app and registering it.

> Windows services are not so different from normal applications, almost all executable's can be used as windows services, the only difference is how they react to life-cycle events (eg. do they gracefully shutdown, pause etc.).

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

  <ItemGroup>  
    <PackageReference Include="Microsoft.Extensions.Hosting.WindowsServices" Version="3.1.0" />  
  </ItemGroup>

</Project>

```

```cs
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace blazor_as_a_tool
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                //We use the path of the executing assembly, that is blazor_as_a_tool.dll in this case
                .UseContentRoot(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location))
                //Use life-cycle hooks of the windows services
                .UseWindowsService()
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
    }
}

```

> Gotcha, in the time of writing there seams a [bug in the nuget pack](https://github.com/NuGet/Home/issues/7001) tool so we have to bypass it by adding a hook in the msbuild process to fix the date issues so if you are reading this, this is probably obsolete

```xml

  <PropertyGroup>
    <PatchDatesScriptLocation>$(MSBuildThisFileDirectory)patch-date.ps1</PatchDatesScriptLocation>
  </PropertyGroup>

  <Target Name="PatchFileDates" BeforeTargets="GenerateNuspec">
    <!-- https://github.com/NuGet/Home/issues/7001 -->
    <Message Text="PatchFileDates" />
    <Exec Command="C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -NonInteractive -executionpolicy Unrestricted -command &quot;&amp; { $(PatchDatesScriptLocation) } &quot;" LogStandardErrorAsError="True" ContinueOnError="False" WorkingDirectory="$(MSBuildThisFileDirectory)" />
  </Target>
```

`patch-date.ps1`:

```ps1
Get-ChildItem -File -Recurse | % {$_.LastWriteTime = (Get-Date)}
```

Let's repack that tool and see if we get that thing going

```cmd
dotnet tool uninstall -g blazor-as-a-tool
dotnet pack
dotnet tool install -g --add-source artifacts\tools blazor-as-a-tool
```

Good old `sc.exe` and `where.exe`:

> Note: you need an elevated promt for this!

```bat
REM Where is the executable:
C:\F\git\blazor-as-a-tool>where blazor-as-a-tool
C:\Users\mgrundner\.dotnet\tools\blazor-as-a-tool.exe

REM installing the service:
C:\F\git\blazor-as-a-tool>sc create blazor-as-a-tool binPath="C:\Users\mgrundner\.dotnet\tools\blazor-as-a-tool.exe"
[SC] CreateService ERFOLG

REM starting the service
C:\F\git\blazor-as-a-tool>sc start blazor-as-a-tool

SERVICE_NAME: blazor-as-a-tool
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 2  START_PENDING
                                (NOT_STOPPABLE, NOT_PAUSABLE, IGNORES_SHUTDOWN)
        WIN32_EXIT_CODE    : 0  (0x0)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x0
        WAIT_HINT          : 0x7d0
        PID                : 15748
        FLAGS              :

REM stopping the service
C:\F\git\blazor-as-a-tool>sc stop blazor-as-a-tool

SERVICE_NAME: blazor-as-a-tool
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 3  STOP_PENDING
                                (STOPPABLE, NOT_PAUSABLE, ACCEPTS_SHUTDOWN)
        WIN32_EXIT_CODE    : 0  (0x0)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x0
        WAIT_HINT          : 0x0

REM Deleting the service
C:\F\git\blazor-as-a-tool>sc delete blazor-as-a-tool
[SC] DeleteService ERFOLG
```

So let's install and start it:

```bat
sc create blazor-as-a-tool binPath="C:\Users\mgrundner\.dotnet\tools\blazor-as-a-tool.exe"
sc start blazor-as-a-tool

```


Now let's look again at [http://localhost:5000](http://localhost:5000).

Voilà! A full running blazor application as a service!

![Working Blazor global tool as a windows service](/img/posts/2019/2019-12-29-working-blazor-global-tool-as-a-service.png)

![Magic](https://media.giphy.com/media/12NUbkX6p4xOO4/giphy.gif)

### Recap

We now can do all kinds of interesting stuff with this, for example use [Topshelf](http://topshelf-project.com/) and a [application manifest](https://docs.microsoft.com/de-de/windows/win32/sbscs/application-manifests?redirectedfrom=MSDN) to require admin promt for the tool to install it itself, instead of manually installing it via `sc.exe`.

I hope this was an interesting post, it was a lot of fun for me! Keep an eye on [Xenial](https://www.xenial.io) and I wish you all a happy new year! Stay awesome!

Manuel

> If you find interesting what I'm doing, consider becoming a [patreon](//www.patreon.com/biohaz999) or [contact me](//www.delegate.at/) for training, development or consultancy.
