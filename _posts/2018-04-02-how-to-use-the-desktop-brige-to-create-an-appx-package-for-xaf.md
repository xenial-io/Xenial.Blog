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

So let's follow the instructions:

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

Let's set the new project as startup project and hit `F5`:

