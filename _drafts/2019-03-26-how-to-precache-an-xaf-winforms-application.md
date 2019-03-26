---
 layout: post 
 title: How to pre cache an XAF Winforms Application
 comments: true
 tags: [XAF, Deployment]
---

This is a [follow up post](/2018-04-15-how-to-use-the-desktop-bridge-to-create-an-appx-package-for-xaf) on the APPX package build. Basically it should apply to all XAF-Winforms application, just some path adjustments should be needed.

As in the last post, the idea behind the pre caching is that modules don't change after deployment, so we can pre generate all files needed that are generated at first launch.

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

So compared to our first run we got 15.406 seconds by those simple changes! That's what we are looking for.
But there are 2 problems, now we turned everything off that makes it easy to develop with XAF, those performance optimizations should only be applied when we deploy to production!

#### Automation is key

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
    - The `modern` dotnet
    - Has a lot of performance optimizations out of the box (`Span<T>`, `dotnet native etc`)
    - Still in beta, support from [DevExpress]() is comming, so further investigations are needed
    - Self contained
  - Con's
    - Is still in beta
    - Requires some changes in your app
    - No support for unsupported platforms (Windows 7 and lower)

### Fair comparison

In my current example I'm using EF & XPO in one application. Most apps will use one or the other, so to be fair, and realistic, I'll replayed the benchmarks I've done earlier with different version of the app. With XPO only, EF only and mixed mode.
