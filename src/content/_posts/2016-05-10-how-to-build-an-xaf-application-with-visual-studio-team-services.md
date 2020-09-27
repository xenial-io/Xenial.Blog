---
 layout: post 
 title: How to build an XAF-Application with Visual Studio Team Services
 comments: true
 tags: ["NuGet", "DevExpress", "XAF", "VisualStudioTeamServices", "VSTS", "TFS"]
---

After reading the support [question T367724](https://www.devexpress.com/Support/Center/Question/Details/T367724) i decided to write an article about the options you have when building XAF applications with Visual Studio Team Services.

I've done this many times in the past, so i'd like to share my solutions with you.

<!-- more -->

First of all, you have 3 options to build your solution:

1. Using a custom build agent
2. Checking in the DevExpress Assemblies into source control
3. Using NuGet and my [NuGet Package Builder](https://github.com/biohazard999/DXNugetPackageBuilder)

I will only highlight the 1st and 3rd option, cause i don't like to checkin artifacts into source control (esp. with GIT)

The reason we can't use the [hosted build](https://www.visualstudio.com/en-us/features/continuous-integration-vs.aspx) easily, is due the fact, that DevExpress usually installs into GAC.
Cause we can't go and install the DevExpress Components on an hosted build agent, we need to use a custom one, or use a different approach to provide the assemblies, so the build can pickup them.

I prefer the NuGet version, so we can maintain different versions of our application, even with different minor versions of the DevExpress components.
This approach is good when you have either a large number of applications you need to maintain, or more than one team on different versions.

On a regular machine you can only install 1 minor version of DevExpress, but an unlimited number of major builds.

## How to build an XAF-Application with the NuGet approach

I covered how to build your own nuget packages in my [last post](/2016/02/26/nuget-packages-devexpress-components.html) so i will fast forward here:

1. Go and get [GIT](https://rogerdudler.github.io/git-guide/)
2. Open a commandline 
3. Go to a directory you like (I will use `c:\s\git` for the rest of this post) `cd c:\s\git`
4. Clone the repository `git clone https://github.com/biohazard999/DXNugetPackageBuilder`
5. Open the directory `cd DXNugetPackageBuilder`
5. Install VisualStudio 2015 if you don't have it
6. Download and install `Code-Rush`, `.NET Controls & Libraries Installer`, `Coded UI Test Extensions for WinForms` and the `.NET Controls and Libraries PDB Files` from DevExpress
7. Extract the `.NET Controls and Libraries PDB Files` to `c:\tmp\symbols`
So enough preperation so far.

Now we need a private NuGet Feed that is available for the hosted build agent.
You can use MyGet, but luckily VSTS now offers a [integrated Package Feed](https://marketplace.visualstudio.com/items?itemName=ms.feed) for us. This is currently in preview, but works pretty well.

8. So head over to the [marketplace](https://marketplace.visualstudio.com/items?itemName=ms.feed) and install the Package Management extention.
9. Head over to VSTS and open the Package hub, add a new Feed (or use an existing one, if you have one)

![](/img/posts/2016/vsts-new-feed.png)

10. Choose `NuGet 2.x or Visual Studio earlier versions`. Copy your feed endpoint.
11. Edit the parameters in the `buildpackages.bat` file: `notepad buildpackages.bat`
    1. Adjust the DevExpress Version (in my case 15.2)
    2. Adjust the `NugetServer` variable: `set NugetServer=-NugetSource https://xxx.pkgs.visualstudio.com/DefaultCollection/_packaging/DevExpress/nuget/v2`
    3. Adjust the `NugetApiKey` variable: `set NugetApiKey=-NugetApiKey VSTS` (Currently there is no special Api-Key support in preview)  
    4. Adjust the `NugetPush` variable: `set NugetPush=-NugetPush`
    
Your `buildpackages.bat` file now should look like this:

```cmd
set DXVersion=15.2
set SymbolsFolder=c:\tmp\symbols
set TargetNugetFolder=C:\tmp\Nuget
set Localization=de;es;ja;ru
REM set NugetServer=
set NugetServer=-NugetSource https://xxx.pkgs.visualstudio.com/DefaultCollection/_packaging/DevExpress/nuget/v2
REM set NugetApiKey=
set NugetApiKey=-NugetApiKey VSTS
REM set NugetPush=
set NugetPush=-NugetPush


Powershell.exe -executionpolicy remotesigned -File  build.ps1

set Builder=src\DXNugetPackageBuilder\bin\Debug\DXNugetPackageBuilder.exe

%Builder% "C:\Program Files (x86)\DevExpress %DXVersion%\DevExpressCodedUIExtensions\Tools" %SymbolsFolder% %TargetNugetFolder% %Localization% %NugetServer% %NugetApiKey% %NugetPush%

%Builder% "C:\Program Files (x86)\DevExpress %DXVersion%\Components\Tools\eXpressAppFramework\Model Editor" %SymbolsFolder% %TargetNugetFolder% %Localization% %NugetServer% %NugetApiKey% %NugetPush%

%Builder% "C:\Program Files (x86)\DevExpress %DXVersion%\Components\Bin\Framework" %SymbolsFolder% %TargetNugetFolder% %Localization% %NugetServer% %NugetApiKey% %NugetPush%
```

13. If you don't have an [Personal Access](//www.visualstudio.com/en-us/news/2015/2015-jul-7-vso) token yet, create one.
14. For VSTS we need to add a source, username and password to authentificate
```cmd
nuget sources add -Name https://xxx.pkgs.visualstudio.com/DefaultCollection/_packaging/DevExpress/nuget/v2 -Source https://xxx.pkgs.visualstudio.com/DefaultCollection/_packaging/DevExpress/nuget/v2 -Username we@awesome.com -Password yourPersonalAccessToken
nuget setapikey VSTS -Source https://xxx.pkgs.visualstudio.com/DefaultCollection/_packaging/DevExpress/nuget/v2
```
12. Run `buildpackages.bat`.

Thats it for creating and uploading the packages to VSTS and should look like this:

![](/img/posts/2016/vsts-packages-upload.png)