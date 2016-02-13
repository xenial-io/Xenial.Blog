---
 layout: post 
 title: "Migrating from FunnelWeb to Pretzel - Part 2"
 comments: true
 tags: [Pretzel, Git, Cake, VSTS, VisualStudioTeamServices]
---
In our [last post](/posts/2016/02/13/2016-02-13-migrating-from-funnelweb-to-pretzel-part1.html) we got up and running with pretzel.

This time we will look how we setup [Visual-Studio-Team-Services](//www.visualstudio.com/en-us/products/visual-studio-team-services-vs.aspx) to build our blog.
As a Build-Tool we will use [Cake](//cakebuild.net/) cause we can write our build scripts handy in C#.

<!-- more -->
## Let's make some Cake!

Let's navigate in our blog directory and install the `cake` bootstrapper.

```powershell
powershell
Invoke-WebRequest http://cakebuild.net/bootstrapper/windows -OutFile build.ps1
```

Add a file named `build.cake`:

```cs
var target = Argument("target", "Default");

Task("Clean")
  .Does(() =>
{
  if(FileExists("Tools/Pretzel.zip"))
    DeleteFile("Tools/Pretzel.zip");
  if(DirectoryExists("Tools/Pretzel"))
    DeleteDirectory("Tools/Pretzel", true);
  if(DirectoryExists("_site"))
    DeleteDirectory("_site", true);
});


Task("DownloadPretzel")
  .IsDependentOn("Clean")
  .Does(() =>
{
   DownloadFile("https://github.com/Code52/pretzel/releases/download/v0.4.0/Pretzel.0.4.0.zip", "Tools/Pretzel.zip");
});

Task("UnzipPretzel")
  .IsDependentOn("DownloadPretzel")
  .Does(() =>
{
   Unzip("Tools/Pretzel.zip","Tools/Pretzel");
   DeleteFile("Tools/Pretzel.zip");
});

Task("Only-Bake")
  .Does(() =>
{
   using(var process = StartAndReturnProcess("Tools/Pretzel/Pretzel.exe", new ProcessSettings
   {
      Arguments = "bake"
   }))
   {
        process.WaitForExit();
        var result = process.GetExitCode();
        Information("Exit code: {0}", result);
        
        if(result != 0){
            throw new Exception("Pretzel did not bake correctly: Error-Code: " + result); 
        }
   }
});

Task("Bake")
  .IsDependentOn("UnzipPretzel")
  .IsDependentOn("Only-Bake");

Task("Only-Taste")
  .Does(() =>
{
   using(var process = StartAndReturnProcess("Tools/Pretzel/Pretzel.exe", new ProcessSettings
   {
      Arguments = "taste"
   }))
   {
        process.WaitForExit();
        var result = process.GetExitCode();
        Information("Exit code: {0}", result);
        
        if(result != 0){
            throw new Exception("Pretzel did not taste correctly: Error-Code: " + result); 
        }
   }
});

Task("Taste")
  .IsDependentOn("UnzipPretzel")
  .IsDependentOn("Only-Taste");

Task("Draft")
  .Does(() =>
{
   using(var process = StartAndReturnProcess("Tools/Pretzel/Pretzel.exe", new ProcessSettings
   {
      Arguments = "ingredient --drafts"
   }))
   {
        process.WaitForExit();
        var result = process.GetExitCode();
        Information("Exit code: {0}", result);
        
        if(result != 0){
            throw new Exception("Pretzel did not ingredient correctly: Error-Code: " + result); 
        }
   }
});

Task("Ingredient")
  .Does(() =>
{
   using(var process = StartAndReturnProcess("Tools/Pretzel/Pretzel.exe", new ProcessSettings
   {
      Arguments = "ingredient"
   }))
   {
        process.WaitForExit();
        var result = process.GetExitCode();
        Information("Exit code: {0}", result);
        
        if(result != 0){
            throw new Exception("Pretzel did not ingredient correctly: Error-Code: " + result); 
        }
   }
});


Task("Default")
  .IsDependentOn("Bake");

RunTarget(target);
```

This is build script got a bunch of `Targets` but we can focus for now on `Bake` and `Taste`.

```powershell
.\build.ps1
```
This will output:

```cmd
Preparing to run build script...
Running build script...
Analyzing build script...
Processing build script...
Downloading and installing Roslyn...
Installing package...
Copying files...
Copying Roslyn.Compilers.CSharp.dll...
Copying Roslyn.Compilers.dll...
Deleting installation directory...
Compiling build script...

========================================
Clean
========================================
Executing task: Clean
Deleting directory C:/tmp/myNewBlog/_site
Finished executing task: Clean

========================================
DownloadPretzel
========================================
Executing task: DownloadPretzel
Downloading file: https://github.com/Code52/pretzel/releases/download/v0.4.0/Pretzel.0.4.0.zip
Downloading file: 5%
Downloading file: 10%
Downloading file: 15%
Downloading file: 20%
Downloading file: 25%
Downloading file: 30%
Downloading file: 35%
Downloading file: 40%
Downloading file: 45%
Downloading file: 50%
Downloading file: 55%
Downloading file: 60%
Downloading file: 65%
Downloading file: 70%
Downloading file: 75%
Downloading file: 80%
Downloading file: 85%
Downloading file: 90%
Downloading file: 95%
Downloading file: 100%
Download complete, saved to: Tools/Pretzel.zip
Finished executing task: DownloadPretzel

========================================
UnzipPretzel
========================================
Executing task: UnzipPretzel
Unzipping file C:/tmp/myNewBlog/Tools/Pretzel.zip to C:/tmp/myNewBlog/Tools/Pretzel
Deleting file C:/tmp/myNewBlog/Tools/Pretzel.zip
Finished executing task: UnzipPretzel

========================================
Only-Bake
========================================
Executing task: Only-Bake
starting pretzel...
bake - transforming content into a website
Recommended engine for directory: 'liquid'
done - took 271ms
Exit code: 0
Finished executing task: Only-Bake

========================================
Bake
========================================
Executing task: Bake
Finished executing task: Bake

========================================
Default
========================================
Executing task: Default
Finished executing task: Default

Task                          Duration
--------------------------------------------------
Clean                         00:00:00.0098652
DownloadPretzel               00:00:08.4448568
UnzipPretzel                  00:00:00.1900319
Only-Bake                     00:00:00.4412274
Bake                          00:00:00.0039579
Default                       00:00:00.0040178
--------------------------------------------------
Total:                        00:00:09.0939570
```

When we launch the `Taste` Target it will look like this:

```powershell
.\build.ps1 -Target Taste
```

```cmd
Preparing to run build script...
Running build script...
Analyzing build script...
Processing build script...
Compiling build script...

========================================
Clean
========================================
Executing task: Clean
Deleting directory C:/tmp/myNewBlog/Tools/Pretzel
Deleting directory C:/tmp/myNewBlog/_site
Finished executing task: Clean

========================================
DownloadPretzel
========================================
Executing task: DownloadPretzel
Downloading file: https://github.com/Code52/pretzel/releases/download/v0.4.0/Pretzel.0.4.0.zip
Downloading file: 5%
Downloading file: 10%
Downloading file: 15%
Downloading file: 20%
Downloading file: 25%
Downloading file: 30%
Downloading file: 35%
Downloading file: 40%
Downloading file: 45%
Downloading file: 50%
Downloading file: 55%
Downloading file: 60%
Downloading file: 65%
Downloading file: 70%
Downloading file: 75%
Downloading file: 80%
Downloading file: 85%
Downloading file: 90%
Downloading file: 95%
Downloading file: 100%
Download complete, saved to: Tools/Pretzel.zip
Finished executing task: DownloadPretzel

========================================
UnzipPretzel
========================================
Executing task: UnzipPretzel
Unzipping file C:/tmp/myNewBlog/Tools/Pretzel.zip to C:/tmp/myNewBlog/Tools/Pretzel
Deleting file C:/tmp/myNewBlog/Tools/Pretzel.zip
Finished executing task: UnzipPretzel

========================================
Only-Taste
========================================
Executing task: Only-Taste
starting pretzel...
taste - testing a site locally
Recommended engine for directory: 'liquid'
Opening http://localhost:8080/ in default browser...
Press 'Q' to stop the web host...
/
/css/style.css
/img/logo.png
/img/25.png
```
> Make sure port 8080 is free and open on your machine

Okay our build pipeline is ready, so lets hop over to Visual Studio Team Services

## Visual Studio Team Services
