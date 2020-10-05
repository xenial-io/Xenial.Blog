---
 layout: post 
 title: How to pre cache an XAF Winforms Application
 tags: [XAF, Deployment]
---

This is a [follow up post](/2018/04/15/how-to-use-the-desktop-bridge-to-create-an-appx-package-for-xaf.html) on the APPX package build. Basically it should apply to all XAF-Winforms application, just some path adjustments should be needed.

As in the last post, the idea behind the pre caching is that modules don't change after deployment, so we can pre generate all files needed that are generated at first launch.

If you want to follow along, I've prepared as always the project on [github](//github.com/biohazard999/how-to-precache-an-xaf-winforms-application), whats different this time, I've segmented my work with [pull requests](//github.com/biohazard999/how-to-precache-an-xaf-winforms-application/pulls?q=is%3Apr+is%3Aclosed), so you can follow my process a little bit better.

So let's get started!

### The project

This is based on a normal XAF.Win Project. I use the latest stable version 18.2.6 at time of writing. To cover both worlds I'm using EF & XPO with the following 10 modules, to mimic a more realistic scenario i typically see in the real word, but of course the amount of time saving you get out of the process highly depends on your application.

- `BusinessClassLibraryCustomizationModule`
- `ConditionalAppearanceModule`
- `SchedulerModuleBase`
- `SchedulerWindowsFormsModule`
- `SystemModule`
- `SystemWindowsFormsModule`
- `ValidationModule`
- `ValidationWindowsFormsModule`
- `CustomModule`
- `CustomWindowsFormsModule`

#### Measurement

I do the performance measurements on my Surface Laptop2 with 16GB RAM and it's the i7-8650U. So it's a powerful machine.
Cause I care about the time the user is first able to interact with the application, I'll create a StopWatch in `Program.cs` and add a event handler before `winApplication.Start()` to display the elapsed time:

```cs
winApplication.ShowViewStrategy.StartupWindowLoad += (s, e) =>
{
    var schedulerWindow = (Form)((WinShowViewStrategyBase)s).Inspectors.OfType<WinWindow>().First().Template;

    schedulerWindow.Shown += (s2, e2) =>
    {
        sw.Stop();
        WinApplication.Messaging.Show("Time", $"Start-Time: {sw.Elapsed}");
    };
};
```

Don't focus much on the code, but in this configuration the `startup-item` is set to the `scheduler` object, so this get's called, when the window of the scheduler is visible to the end user.

##### Base-Line

When I run the application in Debug mode, it is as expected the slowest one of all.

- 25.604 seconds, Debug Config, Debugger Attached (normal F5 behavior)

![The initial value in Debug Mode](/img/posts/2019/2019-03-26-initial-debug-mode.png)

In Release mode without Debugger attached, the results are a little bit better, but far from great.

- 17.743 seconds, Release Config, No Debugger Attached (normal Ctrl+F5 behavior)

![The initial value in Release Mode without Debugger](/img/posts/2019/2019-03-26-initial-release-mode.png)

So we save 7.861 seconds. So what's the reason for that?

There are major differences how XAF is configured in those two configurations:

- `DatabaseUpdateMode`: Checking if schema is up to date, running `ModuleUpdater` etc.
- Logging
- Generating `ModelAssembly.dll` file
- Generating `DcAssembly.dll` file (if you have configured DomainComponents)
- Generating `ModulesVersionInfo` file
- The normal .NET overhead between Debug & Release (compiler optimizations etc.)

So let's have a look how XAF behaves, and why stuff is happening. And how to get the performance up!

### Considerations

What kind of performance optimizations you can make by caching highly depends on the type of application you build. For this example I'm targeting the most basic one:

- Normal XAF.WinApplication
- No dynamic module loading at runtime (so you know exact what modules are loaded)
- User is still able to store customization's e.g `User.Model.xafml`
- Normal installer, Windows store with APPX, Clickonce, Squirrel ect.
  - This means the user isn't allowed to write into to application directory (for example %ProgramFiles%, %ProgramFiles86%)

So let's look how XAF determines each step it has to make when setting up & staring a Winforms application:

1. Check `ModulesVersionInfo` file with the currently loaded modules
    1. If there is a mismatch, it will regenerate `ModelAssembly.dll` and `DxAssembly.dll`
    1. This will be determined by the `[AssemblyVersionAttribute]` of the module
1. If `DatabaseUpdateMode` is set to anything other than `Never`.
    1. It will do some schema adoption, based on the `MODULEINFO` table
        1. This is the Database column that contains basically the same information as the `ModulesVersionInfo` file and is especially in multi user environments important, so every user is using the same application version with the database
    1. For XPO: it's possible that it will generate new entries `XPOBJECTTYPE` table.
        1. This table contains information about your persistent objects, especially if you are using inheritance with `OwnTableInheritance`. This contains information where to find the right objects to create/load. This also contains the FullQualified name and assembly.
        1. This is often a huge performance killer, if you rename `PersistentObject`/`BusinessObjects` classes, namespaces or move them to different assemblies, as the time building your app.
    1. For EF: No idea now, but i'll find it out ;)
1. If `winApplication.EnableModelCache` is set to true
    1. Check if `Model.Cache.xafml` exists
        1. If exists:
            1. Load file into `ApplicationModel`
            1. Skip all module difference loading of the modules  
        1. If not:
            1. Load `ModelGeneratorUpdaters` of all Modules
            1. Load all `Model.Difference.xafml` files from all Modules 
            1. finish setting up the application, dump current `ApplicationModel` to disk for later use

This isn't a 100% accurate list of stuff thats going on when `Application.Setup()` gets called, but it's a good overview to understand where we can speed up application startup and use caching and pre generation.

### The challenge (or how to speed things up)

#### Versioning

First of all stuff that is highly important is versioning of assemblies. XAF uses the assembly version all over the place to determine if they can skip stuff, and use cached values instead of regeneration. Unfortunately the default template is setup in a way, that is easy to get stuff running in development, but not for production deployment. Don't get me wrong, they do a lot in the default templates, to make most developers happy. But every project is different, so they need to keep a good balance between the average projects.

By default a project created by VisualStudio (or the DevExpress template gallery) all project in the solution get the `[assembly: AssemblyVersion("1.0.*")]` under `Properties/AssemblyVersion.cs`. That's nice for development, cause every time you build the project, VisualStudio will generate a higher version for you, so XAF basically throws away any caches and changes stuff as described above. Not ideal for production. So let's get rid of it by setting a fixed version (for example `1.0.0.0`).

`Properties/AssemblyVersion.cs`

``` cs
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

// General Information about an assembly is controlled through the following 
// set of attributes. Change these attribute values to modify the information
// associated with an assembly.
[assembly: AssemblyTitle("how-to-precache-an-xaf-winforms-application.Win")]
[assembly: AssemblyDescription("")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("")]
[assembly: AssemblyProduct("how-to-precache-an-xaf-winforms-application.Win")]
[assembly: AssemblyCopyright("Copyright © 2019")]
[assembly: AssemblyTrademark("")]
[assembly: AssemblyCulture("")]

// Setting ComVisible to false makes the types in this assembly not visible 
// to COM components.  If you need to access a type in this assembly from 
// COM, set the ComVisible attribute to true on that type.
[assembly: ComVisible(false)]

// Version information for an assembly consists of the following four values:
//
//      Major Version
//      Minor Version 
//      Build Number
//      Revision
//
// You can specify all the values or you can default the Build and Revision Numbers 
// by using the '*' as shown below:

[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

```

Cause we have multiple modules (Platform unagnostic, Platform agnostic, and the Winforms exe) of course, we need to do that in all projects.

Now we have them set to fixed values, we can enable `winApplication.EnableModelCache` and look how performance gets better, after 2 starts of the application in release mode:

- 10.541 seconds, Release Config, No Debugger Attached (normal Ctrl+F5 behavior)

![The with caching in Release Mode without Debugger](/img/posts/2019/2019-03-26-enable-caching-release-mode.png)

Hm that's not quite was I was expecting, so what's going on? Let's have a look at the next step in our list, seams it's the `CheckCompabilityType` by default it's set to `DatabaseSchema`.

#### Database update/migrations

In this post I will focus on maximum performance an caching, so I assume that database migrations get applied by hand, or maximum for the first user that is performing an upgrade of the application. So I'll set the `CheckCompabilityType`to `ModuleInfo`. How we can apply database migrations for the first user will be the topic for another post.

- When the `CheckCompabilityType` is set to
  - `DatabaseSchema`: XAF will perform a quick check if there are any database schema missmatches
  - `ModuleInfo`: It's just checking the `MODULEINFO` table for matching modules and assumes the schema is correct. That's what we want.

Let's start again in Release mode, what we get is a error message, a quick look in the `expressAppFramework.log` tells us that the schema isn't correct anymore. That's totally expected, cause by default, it does not create the `MODULEINFO` table. Now we set the mode to that, we need to run in `Debug` first, to update the schema.

```txt
26.03.19 14:16:51.616	The application cannot connect to the specified database, because the database doesn't exist, its version is older than that of the application or its schema does not match the ORM data model structure. To avoid this error, use one of the solutions from the https://www.devexpress.com/kb=T367835 KB Article.

Inner exception: Das Schema muss aktualisiert werden. Bitte den Systemadministrator kontaktieren. Sql Text: Invalid object name 'dbo.ModuleInfo'.
how_to_precache_an_xaf_winforms_application.Win.exe Error: 0 : 26.03.19 14:16:51.646	================================================================================
The error occurred:

	Type:       InvalidOperationException
	Message:    The application cannot connect to the specified database, because the database doesn't exist, its version is older than that of the application or its schema does not match the ORM data model structure. To avoid this error, use one of the solutions from the https://www.devexpress.com/kb=T367835 KB Article.

Inner exception: Das Schema muss aktualisiert werden. Bitte den Systemadministrator kontaktieren. Sql Text: Invalid object name 'dbo.ModuleInfo'.
	Data:       0 entries
	Stack trace:
```

After that we get the following start time in `Release` mode:

- 10.198 seconds, CheckCompatibiltiy.ModuleInfo, Release Config, No Debugger Attached (normal Ctrl+F5 behavior)

![The with caching and CheckCompatibiltiy.ModuleInfo in Release Mode without Debugger](/img/posts/2019/2019-03-26-moduleinfo-release-mode.png)

So compared to our first run we got 15.406 seconds by [those simple changes](//github.com/biohazard999/how-to-precache-an-xaf-winforms-application/pull/1)! That's what we are looking for.
But there are 2 problems, now we turned everything off that makes it easy to develop with XAF, those performance optimizations should only be applied when we deploy to production!

#### Automation is key

To ease up development, we should automate all tasks that we do more often, are prone to errors, and can be solved much better by a computer than a human.

For the versioning problem I usually do 2 things.

1. Create an `GlobalAssemblyInfo.cs` file, and [link it in all projects](//andrewlock.net/including-linked-files-from-outside-the-project-directory-in-asp-net-core/).
1. Automate the release build with a [cake build](/2018/03/31/baking-your-app-using-csharp-with-cake.html)

##### Create an GlobalAssemblyInfo.cs file

Create a `src/GlobalAssemblyInfo.cs` file.

```cs
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("Fa. Manuel Grundner")]
[assembly: AssemblyDescription("This project describes how to pre cache all files for an XAF application")]
[assembly: AssemblyProduct("how-to-precache-an-xaf-winforms-application.Win")]
[assembly: AssemblyCopyright("Copyright Manuel Grundner © 2019")]
[assembly: AssemblyTrademark("")]

[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]
```

Now we link that file in every module under properties either via VisualStudio or directly in the 3 `.csproj` files:

![Add an existing Item in VisualStudio](/img/posts/2019/2019-03-26-add-existing-item.png)
![Link an existing Item in VisualStudio](/img/posts/2019/2019-03-26-link-file-via-visualstudio.png)

Or add them in the `*.csproj` directly:

```xml
<ItemGroup>
    <Compile Include="..\GlobalAssemblyInfo.cs">
      <Link>Properties\GlobalAssemblyInfo.cs</Link>
    </Compile>
</ItemGroup>
```

After we build, we get an error saying we have duplicate Attributes. So let's rid of all those in the 3 `AssemblyInfo.cs` files.

`src/how_to_precache_an_xaf_winforms_application.Win/Properties/AssemblyInfo.cs`

```cs
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

// General Information about an assembly is controlled through the following 
// set of attributes. Change these attribute values to modify the information
// associated with an assembly.
[assembly: AssemblyTitle("how-to-precache-an-xaf-winforms-application.Win")]

// Setting ComVisible to false makes the types in this assembly not visible 
// to COM components.  If you need to access a type in this assembly from 
// COM, set the ComVisible attribute to true on that type.
[assembly: ComVisible(false)]
```

Build, and no errors! Now we have everything in place to [manually update the version in one file](//github.com/biohazard999/how-to-precache-an-xaf-winforms-application/pull/2).

##### Automate versioning with cake

[It's easy to automate things](/2018/03/31/baking-your-app-using-csharp-with-cake.html), esp. if you don't need to learn a new language. Use [Cake](//cakebuild.net) to automate in C#!

I don't want to go through all details to setup it, I've already done that in my [other post on cake](/2018/03/31/baking-your-app-using-csharp-with-cake.html). But you can look at the [Pull-Request](//github.com/biohazard999/how-to-precache-an-xaf-winforms-application/pull/3) to see what's changed.

So we want to [read](//cakebuild.net/api/Cake.Common.Solution.Project.Properties/AssemblyInfoAliases/3B83CE42) and [write](//cakebuild.net/api/Cake.Common.Solution.Project.Properties/AssemblyInfoAliases/A528A2DA) a `GlobalAssemblyInfo.cs` with cake!

`build.cake`

```cs
#tool "nuget:?package=GitVersion.CommandLine"

var target = string.IsNullOrEmpty(Argument("target", "Default")) ? "Default" : Argument("target", "Default");

public class BuildInfo
{
    public string GlobalAssemblyInfo { get; } = "./src/GlobalAssemblyInfo.cs";
    public string Sln { get; } = "./how-to-precache-an-xaf-winforms-application.sln";
}

void UpdateVersionInfo(Func<Version, Version> callback = null)
{
    var assemblyInfo = ParseAssemblyInfo(info.GlobalAssemblyInfo);
    var assemblyVersion = Version.Parse(assemblyInfo.AssemblyVersion);

    if(callback != null) assemblyVersion = callback(assemblyVersion);
    var gitVersion = GitVersion();
    var sha = gitVersion.Sha;
    var branch = gitVersion.BranchName;
    Information($"Version: {assemblyVersion}");
    Information($"Sha: {sha}");

    CreateAssemblyInfo(info.GlobalAssemblyInfo, new AssemblyInfoSettings
    {
        Configuration = assemblyInfo.Configuration,
        Company = assemblyInfo.Company,
        Description = assemblyInfo.Description,
        Product = assemblyInfo.Product,
        Copyright = assemblyInfo.Copyright,
        Trademark = assemblyInfo.Trademark,

        Version = assemblyVersion.ToString(),
        FileVersion = assemblyVersion.ToString(),
        InformationalVersion = $"{assemblyVersion}+{sha}+{branch}",
    });
}

var info = new BuildInfo();

Task("Version:Display").Does(() => UpdateVersionInfo());

Task("Version:Major").Does(() => UpdateVersionInfo(v => new Version(v.Major + 1, v.Minor, v.Build, v.Revision)));

Task("Version:Minor").Does(() => UpdateVersionInfo(v => new Version(v.Major, v.Minor + 1, v.Build, v.Revision)));

Task("Version:Build").Does(() => UpdateVersionInfo(v => new Version(v.Major, v.Minor, v.Build + 1, v.Revision)));

Task("Version:Rev").Does(() => UpdateVersionInfo(v => new Version(v.Major, v.Minor, v.Build, v.Revision + 1)));

Task("Build")
    .IsDependentOn("Version:Display")
    .Does(() =>
{
    MSBuild(info.Sln);
});

Task("Default")
    .IsDependentOn("Build");

RunTarget(target);
```

After running `build version:display` we now should get an output like this, and a new generated `GlobalAssemblyInfo.cs`.

```txt
C:\F\github\how-to-precache-an-xaf-winforms-application>build version:display

C:\F\github\how-to-precache-an-xaf-winforms-application>if not exist tools\nuget.exe powershell -Command "Invoke-WebRequest https://dist.nuget.org/win-x86-commandline/latest/nuget.exe -OutFile tools\nuget.exe"   & pushd tools   & nuget.exe install -ExcludeVersion   & popd

C:\F\github\how-to-precache-an-xaf-winforms-application>if not exist build.ps1 powershell -Command "Invoke-WebRequest https://cakebuild.net/download/bootstrapper/windows -OutFile build.ps1"

C:\F\github\how-to-precache-an-xaf-winforms-application>tools\cake\cake.exe build.cake -target=version:display

========================================
Version:Display
========================================
Version: 1.0.0.0
Sha: cbf1513a7365243aadec91ecf3a0053212baa07a

Task                          Duration
--------------------------------------------------
Version:Display               00:00:00.4316200
--------------------------------------------------
Total:                        00:00:00.4316200
```

`GlobalVersionInfo.cs`

```cs
//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by Cake.
// </auto-generated>
//------------------------------------------------------------------------------
using System.Reflection;

[assembly: AssemblyDescription("This project describes how to pre cache all files for an XAF application")]
[assembly: AssemblyCompany("Fa. Manuel Grundner")]
[assembly: AssemblyProduct("how-to-precache-an-xaf-winforms-application.Win")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]
[assembly: AssemblyInformationalVersion("1.0.0.0+cbf1513a7365243aadec91ecf3a0053212baa07a+topic/automate-version-with-cake")]
[assembly: AssemblyCopyright("Copyright Manuel Grundner © 2019")]
[assembly: AssemblyTrademark("")]
[assembly: AssemblyConfiguration("")]
```

> I used `GitVersion` to update the `AssemblyInformationalVersion` to contain the git sha and branch name to track the assembly for later usage. For example customer support. If you don't use GIT, you can remove the `GitVersion` from the build script.

To upgrade any of the version numbers we now can simply run the build script before deploying to production, or use it in a [VSTS/Azure Pipelines](/2016/05/10/how-to-build-an-xaf-application-with-visual-studio-team-services.html) build:

- `build version:major` Upgrade Major (x.0.0.0)
- `build version:minor` Upgrade Minor (0.x.0.0)
- `build version:build` Upgrade Build (0.0.x.0)
- `build version:rev` Upgrade Revision  (0.0.0.x)

##### Pre cache all the files

![Generate all the caches meme](/img/posts/2019/2019-03-26-cache-meme.jpg)

Now it's time to finally look into automating the core of this post, the files XAF creates when `winApplication.Setup()` is called.

In my [last post](/2018/04/15/how-to-use-the-desktop-bridge-to-create-an-appx-package-for-xaf.html) I was using a separate console application to create those caches, and link them afterwards. This time I will go a slightly different route. I'll create a nuget-package and an MSBuild-Task to encapsulate that stuff further, so it's more reuseable. For now i will stick with this solution, and pack everything into this project for reference. Later on I will host this stuff in a separate repository at github for easier reuse.

###### The idea

The last approach with the separate CLI project has a problem, especially if you are dealing with a single application. We deal with a circular reference between the CLI project and the Win project. By linking in the files directly from disc, we get in trouble if they don't exist anymore (for example you clone a fresh copy, or run it on a build server).

So what can we do to fix that? Remember, all we need to do is to call `winApplication.Setup()` and grab those files somehow and ship them with the released bits.

So let's have a look:

<pre>
                               Scissors.Xaf.             Scissors.Xaf.                Scissors.Xaf.
    WinApplication        CacheWarmup.Attributes    CacheWarmup.Generators         CacheWarmup.MSBuild
+-------------------+     +-------------------+     +-------------------+         +-------------------+
|                   |     |                   |     |                   |         |                   |
|                   |     |                   |     |                   |         |                   |
|                   +---->+                   +<----+                   +<---+----+                   |
|                   |     |                   |     |                   |    |    |                   |
|                   |     |                   |     |                   |    |    |                   |
+-------------------+     +-------------------+     +-------------------+    |    +-------------------+
                                                                             |
                                                                             |        Scissors.Xaf.
                                                                             |       CacheWarmup.Cli
                                                                             |    +-------------------+
                                                                             |    |                   |
                                                                             |    |                   |
                                                                             +----+                   |
                                                                                  |                   |
                                                                                  |                   |
                                                                                  +-------------------+
</pre>

I've dive into each bit real quick:

- `WinApplication`: Any project that contains a `WinApplication`, in this case it's the `how_to_precache_an_xaf_winforms_application.Win.how_to_precache_an_xaf_winforms_applicationWindowsFormsApplication`.
- `Scissors.Xaf.CacheWarmup.Attributes`: The project contains an `XafCacheWarmupAttribute` that we use in the `WinApplication` project. The reason why we create a separate assembly here, is avoiding dependency leaking into the actual application.
- `Scissors.Xaf.CacheWarmup.Generators`: Contains all the logic to warmup those caches. It will search through `.dll` or `.exe` files for the `XafCacheWarmupAttribute` and spawn a separate `AppDomain` when setting up the application.
- `Scissors.Xaf.CacheWarmup.Generators.MSBuild`: A library containing an MSBuild-Task to ease up things up, when using for example AppX
- `Scissors.Xaf.CacheWarmup.Generators.Cli`: A simple executable that warms up those caches
- `Scissors.Xaf.CacheWarmup.Generators.Cake`: You name it. It's just a matter of integration. But a Cake Task would be nice to have handy, since we are already in cake land.

So let's reference the `Scissors.Xaf.CacheWarmup.Attributes` project inside our winforms app.
Then declare a Attribute inside `Properties/AssemblyInfo.cs`.

```cs
using how_to_precache_an_xaf_winforms_application.Win;
using Scissors.Xaf.CacheWarmup.Attributes;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

// General Information about an assembly is controlled through the following 
// set of attributes. Change these attribute values to modify the information
// associated with an assembly.
[assembly: AssemblyTitle("how-to-precache-an-xaf-winforms-application.Win")]

// Setting ComVisible to false makes the types in this assembly not visible 
// to COM components.  If you need to access a type in this assembly from 
// COM, set the ComVisible attribute to true on that type.
[assembly: ComVisible(false)]

[assembly: XafCacheWarmup(typeof(how_to_precache_an_xaf_winforms_applicationWindowsFormsApplication))]
```

That will tell the cache generator what application it should create and warm up those caches.

> Note: The next step can be skipped later on, after I published the nuget package 
Now we need to reference the `Scissors.Xaf.CacheWarmup.Generators.MSBuild` project.
We need to tell MSBuild that it should invoke the cache warmup after the build was finished:

`how_to_precache_an_xaf_winforms_application.Win.csproj`

```xml
<!--> End of file -->
<PropertyGroup>
    <XafPreCacheGenerator>$(OutputPath)Scissors.Xaf.CacheWarmup.Generators.MsBuild.dll</XafPreCacheGenerator>
    <XafApplicationPath>$(MSBuildThisFileDirectory)$(OutputPath)$(AssemblyName).exe</XafApplicationPath>
  </PropertyGroup>
  <UsingTask TaskName="Scissors.Xaf.CacheWarmup.Generators.MsBuild.XafCacheWarmupTask" AssemblyFile="$(XafPreCacheGenerator)" />
  <Target Name="AfterBuild">
    <XafCacheWarmupTask ApplicationPath="$(XafApplicationPath)" />
  </Target>
```

Let's build the project by invoking `build.cmd` and we should see something like this in the output:

```txt
ApplicationPath: C:\F\github\how-to-precache-an-xaf-winforms-application\src\how_to_precache_an_xaf_winforms_application.Win\bin\Debug\how_to_precache_an_xaf_winforms_application.Win.exe
Try to find XafCacheWarmupAttribute in C:\F\github\how-to-precache-an-xaf-winforms-application\src\how_to_precache_an_xaf_winforms_application.Win\bin\Debug\how_to_precache_an_xaf_winforms_application.Win.exe
Found XafCacheWarmupAttribute with 'how_to_precache_an_xaf_winforms_application.Win.how_to_precache_an_xaf_winforms_applicationWindowsFormsApplication'
how_to_precache_an_xaf_winforms_application.Win.how_to_precache_an_xaf_winforms_applicationWindowsFormsApplication
Try to find how_to_precache_an_xaf_winforms_application.Win.how_to_precache_an_xaf_winforms_applicationWindowsFormsApplication in C:\F\github\how-to-precache-an-xaf-winforms-application\src\how_to_precache_an_xaf_winforms_application.Win\bin\Debug\how_to_precache_an_xaf_winforms_application.Win.exe
Found how_to_precache_an_xaf_winforms_application.Win.how_to_precache_an_xaf_winforms_applicationWindowsFormsApplication in C:\F\github\how-to-precache-an-xaf-winforms-application\src\how_to_precache_an_xaf_winforms_application.Win\bin\Debug\how_to_precache_an_xaf_winforms_application.Win.exe
Creating Application
Created Application
Remove SplashScreen
Set DatabaseUpdateMode: 'Never'
Setting up application
Starting cache warmup
Setup application done.
Wormed up caches.
DcAssemblyFilePath: C:\F\github\how-to-precache-an-xaf-winforms-application\src\how_to_precache_an_xaf_winforms_application.Win\bin\Debug\DcAssembly.dll
ModelAssemblyFilePath: C:\F\github\how-to-precache-an-xaf-winforms-application\src\how_to_precache_an_xaf_winforms_application.Win\bin\Debug\ModelAssembly.dll
ModelCacheFilePath: C:\F\github\how-to-precache-an-xaf-winforms-application\src\how_to_precache_an_xaf_winforms_application.Win\bin\Debug
ModulesVersionInfoFilePath: C:\F\github\how-to-precache-an-xaf-winforms-application\src\how_to_precache_an_xaf_winforms_application.Win\bin\Debug\ModulesVersionInfo
Done
```

Let's look into the output directory:

![Explorer window with output directory and cached files present](/img/posts/2019/2019-03-26-output-with-cache.png)

[Neat!](//github.com/biohazard999/how-to-precache-an-xaf-winforms-application/pull/5)!

##### Let's add an APPX package

First, I [needed to upgrade the Project to at least .NET 4.61](//github.com/biohazard999/how-to-precache-an-xaf-winforms-application/pull/6) and get a shorter name.

Then I [added a new APPX package](//docs.microsoft.com/en-us/windows/uwp/porting/desktop-to-uwp-root) as [described in my older post](/2018/04/15/how-to-use-the-desktop-bridge-to-create-an-appx-package-for-xaf.html).

After that I first thought everything is a breeze, just add a reference to `PreCacheDemo.Win` done. But the way the APPX package is build, I've thought giving up, and make the package by hand. Which is a pain in the ass. 
I tried everything, but APPX package wasn't including the pre-cached files.

What I've tried:

- Link the files directly in `PreCacheDemo.Win` -> Locking issues, rebuild issues
- Link the files after the `XafCacheWarmupTask` -> Direct, with output parameters -> APPX will not include them
- Link the files in the `PreCacheDemo.Win.Package` -> They are somewhat listed in the build, but not packaged
- Link the files in the `PreCacheDemo.Win.Package\PreCacheDemo.Win` folder -> Seamed promising, nothing

So I was frustrated (4 days of trial and error, digging into logs, [stackoverflowin](https://twitter.com/biohaz999/status/1112295426022170624)), but then an idea came into my mind: Add a new project `PreCacheDemo.Win.PreCache`, and reference the `PreCacheDemo.Win` and link the files there, use this as an entry point for `PreCacheDemo.Win.Package` success!

![Not so instant success (success kid meme)](/img/posts/2019/2019-03-26-success-meme.jpg)

`PreCacheDemo.Win.PreCache.csproj`

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="15.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <Import Project="$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props" Condition="Exists('$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props')" />
  <PropertyGroup>
    <Configuration Condition=" '$(Configuration)' == '' ">Debug</Configuration>
    <Platform Condition=" '$(Platform)' == '' ">AnyCPU</Platform>
    <ProjectGuid>{68140DD9-8910-43C8-A1B3-C019E7EAD72D}</ProjectGuid>
    <OutputType>WinExe</OutputType>
    <AppDesignerFolder>Properties</AppDesignerFolder>
    <RootNamespace>PreCacheDemo.Win.PreCache</RootNamespace>
    <AssemblyName>PreCacheDemo.Win.PreCache</AssemblyName>
    <TargetFrameworkVersion>v4.6.1</TargetFrameworkVersion>
    <FileAlignment>512</FileAlignment>
    <Deterministic>true</Deterministic>
  </PropertyGroup>
  <PropertyGroup Condition=" '$(Configuration)|$(Platform)' == 'Debug|AnyCPU' ">
    <DebugSymbols>true</DebugSymbols>
    <DebugType>full</DebugType>
    <Optimize>false</Optimize>
    <OutputPath>bin\Debug\</OutputPath>
    <DefineConstants>DEBUG;TRACE</DefineConstants>
    <ErrorReport>prompt</ErrorReport>
    <WarningLevel>4</WarningLevel>
  </PropertyGroup>
  <PropertyGroup Condition=" '$(Configuration)|$(Platform)' == 'Release|AnyCPU' ">
    <DebugType>pdbonly</DebugType>
    <Optimize>true</Optimize>
    <OutputPath>bin\Release\</OutputPath>
    <DefineConstants>TRACE</DefineConstants>
    <ErrorReport>prompt</ErrorReport>
    <WarningLevel>4</WarningLevel>
  </PropertyGroup>
  <PropertyGroup>
    <StartupObject />
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="System" />
    <Reference Include="System.Core" />
    <Reference Include="System.Xml.Linq" />
    <Reference Include="System.Data.DataSetExtensions" />
    <Reference Include="Microsoft.CSharp" />
    <Reference Include="System.Data" />
    <Reference Include="System.Net.Http" />
    <Reference Include="System.Xml" />
  </ItemGroup>
  <ItemGroup> 
    <Compile Include="..\GlobalAssemblyInfo.cs">
      <Link>Properties\GlobalAssemblyInfo.cs</Link>
    </Compile>
    <Compile Include="Program.cs" />
    <Compile Include="Properties\AssemblyInfo.cs" />
  </ItemGroup>
  <ItemGroup>
    <Content Include="..\PreCacheDemo.Win\bin\$(Configuration)\Model.Cache.xafml">
      <Link>Model.Cache.xafml</Link>
    </Content>
    <Content Include="..\PreCacheDemo.Win\bin\$(Configuration)\ModulesVersionInfo">
      <Link>ModulesVersionInfo</Link>
    </Content>
    <Content Include="..\PreCacheDemo.Win\bin\$(Configuration)\ModelAssembly.dll">
      <Link>ModelAssembly.dll</Link>
    </Content>
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\PreCacheDemo.Win\PreCacheDemo.Win.csproj">
      <Project>{d05d93df-312d-4d4e-b980-726871ec7833}</Project>
      <Name>PreCacheDemo.Win</Name>
    </ProjectReference>
  </ItemGroup>
  <Import Project="$(MSBuildToolsPath)\Microsoft.CSharp.targets" />
</Project>
```

The interesting part is here:

```xml
<ItemGroup>
    <Content Include="..\PreCacheDemo.Win\bin\$(Configuration)\Model.Cache.xafml">
        <Link>Model.Cache.xafml</Link>
    </Content>
    <Content Include="..\PreCacheDemo.Win\bin\$(Configuration)\ModulesVersionInfo">
        <Link>ModulesVersionInfo</Link>
    </Content>
    <Content Include="..\PreCacheDemo.Win\bin\$(Configuration)\ModelAssembly.dll">
        <Link>ModelAssembly.dll</Link>
    </Content>
</ItemGroup>
```

After that we just need to add a `Program.cs` file, and call into `PreCacheDemo.Win.Program` (make sure to make this type public):

```cs
using System;

namespace PreCacheDemo.Win.PreCache
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            PreCacheDemo.Win.Program.Main();
        }
    }
}
```

[After that](//github.com/biohazard999/how-to-precache-an-xaf-winforms-application/pull/7) I can look into the generated APPX package (which is a ordinary zip file):

![APPX zip file with cached files present](/img/posts/2019/2019-03-26-appx-with-cache.png)

#### Further optimizations

- NGen - Pre JIT assemblies
- AppX - e.g new `ClickOnce`
- dotnet.core 3.0

Let's have a look into detail, what are the pro's and con's of each optimization.

- NGen
  - Pro's
    - Fast execution
    - Stable and well tested
  - Con's
    - Requires at least once admin privileges per installation
    - Registers all assemblies into GAC, means we need strong named assemblies
    - Antique
- AppX if we use AppX we get NGen for free!
  - Pro's
    - No Admin privileges needed!
    - Good tooling
    - Who cares about Windows 7, if lifetime is over
    - Don't need to go into Windows-Store / but can
    - Clean uninstall
  - Con's
    - Only Windows 10 / Server 2016 support
    - Who cares about Windows 7, if lifetime is over
    - Can go into Windows-Store / but don't have to
    - Manifest and not 100% full trust
- dotnet.core 3.0
  - Pro's
    - The *modern* dotnet
    - Has a lot of performance optimizations out of the box (`Span<T>`, `dotnet native etc`)
    - Still in beta, support from [DevExpress](//community.devexpress.com/blogs/winforms/archive/2019/01/25/winforms-controls-2019-roadmap.aspx#netcore) is in the making, so further investigations are needed
    - Self contained
  - Con's
    - Is still in beta
    - Requires some changes in your app
    - No support for unsupported platforms (Windows 7 and lower)

### Fair comparison

In my current example I'm using EF & XPO in one application. Most apps will use one or the other, so to be fair, and realistic, I'll replayed the benchmarks I've done earlier with different version of the app. With XPO only, EF only and mixed mode. But thats for the next post!

### Recap

It wasn't that hard to get this stuff working, until APPX wasn't cooperating. I think it's hiding to much from the developer. There isn't very good documentation out there yet. If it works, it's really awesome, but man, if not you're doomed :D.
Please make sure you look into the [pull requests](//github.com/biohazard999/how-to-precache-an-xaf-winforms-application/pulls?q=is%3Apr+is%3Aclosed), for an start to finish reference implementation.
I want to look into packing them into a separate nuget, so it's easier to consume, but for now I think this should work.

Happy pre caching!
