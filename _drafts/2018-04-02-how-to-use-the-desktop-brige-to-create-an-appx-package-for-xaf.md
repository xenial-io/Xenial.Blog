---
 layout: post 
 title: How to use the Desktop Brige to create an appx package for XAF
 comments: true
 tags: [XAF, Windows10, DesktopBridge, APPX, Deployment, Clickonce, Squirrel]
---
I was recently thinking how to deploy the scissors feature center and came accross different ideas. My requirements are pretty simple:

* Easy packaging
* Easy versioning
* Easy updating
* Easy install and clean uninstall
* No admin rights
* Easy hosting and uploading

So here are the canidates I found:

* [Clickonce](//msdn.microsoft.com/en-us/library/71baz9ah.aspx)
* [Squirrel](//github.com/Squirrel/Squirrel.Windows/)
* Write something my self
* [Windows Store using the Desktop Bridge](//docs.microsoft.com/en-us/windows/uwp/porting/desktop-to-uwp-root)

###### Clickonce
It's a useful but also very old technology. I worked with it a lot in the past, but it really has it's problems. Updating is slow, you need to serve the files via http, there is no really easy way to distribute the app to another location. So I started looking for alternatives.

###### Squirrel
Looks very promising! I played arround with it and tried to get things going, but it required a lot of steps. So I was thinking what my audience is and came up with another idea. The windows store! Maybe I'll investigate in this technology later.

###### Write something my self
God, no thanks. Don't be stupid that problem is solved already by another person. So let's get started!

## Desktop-Bride
To get started to use the Desktop-Brigde make sure you got the following bits installed:

* Visual Studio 2017 version 15.5 or higher

> The Desktop Bridge was introduced in Windows 10, version 1607, and it can only be used in projects that target Windows 10 Anniversary Update (10.0; Build 14393) or a later release in Visual Studio.

First make sure you got the right tools installed in Visual Studio.
1. `.NET descktop development`
2. `Universal Windows Platform development`

![Adding the packaging project](/img/posts/2018/2018-04-09-packaging-project-install-visualstudio.png)

So let's follow the [instructions](//docs.microsoft.com/en-us/windows/uwp/porting/desktop-to-uwp-packaging-dot-net):

1. In Visual Studio, open the solution that contains your desktop application project.
2. Add a Windows Application Packaging Project project to your solution.  

> You won't have to add any code to it. It's just there to generate a package for you. We'll refer to this project as the "packaging project".

![Adding the packaging project](/img/posts/2018/2018-04-09-packaging-project.png)

3. Set the Target Version of this project to any version that you want, but make sure to set the Minimum Version to Windows 10 Anniversary Update.
4. In the packaging project, right-click the Applications folder, and then choose Add Reference.

![Adding the reference to the packaging project](/img/posts/2018/2018-04-09-packaging-project-add-reference.png)

So the first steps are done! Next we have to do some work in the `Package.appxmanifest` file.


5. Set the Display-Name: `Scissors.FeatureCenter.Win`. Thats what our app is called in Windows.

![Packaging project: manifest-application-tab](/img/posts/2018/2018-04-09-packaging-project-manifest-application.png)

6. Use the `Visual Asset Generator` to generate tiles and icons for the app. Use at least 400x400 pixels to generate, and use an png image with a transparent background

![Packaging project: manifest-visual-assets-tab](/img/posts/2018/2018-04-09-packaging-project-manifest-visual-assets.png)

7. Make sure the `capabilities` are set to `Internet (Client)`

![Packaging project: manifest-capabilities-tab](/img/posts/2018/2018-04-09-packaging-project-manifest-capabilities.png)

8. Set the `Packaging` information to something unique and useful.

![Packaging project: manifest-packaging-tab](/img/posts/2018/2018-04-09-packaging-project-manifest-packaging.png)

Okay lets build now, you should see something like this in the `bin\AnyCPU\Debug` folder

![Packaging project: explorer bin/AnyCPU/Debug](/img/posts/2018/2018-04-09-packaging-project-bin-debug.png)

Let's set the package project as startup project and hit `F5`:

![Packaging project: error on launch](/img/posts/2018/2018-04-09-packaging-project-error-on-first-launch.png)

That sucks :( Basically the error message is saying that it can't write to this particular folder.

So lets look at the [limitations](//docs.microsoft.com/en-us/windows/uwp/porting/desktop-to-uwp-behind-the-scenes) of the packaging process:

* In order to contain app state, the bridge attempts to capture changes the app makes to AppData. All write to the user's AppData folder (e.g., C:\Users\user_name\AppData), including create, delete, and update, are copied on write to a private per-user, per-app location.
* Writes to files/folders in the app package are not allowed. Writes to files and folders that are not part of the package are ignored by the bridge and are allowed as long as the user has permission.

Okay now we have to find out how to overcome this limitation.  
First of all, we need to change the paths where XAF put's the user generated stuff. Second we want to be our application snappy & launch instant, so we want to pre generate the `ModelAssembly.dll`, `Model.Cache.xafml` and `ModulesVersionInfo` file.

Cause I want the sample to be runnable as a *normal WinForms application* as well as a *WindowsStore app* I'll add another project called `Scissors.FeatureCenter.Win10` and cause i don't want to duplicate to much code i add a new project called `Scissors.FeatureCenter.Win.Shared`

![Packaging project: new project win10](/img/posts/2018/2018-04-09-packaging-project-new-project-win10.png)
![Packaging project: new project shared](/img/posts/2018/2018-04-09-packaging-project-new-project-shared.png)

Move all the stuff from `Scissors.FeatureCenter.Win` to the shared project and make a new reference to the shared one:

![Packaging project: move content from win to the new shared project](/img/posts/2018/2018-04-09-packaging-project-move-to-shared-win.png)
![Packaging project: add reference to the shared project from win](/img/posts/2018/2018-04-09-packaging-project-add-reference-to-shared-win.png)

Let's run. Okay the icon is missing. So go into the `Scissors.FeatureCenter.Win` `Properties` panel and change the icon location:

![Packaging project: add icon to the win manifest](/img/posts/2018/2018-04-09-packaging-project-add-icon-to-manifest-win.png)

Run again. Fine! Everything looks pretty damn good!