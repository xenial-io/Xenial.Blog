---
 layout: post 
 title: Baking your App using C# with Cake
 tags: [Build, CSharp, Cake, Fake]
---

When you work in a team, or are tired of building your solution with [VisualStudio](//www.visualstudio.com/) and like to use something lighter (for example [VSCode](//code.visualstudio.com/)) you need to build your stuff from the commandline. In the past i used [Fake](//fake.build/) to build my stuff from the commandline, but I'm a C# guy so let's use C# to build and test your app!

## Bootstrapping

[Cake](//cakebuild.net/) provides a build.ps1 in there docs but I came accross some problems in the past with it, version pinning.
If you build an app on a build server, nothing is more problematic, than having a build that worked totally fine one day, and out of a sudden it breaks. Build tools should not update them self automatically, unless you can 100% trust that updates don't break your stuff. So let's start.

Usually I put all my build tools in a subfolder called tools. Cause everything is on nuget now a days, so let's put a `tools\packages.config` there.

``` xml
<?xml version="1.0" encoding="utf-8"?>
<packages>
    <package id="Cake" version="0.26.1" />
</packages>
```

At the moment of writing this post I pinned it to version `0.26.1`. They update their stuff very frequently (about once a month), so make sure you check for update frequently to get the latest bugfixes and features.

Now put a simple `build.cmd` file in the root of your project.

``` cmd
if not exist tools\nuget.exe powershell -Command "Invoke-WebRequest https://dist.nuget.org/win-x86-commandline/latest/nuget.exe -OutFile tools\nuget.exe" & cd tools & nuget.exe install -ExcludeVersion & cd ..

tools\cake\cake.exe build.cake -target=%*
```

The first line will download the latest version of nuget, if it does not exist, and install the packages without version. Why the latest? Cause I 100% trust the nuget team not to break stuff. ;)
The second line will launch the build tool with a file called `build.cake` and passes all params to the target param (so we can use parameters in the build script).

## Build-Script

Let's try the simplest build script possible.

```cs
var target = string.IsNullOrEmpty(Argument("target", "Default")) ? "Default" : Argument("target", "Default");

Task("Default")
    .Does(() =>
    {
        Information("Hello world");
    });

RunTarget(target);
```

```cmd
build
```

![Hello world cake script](/img/posts/2018/2018-03-31-cake1.png)

As you can see, nuget is downloaded and cake is restored. Let's look what the tools folder now looks like:

![Tools folder](/img/posts/2018/2018-03-31-explorer1.png)

As for the build script: We need a little bit of code in the first line to get the `Default` target cause cmd will pass `%*` as an empty param.


The build is arranged in `Tasks`. And then the `Default` target is executed. Lets make a real build:

```cs
var target = string.IsNullOrEmpty(Argument("target", "Default")) ? "Default" : Argument("target", "Default");

Task("Build")
    .Does(() =>
    {
        MSBuild("./Scissors.FeatureCenter.sln", settings =>
        {
            settings.MaxCpuCount = 8;
            settings.Verbosity = Verbosity.Normal;
            settings.Configuration = "Debug";
            settings.PlatformTarget = PlatformTarget.MSIL;
        });
    });

Task("Default")
    .IsDependentOn("Build");

RunTarget(target);
```

```cmd
build
```

![Basic cake script](/img/posts/2018/2018-03-31-cake2.png)

Awesome!  
As you can see for the `Default` task we can make dependencies on other tasks. The [MSBuild](https://cakebuild.net/api/Cake.Common.Tools.MSBuild/MSBuildAliases/C240F0FB) task has a lot of options, so make sure you check out the [excelent documentation](//cakebuild.net/docs/). So let's make a `Release` build.

```cs
var target = string.IsNullOrEmpty(Argument("target", "Default")) ? "Default" : Argument("target", "Default");


void Build(string configuration = "Debug")
{
    MSBuild("./Scissors.FeatureCenter.sln", settings =>
    {
        settings.MaxCpuCount = 8;
        settings.Verbosity = Verbosity.Minimal;
        settings.Configuration = configuration;
        settings.PlatformTarget = PlatformTarget.MSIL;
    });
}

Task("Build")
    .Does(() =>
    {
        Build();
    });


Task("Release")
    .Does(() =>
    {
        Build("Release");
    });

Task("Default")
    .IsDependentOn("Build");

RunTarget(target);
```

Let's run `build Release`:

![Release cake script](/img/posts/2018/2018-03-31-cake3.png)

> For the sake of this screenshot I changed the verbosity of MSBuild to Silent.

The cool thing about Cake is that it'S just C#! You can write methods or even classes! Cause we are good developers and we like our code to be DRY we made an method for building, and passing parameters for the configuration for Debug and Release builds.

## Testing

I like to use XUnit. It's a really powerful testing framework, easy to use and extensible. So lets check if the folks of Cake build an DSL extension for XUnit2. They [did](//cakebuild.net/dsl/xunit-v2/)!

``` cs
#tool "nuget:?package=xunit.runner.console"

var target = string.IsNullOrEmpty(Argument("target", "Default")) ? "Default" : Argument("target", "Default");

void Build(string configuration = "Debug")
{
    MSBuild("./Scissors.FeatureCenter.sln", settings =>
    {
        settings.MaxCpuCount = 8;
        settings.Verbosity = Verbosity.Minimal;
        settings.Configuration = configuration;
        settings.PlatformTarget = PlatformTarget.MSIL;
    });
}

Task("Build")
    .Does(() =>
    {
        Build();
    });


Task("Release")
    .Does(() => Build("Release"));

Task("Test")
    .IsDependentOn("Build")
    .Does(() =>
    {
        var testAssemblies = GetFiles("./src/**/bin/**/*.*Tests*.dll");

        XUnit2(testAssemblies, new XUnit2Settings 
        {
            ReportName = "TestResults",
            Parallelism = ParallelismOption.Collections,
            HtmlReport = true,
            XmlReport = true,
            OutputDirectory = "./build",
        });
    });


Task("Default")
    .IsDependentOn("Build");

RunTarget(target);
```

There are 2 new things: the `#tool "nuget:?package=xunit.runner.console"` directive. That tells Cake where to find the `XUnit2` runner.
The other thing is the `Test Task`. We glob for all `Test.dll`s in our output, and pass it into the runner. I like to put my test results in a build folder.

Let's look:

```cmd
build test
```

![Slow cake script with tests](/img/posts/2018/2018-03-31-cake4.png)

Awesome, but wait? 1 minute? Ahhh ALL my tests ran. I've got some UITests i like to put into another Task.

``` cs
#tool "nuget:?package=xunit.runner.console"

var target = string.IsNullOrEmpty(Argument("target", "Default")) ? "Default" : Argument("target", "Default");

void Build(string configuration = "Debug")
{
    MSBuild("./Scissors.FeatureCenter.sln", settings =>
    {
        settings.MaxCpuCount = 8;
        settings.Verbosity = Verbosity.Minimal;
        settings.Configuration = configuration;
        settings.PlatformTarget = PlatformTarget.MSIL;
    });
}

Task("Build")
    .Does(() =>
    {
        Build();
    });


Task("Release")
    .Does(() => Build("Release"));

Task("Test")
    .IsDependentOn("Build")
    .Does(() =>
    {
        var testAssemblies = GetFiles($"./src/**/bin/**/*.*Tests*.dll");

        XUnit2(testAssemblies, new XUnit2Settings 
        {
            ReportName = "TestResults",
            Parallelism = ParallelismOption.All,
            HtmlReport = true,
            XmlReport = true,
            OutputDirectory = "./build",
        }.ExcludeTrait("Category", "UITest"));
    });

Task("UITest")
    .IsDependentOn("Test")
    .IsDependentOn("Release")
    .Does(() =>
    {
        var testAssemblies = GetFiles("./src/**/bin/Release/**/*.*Tests*.dll");

        XUnit2(testAssemblies, new XUnit2Settings 
        {
            ReportName = "TestResults_UITests",
            Parallelism = ParallelismOption.Collections,
            HtmlReport = true,
            XmlReport = true,
            OutputDirectory = "./build",
        }.IncludeTrait("Category", "UITest"));
    });


Task("Default")
    .IsDependentOn("Build");

RunTarget(target);
```

If we look at the `testAssemblies` in the `Test` target we see that we run tests from both `Release` and `Debug` configuration. Thats cool, cause if our `Release` folders are empty, we just run the unit tests in `Debug` build. But if we build in `Release` tests are in `Release` and `Debug` configurations! (I'll show a little trick at the end for faster test execution while developing).
The other thing is i include the `UITest` trait in the `UITest` target and exclude it in the `Test` target.

Let's run `build test` again and see whats the difference.

![Fast cake script with tests](/img/posts/2018/2018-03-31-cake5.png)

Total time 5 seconds, nice!

Now look at a full release build with unittests and UI-tests in Release mode:

Let's run `build uitest`:

![UITests cake script](/img/posts/2018/2018-03-31-cake6.png)

### Bonus

Now for the little trick. If you are using [Git](//git-scm.com/) (you should do it) you can use a git command to clean out all assets that are not under version control:

``` cmd
git clean -ffxd
```

But don't forget to add your `tools\packages.config` to version control if you add the `tools` folder to the `.gitignore` file.

I usually put this command in a `git-clean.cmd` file in the root of the project. It's also handy if you need to make a quick copy of a repository cause it shrinks all the binary assets.

*BEWARE - RUNNING THIS COMMAND WILL DELETE ANY FILE IN YOUR REPOSITORY THAT'S NOT UNDER VERSION CONTROL* 

After running this i noticed a problem. I forgot to restore my nuget packages. So let`s have a look at the build now:

```cs
#tool "nuget:?package=xunit.runner.console"

var target = Argument("target", "Default");

void Build(string configuration = "Debug")
{
    MSBuild("./Scissors.FeatureCenter.sln", settings =>
    {
        settings.MaxCpuCount = 8;
        settings.Verbosity = Verbosity.Minimal;
        settings.Configuration = configuration;
        settings.PlatformTarget = PlatformTarget.MSIL;
    });
}

Task("Restore")
    .Does(() => NuGetRestore("./Scissors.FeatureCenter.sln"));

Task("Build")    
    .IsDependentOn("Restore")
    .Does(() =>
    {
        Build();
    });

Task("Release")
    .IsDependentOn("Restore")
    .Does(() =>
    {
        Build("Release");
    });

Task("Test")
    .IsDependentOn("Build")
    .Does(() =>
    {
        var testAssemblies = GetFiles("./src/**/bin/**/*.*Tests*.dll");

        XUnit2(testAssemblies, new XUnit2Settings 
        {
            ReportName = "TestResults",
            Parallelism = ParallelismOption.Collections,
            HtmlReport = true,
            XmlReport = true,
            OutputDirectory = "./build",
        }.ExcludeTrait("Category", "UITest"));
    });

Task("UITest")
    .IsDependentOn("Test")
    .IsDependentOn("Release")
    .Does(() =>
    {
        var testAssemblies = GetFiles("./src/**/bin/Release/**/*.*Tests*.dll");

        XUnit2(testAssemblies, new XUnit2Settings 
        {
            ReportName = "TestResults_UITests",
            Parallelism = ParallelismOption.Collections,
            HtmlReport = true,
            XmlReport = true,
            OutputDirectory = "./build",
        }.IncludeTrait("Category", "UITest"));
    });

Task("Default")
    .IsDependentOn("Build");

RunTarget(target);
```

![Final cake script](/img/posts/2018/2018-03-31-cake7.png)

It's so nice to write your build in an easy to read and maintain language. Every C# programmer can write build automation with this awesome project. So use it! No excuses for build automation.

If you like to use VS-Code and like syntax highligthing, they provide a [plugin](//cakebuild.net/docs/editors/vscode).

So let's do what the doc's say add `Cake.Bakery` to the `packages.config` file.

``` xml
<?xml version="1.0" encoding="utf-8"?>
<packages>
    <package id="Cake" version="0.26.1" />
    <package id="Cake.Bakery" version="0.2.0" />	
</packages>
```
``` cmd
cd tools & nuget.exe install -ExcludeVersion & cd ..
```

Reopen VSCode and lets have a look:


![Output of VSCode](/img/posts/2018/2018-03-31-cake8.png)

![Intellisence of VSCode](/img/posts/2018/2018-03-31-cake9.png)

Profit!

You can look at the [repository](//github.com/biohazard999/Scissors.FeatureCenter/) and the [build file](//github.com/biohazard999/Scissors.FeatureCenter/blob/master/build.cake) on my [github](//github.com/biohazard999/) account.