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

1. `.NET desktop development`
2. `Universal Windows Platform development`

![Adding the packaging project](/img/posts/2018/2018-04-09-packaging-project-install-visualstudio.png)

So let's follow the [instructions](//docs.microsoft.com/en-us/windows/uwp/porting/desktop-to-uwp-packaging-dot-net):

3. In Visual Studio, open the solution that contains your desktop application project.
4. Add a Windows Application Packaging Project project to your solution.

> You won't have to add any code to it. It's just there to generate a package for you. I'll refer to this project as the "packaging project".

![Adding the packaging project](/img/posts/2018/2018-04-09-packaging-project.png)

5. Set the Target Version of this project to any version that you want, but make sure to set the Minimum Version to Windows 10 Anniversary Update.
6. In the packaging project, right-click the Applications folder, and then choose Add Reference.

![Adding the reference to the packaging project](/img/posts/2018/2018-04-09-packaging-project-add-reference.png)

So the first steps are done! Next we have to do some work in the `Package.appxmanifest` file.

7. Set the Display-Name: `Scissors.FeatureCenter.Win`. Thats what our app is called in Windows.

![Packaging project: manifest-application-tab](/img/posts/2018/2018-04-09-packaging-project-manifest-application.png)

8. Use the `Visual Asset Generator` to generate tiles and icons for the app. Use at least 400x400 pixels to generate, and use an png image with a transparent background

![Packaging project: manifest-visual-assets-tab](/img/posts/2018/2018-04-09-packaging-project-manifest-visual-assets.png)

> Use at least a 500x500 png file and hit generate. Thats to make the `Windows App Certification Kit` happy later on. But you can tweak all those thousands of images yourself (or pay a designer to do so) <!-- markdownlint-disable MD033 --><i class="far fa-smile"></i><!-- markdownlint-enable MD033 -->.

9. Make sure the `capabilities` are set to `Internet (Client)`

![Packaging project: manifest-capabilities-tab](/img/posts/2018/2018-04-09-packaging-project-manifest-capabilities.png)

10. Set the `Packaging` information to something unique and useful.

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

Cause I want the sample to be runnable as a _normal WinForms application_ as well as a _WindowsStore app_ I'll add another project called `Scissors.FeatureCenter.Win10` and cause i don't want to duplicate to much code i add a new [shared project](//docs.microsoft.com/en-us/xamarin/cross-platform/app-fundamentals/shared-projects?tabs=vswin) called `Scissors.FeatureCenter.Win.Shared`

![Packaging project: new project win10](/img/posts/2018/2018-04-09-packaging-project-new-project-win10.png)
![Packaging project: new project shared](/img/posts/2018/2018-04-09-packaging-project-new-project-shared.png)

Move all the stuff from `Scissors.FeatureCenter.Win` to the shared project and make a new reference to the shared one:

![Packaging project: move content from win to the new shared project](/img/posts/2018/2018-04-09-packaging-project-move-to-shared-win.png)
![Packaging project: add reference to the shared project from win](/img/posts/2018/2018-04-09-packaging-project-add-reference-to-shared-win.png)

Let's run. Okay the icon is missing. So go into the `Scissors.FeatureCenter.Win` `Properties` panel and change the icon location:

![Packaging project: add icon to the win manifest](/img/posts/2018/2018-04-09-packaging-project-add-icon-to-manifest-win.png)

Run again. Fine! Everything looks pretty damn good! But it takes almost 8 seconds to launch.

<!-- markdownlint-disable MD033 -->

<video class="video-js" controls preload="auto" width="auto" height="auto" poster="/img/posts/2018/2018-04-09-packaging-project-run-win.png" data-setup="{}">
  <source src="/img/posts/2018/2018-04-09-packaging-project-run-win.webm" type='video/webm'>
  <p class="vjs-no-js">
    To view this video please enable JavaScript, and consider upgrading to a web browser that
    <a href="http://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a>
  </p>
</video>
<!-- markdownlint-enable MD033 -->

So let's focus next on the `Scissors.FeatureCenter.Win10` project. We need to do the same modification with the manifest as in the normal Win project.

`Scissors.FeatureCenter.Win10.csproj`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="15.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <Import Project="$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props" Condition="Exists('$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props')" />
  <PropertyGroup>
    <Configuration Condition=" '$(Configuration)' == '' ">Debug</Configuration>
    <Platform Condition=" '$(Platform)' == '' ">AnyCPU</Platform>
    <ProjectGuid>{199C4A09-1369-4C80-A334-5A225FA8C780}</ProjectGuid>
    <OutputType>WinExe</OutputType>
    <RootNamespace>Scissors.FeatureCenter.Win10</RootNamespace>
    <AssemblyName>Scissors.FeatureCenter.Win10</AssemblyName>
    <TargetFrameworkVersion>v4.6.2</TargetFrameworkVersion>
    <FileAlignment>512</FileAlignment>
    <AutoGenerateBindingRedirects>true</AutoGenerateBindingRedirects>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>
  <PropertyGroup Condition=" '$(Configuration)|$(Platform)' == 'Debug|AnyCPU' ">
    <PlatformTarget>AnyCPU</PlatformTarget>
    <DebugSymbols>true</DebugSymbols>
    <DebugType>full</DebugType>
    <Optimize>false</Optimize>
    <OutputPath>bin\Debug\</OutputPath>
    <DefineConstants>DEBUG;TRACE</DefineConstants>
    <ErrorReport>prompt</ErrorReport>
    <WarningLevel>4</WarningLevel>
  </PropertyGroup>
  <PropertyGroup Condition=" '$(Configuration)|$(Platform)' == 'Release|AnyCPU' ">
    <PlatformTarget>AnyCPU</PlatformTarget>
    <DebugType>pdbonly</DebugType>
    <Optimize>false</Optimize>
    <OutputPath>bin\Release\</OutputPath>
    <DefineConstants>TRACE</DefineConstants>
    <ErrorReport>prompt</ErrorReport>
    <WarningLevel>4</WarningLevel>
  </PropertyGroup>
  <PropertyGroup>
    <ApplicationIcon>..\Scissors.FeatureCenter.Win.Shared\Scissors.ico</ApplicationIcon>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="System" />
    <Reference Include="System.Core" />
    <Reference Include="System.Xml.Linq" />
    <Reference Include="System.Data.DataSetExtensions" />
    <Reference Include="Microsoft.CSharp" />
    <Reference Include="System.Data" />
    <Reference Include="System.Deployment" />
    <Reference Include="System.Drawing" />
    <Reference Include="System.Net.Http" />
    <Reference Include="System.Windows.Forms" />
    <Reference Include="System.Xml" />
    <Reference Include="Windows">
      <HintPath>..\..\..\..\Program Files (x86)\Windows Kits\10\UnionMetadata\Facade\Windows.WinMD</HintPath>
    </Reference>
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\demos\FeatureCenter\src\Modules\LabelEditorDemos\BusinessObjects\Scissors.FeatureCenter.Modules.LabelEditorDemos.BusinessObjects.csproj">
      <Project>{1f9ce801-c633-4b28-a089-ac5536d1b047}</Project>
      <Name>Scissors.FeatureCenter.Modules.LabelEditorDemos.BusinessObjects</Name>
    </ProjectReference>
    <ProjectReference Include="..\demos\FeatureCenter\src\Modules\LabelEditorDemos\Common\Scissors.FeatureCenter.Modules.LabelEditorDemos.csproj">
      <Project>{fe0c4487-711a-4d8d-94e6-c3391eaeca3c}</Project>
      <Name>Scissors.FeatureCenter.Modules.LabelEditorDemos</Name>
    </ProjectReference>
    <ProjectReference Include="..\demos\FeatureCenter\src\Modules\LabelEditorDemos\Contracts\Scissors.FeatureCenter.Modules.LabelEditorDemos.Contracts.csproj">
      <Project>{d643979d-0e7c-416b-9251-3350314da37a}</Project>
      <Name>Scissors.FeatureCenter.Modules.LabelEditorDemos.Contracts</Name>
    </ProjectReference>
    <ProjectReference Include="..\demos\FeatureCenter\src\Modules\LabelEditorDemos\Win\Scissors.FeatureCenter.Modules.LabelEditorDemos.Win.csproj">
      <Project>{324ba4b1-0c4b-48fb-a33c-fb1554a7a744}</Project>
      <Name>Scissors.FeatureCenter.Modules.LabelEditorDemos.Win</Name>
    </ProjectReference>
    <ProjectReference Include="..\Scissors.FeatureCenter.Module.Win\Scissors.FeatureCenter.Module.Win.csproj">
      <Project>{7964F87D-BC5D-4C4E-8B2F-71E89739AA97}</Project>
      <Name>Scissors.FeatureCenter.Module.Win</Name>
    </ProjectReference>
    <ProjectReference Include="..\Scissors.FeatureCenter.Module\Scissors.FeatureCenter.Module.csproj">
      <Project>{5F15837D-D1E5-44DC-92F0-4F2EBE9C3F8D}</Project>
      <Name>Scissors.FeatureCenter.Module</Name>
    </ProjectReference>
    <ProjectReference Include="..\src\Modules\InlineEditForms\Win\Scissors.ExpressApp.InlineEditForms.Win.csproj">
      <Project>{230DACB5-9303-4196-86E3-65203D773D9B}</Project>
      <Name>Scissors.ExpressApp.InlineEditForms.Win</Name>
    </ProjectReference>
    <ProjectReference Include="..\src\Modules\LabelEditor\Contracts\Scissors.ExpressApp.LabelEditor.Contracts.csproj">
      <Project>{d707bf95-6819-475e-aaae-b89eb7be0a5e}</Project>
      <Name>Scissors.ExpressApp.LabelEditor.Contracts</Name>
    </ProjectReference>
    <ProjectReference Include="..\src\Modules\LabelEditor\Win\Scissors.ExpressApp.LabelEditor.Win.csproj">
      <Project>{2e3e1bd8-2eaf-49e1-9d61-17d5cc3a207b}</Project>
      <Name>Scissors.ExpressApp.LabelEditor.Win</Name>
    </ProjectReference>
    <ProjectReference Include="..\src\Scissors.ExpressApp.Win\Scissors.ExpressApp.Win.csproj">
      <Project>{dd958dad-2a51-4dc1-8472-ae925ac1c4a2}</Project>
      <Name>Scissors.ExpressApp.Win</Name>
    </ProjectReference>
    <ProjectReference Include="..\src\Scissors.ExpressApp\Scissors.ExpressApp.csproj">
      <Project>{2ce62ff7-23d7-4c81-99a6-19d8e5889668}</Project>
      <Name>Scissors.ExpressApp</Name>
    </ProjectReference>
  </ItemGroup>
  <ItemGroup>
    <Compile Include="Properties\AssemblyInfo.cs" />
    <EmbeddedResource Include="Properties\Resources.resx">
      <Generator>ResXFileCodeGenerator</Generator>
      <LastGenOutput>Resources.Designer.cs</LastGenOutput>
      <SubType>Designer</SubType>
    </EmbeddedResource>
    <Compile Include="Properties\Resources.Designer.cs">
      <AutoGen>True</AutoGen>
      <DependentUpon>Resources.resx</DependentUpon>
    </Compile>
    <None Include="Properties\Settings.settings">
      <Generator>SettingsSingleFileGenerator</Generator>
      <LastGenOutput>Settings.Designer.cs</LastGenOutput>
    </None>
    <Compile Include="Properties\Settings.Designer.cs">
      <AutoGen>True</AutoGen>
      <DependentUpon>Settings.settings</DependentUpon>
      <DesignTimeSharedInput>True</DesignTimeSharedInput>
    </Compile>
  </ItemGroup>
  <ItemGroup>
    <PackageReference Include="DevExpress.ExpressApp.Images" Version="17.2.7" />
    <PackageReference Include="DevExpress.ExpressApp.Validation.Win">
      <Version>17.2.7</Version>
    </PackageReference>
    <PackageReference Include="DevExpress.ExpressApp.Win" Version="17.2.7" />
    <PackageReference Include="DevExpress.ExpressApp.Xpo" Version="17.2.7" />
    <PackageReference Include="DevExpress.ExpressApp.Images" Version="17.2.7" />
    <PackageReference Include="DevExpress.XtraReports" Version="17.2.7" />
  </ItemGroup>
  <Import Project="..\Scissors.FeatureCenter.Win.Shared\Scissors.FeatureCenter.Win.Shared.projitems" Label="Shared" />
  <Import Project="$(MSBuildToolsPath)\Microsoft.CSharp.targets" />
</Project>
```

Now we need to remove the `Win` reference and replace it with the `Win10` one:

![Adding the win10 reference to the packaging project](/img/posts/2018/2018-04-09-packaging-project-add-reference-win10.png)

The next step is to use other [API's](//docs.microsoft.com/en-us/windows/uwp/porting/desktop-to-uwp-enhance) for the Win10 projects to specify the paths. For this we add a reference to the Windows.winmd which is located under `C:\Program Files (x86)\Windows Kits\10\UnionMetadata\Facade\Windows.WinMD`. So Add a reference, switch to browse, select all files and locate it:

![Find Windows.winmd](/img/posts/2018/2018-04-09-packaging-project-find-winmd.png)

![Add reference to Windows.winmd](/img/posts/2018/2018-04-09-packaging-project-win-md-reference.png)

Then I suddenly got stuck. Hm in my last test this was working, but now I get this error:

![Error with cycle dependencies](/img/posts/2018/2018-04-09-packaging-project-error.png)

So I found out that I needed to follow the instructions right, install the [Anniversary SDK](//developer.microsoft.com/en-us/windows/downloads/sdk-archive)  (minumum target SDK) [Windows 10 SDK (ver. 10.0.14393.795)](//go.microsoft.com/fwlink/p/?LinkId=838916) and add the following assemblies:

On all `*.winmd` files I made sure so set the `copy local` option to false.

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="15.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <Import Project="$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props" Condition="Exists('$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props')" />
.
.
.
  <ItemGroup>
     <Reference Include="System.Runtime.WindowsRuntime, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089, processorArchitecture=MSIL">
      <SpecificVersion>False</SpecificVersion>
      <HintPath>..\..\..\..\Program Files (x86)\Reference Assemblies\Microsoft\Framework\.NETCore\v4.5\System.Runtime.WindowsRuntime.dll</HintPath>
    </Reference>
    <Reference Include="System.Runtime.WindowsRuntime.UI.Xaml, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089, processorArchitecture=MSIL">
      <SpecificVersion>False</SpecificVersion>
      <HintPath>..\..\..\..\Program Files (x86)\Reference Assemblies\Microsoft\Framework\.NETCore\v4.5\System.Runtime.WindowsRuntime.UI.Xaml.dll</HintPath>
    </Reference>
    <Reference Include="Windows, Version=255.255.255.255, Culture=neutral, processorArchitecture=MSIL">
      <SpecificVersion>False</SpecificVersion>
      <HintPath>..\..\..\..\Program Files (x86)\Windows Kits\10\UnionMetadata\Facade\Windows.WinMD</HintPath>
      <Private>False</Private>
    </Reference>
    <Reference Include="Windows.Foundation.FoundationContract">
      <HintPath>..\..\..\..\Program Files (x86)\Windows Kits\10\References\Windows.Foundation.FoundationContract\2.0.0.0\Windows.Foundation.FoundationContract.winmd</HintPath>
      <Private>False</Private>
    </Reference>
    <Reference Include="Windows.Foundation.UniversalApiContract">
      <HintPath>..\..\..\..\Program Files (x86)\Windows Kits\10\References\Windows.Foundation.UniversalApiContract\3.0.0.0\Windows.Foundation.UniversalApiContract.winmd</HintPath>
      <Private>False</Private>
    </Reference>
  </ItemGroup>
.
.
.
</Project>
```

![Added missing references](/img/posts/2018/2018-04-09-packaging-project-win-missing-references.png)

I build the project `Scissors.FeatureCenter.Package`, aaaand it worked! :)

So let's ajust some stuff so we get the thing running inside the package.

### Adjustments to the code

First of all let's change some namespaces so we can modify our target projects with ease:

Go to the properties pane of the shared project and adjust it to `Scissors.FeatureCenter.Win` (your win namespace).
![Shared project adjust namespace](/img/posts/2018/2018-04-09-packaging-project-shared-project-adjust-namespace.png)

> If you wonder where this is stored: It's in a seperate msbuild file called `Scissors.FeatureCenter.Win.Shared.projitems`.

Go to the Properties pane of the Win10 project and adjust It's default namespace as well to `Scissors.FeatureCenter.Win`.

![Win10 project adjust namespace](/img/posts/2018/2018-04-09-packaging-project-win10-project-adjust-namespace.png)

> In msbuild this property is called `RootNamespace` so you can add this if you like by hand `<RootNamespace>Scissors.FeatureCenter.Win</RootNamespace>`

Ready to rumble! The nature of Shared projects allow us to add code in our specific assemblies and just "extend" the classes. Think like all files in the Shared project are linked into the target project. That means we can use partial classes and methods to extend the shared project.

Add a partial class that matches your `WinApplication` and adjust the following paths:

`C:\F\git\Scissors.FeatureCenter\Scissors.FeatureCenter.Win10\FeatureCenterWindowsFormsApplication.cs`:

```cs
using System;
using System.IO;
using System.Linq;
using DevExpress.ExpressApp.Win;

namespace Scissors.FeatureCenter.Win
{
    public partial class FeatureCenterWindowsFormsApplication : WinApplication
    {
        protected override string GetDcAssemblyFilePath()
            => Path.Combine(Windows.Storage.ApplicationData.Current.LocalFolder.Path, ApplicationName, DcAssemblyFileName);

        protected override string GetModelAssemblyFilePath()
            => Path.Combine(Windows.Storage.ApplicationData.Current.LocalFolder.Path, ApplicationName, ModelAssemblyFileName);

        protected override string GetModelCacheFileLocationPath()
            => Path.Combine(Windows.Storage.ApplicationData.Current.LocalFolder.Path, ApplicationName);

        protected override string GetModulesVersionInfoFilePath()
           => Path.Combine(Windows.Storage.ApplicationData.Current.LocalFolder.Path, ApplicationName, ModulesVersionInfoFileName);

        protected override void OnCustomGetUserModelDifferencesPath(CustomGetUserModelDifferencesPathEventArgs args)
            => args.Path = Path.Combine(Windows.Storage.ApplicationData.Current.LocalFolder.Path, ApplicationName);
    }
}
```

This will tell XAF where to find or store all the files that are generated by XAF. Let's run with the debugger and look where it's placed the files:

`C:\Users\mgrun\AppData\Local\Packages\Scissors.FeatureCenter.Win_ncze720tdpmp2\LocalState\Scissors.FeatureCenter`

![Explorer with generated files](/img/posts/2018/2018-04-09-packaging-project-explorer-with-packed-files.png)

One is missing, the `Tracing.LocalUserAppDataPath`. So let's get into `Program.cs` and add a partial method:

`C:\F\git\Scissors.FeatureCenter\Scissors.FeatureCenter.Win.Shared\Program.cs`:

```cs
using System;
using System.Windows.Forms;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.Security;
using DevExpress.ExpressApp.Validation;
using DevExpress.ExpressApp.Validation.Win;
using DevExpress.ExpressApp.Xpo;
using Scissors.ExpressApp.InlineEditForms.Win;

namespace Scissors.FeatureCenter.Win
{
    static partial class Program
    {
        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

#if EASYTEST
            DevExpress.ExpressApp.Win.EasyTest.EasyTestRemotingRegistration.Register();
#endif

            EditModelPermission.AlwaysGranted = System.Diagnostics.Debugger.IsAttached;

            InitializeTracing();

            var winApplication = new FeatureCenterWindowsFormsApplication();

            InMemoryDataStoreProvider.Register();
            winApplication.ConnectionString = InMemoryDataStoreProvider.ConnectionString;

#if DEBUG
            if(System.Diagnostics.Debugger.IsAttached && winApplication.CheckCompatibilityType == CheckCompatibilityType.DatabaseSchema)
            {
                winApplication.DatabaseUpdateMode = DatabaseUpdateMode.UpdateDatabaseAlways;
            }
#endif
            try
            {
                winApplication.Modules.Add(new ValidationModule());
                winApplication.Modules.Add(new ValidationWindowsFormsModule());
                winApplication.Modules.Add(new InlineEditFormsWindowsFormsModule());
                winApplication.Setup();
                winApplication.Start();
            }
            catch(Exception e)
            {
                winApplication.HandleException(e);
            }
        }

        static partial void InitializeTracing();
    }
}
```

`C:\F\git\Scissors.FeatureCenter\Scissors.FeatureCenter.Win10\Program.cs`:

```cs
using System;
using System.IO;
using System.Linq;
using DevExpress.Persistent.Base;

namespace Scissors.FeatureCenter.Win
{
    static partial class Program
    {
        static partial void InitializeTracing()
        {
            Tracing.LogName = Path.Combine(Windows.Storage.ApplicationData.Current.LocalFolder.Path, FeatureCenterWindowsFormsApplication.APP_NAME, "logs", "eXpressAppFramework");

            if(!Directory.Exists(Path.GetDirectoryName(Tracing.LogName)))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(Tracing.LogName));
            }

            Tracing.Initialize();
        }
    }
}
```

Don't forget to adjust the one in the classic desktop winforms world.

`C:\F\git\Scissors.FeatureCenter\Scissors.FeatureCenter.Win\Program.cs`:

```cs
using System;
using System.IO;
using System.Linq;
using System.Windows.Forms;
using DevExpress.Persistent.Base;

namespace Scissors.FeatureCenter.Win
{
    static partial class Program
    {
        static partial void InitializeTracing()
        {
            Tracing.LogName = Path.Combine(Application.UserAppDataPath, FeatureCenterWindowsFormsApplication.APP_NAME, "logs", "eXpressAppFramework");

            if(!Directory.Exists(Path.GetDirectoryName(Tracing.LogName)))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(Tracing.LogName));
            }

            Tracing.Initialize();
        }
    }
}
```

Let's run again and look if we get a log file. Yeah!

![Log file of packaged project in explorer](/img/posts/2018/2018-04-09-packaging-project-log-in-explorer.png)

### Creating a Release Package and let the Windows App Certification Kit run

1. Switch to `Release` mode.
2. Rebuild the solution.
3. Select the `Package` project.
4. In the menu select `Project/Store/Create App Packages...`
5. Select no (we don't want to publish to the store yet)
6. Hit Create
7. The package get's created

![Package creation completed](/img/posts/2018/2018-04-09-packaging-project-package-completed.png)

Now let's launch the `Windows App Certification Kit`. This may take a while...

![Validation success](/img/posts/2018/2018-04-09-packaging-project-app-cert-success.png)

The [Validation Result](/downloads/posts/2018/build-win10-package-ValidationResult.htm) is succeeded!

Now we can install the package by double-clicking the package (make sure you actived the developer mode on your Windows 10 machine).

![Package in explorer ready for installation](/img/posts/2018/2018-04-09-packaging-project-for-test-in-explorer.png)

> It's possible that you need to add the developer certificate to your machine (with the `Add-AppDevPackage.ps1` powershell script).  
> If you got a real developer account this isn't necessary.

### Bonus-Part: Prebuilding the ModelAssembly and cache files

Once we have a `Shared` project in place we can build a additional command line program that sets up our WinApplication and builds the caches and ModelAssembly.dll's we could later pack into our project directory.

Add a `Console App` called `Scissors.FeatureCenter.Cli`.

![New Console App](/img/posts/2018/2018-04-09-packaging-project-console-app.png)

Add a reference to the `shared project` as for the other two projects:

![Add shared project to the CLI project](/img/posts/2018/2018-04-09-packaging-project-cli-project-add-shared-project.png)

Add a class called `CliProgram`:

```cs
using System;
using System.IO;
using System.Linq;
using DevExpress.ExpressApp.Validation;
using DevExpress.ExpressApp.Validation.Win;
using DevExpress.ExpressApp.Xpo;
using Scissors.ExpressApp.InlineEditForms.Win;

namespace Scissors.FeatureCenter.Win
{
    static class CliProgram
    {
        static int Main(string[] args)
        {
            Console.WriteLine("Generating caches");

            using(var winApplication = new FeatureCenterWindowsFormsApplication())
            {
                try
                {
                    if(Directory.Exists(winApplication.PreCompileOutputDirectory))
                    {
                        Directory.Delete(winApplication.PreCompileOutputDirectory, true);
                    }

                    Directory.CreateDirectory(winApplication.PreCompileOutputDirectory);

                    InMemoryDataStoreProvider.Register();
                    winApplication.ConnectionString = InMemoryDataStoreProvider.ConnectionString;
                    winApplication.SplashScreen = null;

                    winApplication.Modules.Add(new ValidationModule());
                    winApplication.Modules.Add(new ValidationWindowsFormsModule());
                    winApplication.Modules.Add(new InlineEditFormsWindowsFormsModule());
                    winApplication.Setup();

                }
                catch(Exception e)
                {
                    var color = Console.ForegroundColor;
                    try
                    {
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine("Error:");
                        Console.WriteLine(new string('=', Console.BufferWidth));
                        Console.WriteLine(e.ToString());
                        return 1;
                    }
                    finally
                    {
                        Console.ForegroundColor = color;
                    }
                }
                Console.WriteLine($"Caches created at '{winApplication.PreCompileOutputDirectory}'");
                Console.WriteLine("Caches completed");
                return 0;
            }
        }
    }
}
```

> Of course thats not that very [DRY](//en.wikipedia.org/wiki/Don%27t_repeat_yourself) (I'll get into this more in another [best practices](/tags/BestPractices/) post, for example with an `ApplicationBuilder`). But it will work for now.

We need to add another partial `FeatureCenterWindowsFormsApplication` class, so we can control the output of the files generated by XAF:

```cs
using System;
using System.IO;
using System.Linq;
using DevExpress.ExpressApp.Win;

namespace Scissors.FeatureCenter.Win
{
    public partial class FeatureCenterWindowsFormsApplication : WinApplication
    {
        public string PreCompileOutputDirectory => Path.Combine(Path.GetDirectoryName(GetType().Assembly.Location), "PreCompile");

        protected override string GetDcAssemblyFilePath()
            => Path.Combine(PreCompileOutputDirectory, DcAssemblyFileName);

        protected override string GetModelAssemblyFilePath()
            => Path.Combine(PreCompileOutputDirectory, ModelAssemblyFileName);

        protected override string GetModelCacheFileLocationPath()
            => PreCompileOutputDirectory;

        protected override string GetModulesVersionInfoFilePath()
           => Path.Combine(PreCompileOutputDirectory, ModulesVersionInfoFileName);
    }
}
```

Let's have a look:

![Precached assemblies and models in explorer](/img/posts/2018/2018-04-09-packaging-project-explorer-precached-files.png)

Awesome, now we need to package them into the Win10 (you also can do this in the *normal* full framework version) project:

Add all the precompiled assemblies as link into the Win10 project (Add existing item) and make sure you use the Release build:

![Add precompiled items as link](/img/posts/2018/2018-04-09-packaging-project-add-precompiled-items-as-link.png)

Make sure they are copied to the output directory by setting the `Copy if newer` flag, and mark them as `content`.

![Set the build action to copy if newer](/img/posts/2018/2018-04-09-packaging-project-added-items-copy.png)

Change the `FeatureCenterWindowsFormsApplication` in the `Win10` project as following:

```cs
using System;
using System.IO;
using System.Linq;
using DevExpress.ExpressApp.Win;

namespace Scissors.FeatureCenter.Win
{
    public partial class FeatureCenterWindowsFormsApplication : WinApplication
    {
#if DEBUG
        protected override string GetDcAssemblyFilePath()
            => Path.Combine(Windows.Storage.ApplicationData.Current.LocalFolder.Path, ApplicationName, DcAssemblyFileName);

        protected override string GetModelAssemblyFilePath()
            => Path.Combine(Windows.Storage.ApplicationData.Current.LocalFolder.Path, ApplicationName, ModelAssemblyFileName);

        protected override string GetModelCacheFileLocationPath()
            => Path.Combine(Windows.Storage.ApplicationData.Current.LocalFolder.Path, ApplicationName);

        protected override string GetModulesVersionInfoFilePath()
           => Path.Combine(Windows.Storage.ApplicationData.Current.LocalFolder.Path, ApplicationName, ModulesVersionInfoFileName);
#else
        string OutputDirectory => Path.GetDirectoryName(GetType().Assembly.Location);

        protected override string GetDcAssemblyFilePath()
            => Path.Combine(OutputDirectory, DcAssemblyFileName);

        protected override string GetModelAssemblyFilePath()
            => Path.Combine(OutputDirectory, ModelAssemblyFileName);

        protected override string GetModelCacheFileLocationPath()
            => OutputDirectory;

        protected override string GetModulesVersionInfoFilePath()
           => Path.Combine(OutputDirectory, ModulesVersionInfoFileName);
#endif
        protected override void OnCustomGetUserModelDifferencesPath(CustomGetUserModelDifferencesPathEventArgs args)
            => args.Path = Path.Combine(Windows.Storage.ApplicationData.Current.LocalFolder.Path, ApplicationName);
    }
}
```

So we tell XAF to look at the exe dir for the files. Of course you can change this for any location you like to put them.

Rebuild an run the package project without debugger:

<!-- markdownlint-disable MD033 -->

<video class="video-js" controls preload="auto" width="auto" height="auto" poster="/img/posts/2018/2018-04-09-packaging-project-run-win.png" data-setup="{}">
  <source src="/img/posts/2018/2018-04-09-packaging-project-run-precompiled.webm" type='video/webm'>
  <p class="vjs-no-js">
    To view this video please enable JavaScript, and consider upgrading to a web browser that
    <a href="http://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a>
  </p>
</video>
<!-- markdownlint-enable MD033 -->

> There is overhead from recording the video.  
> In reality it's like instant, you almost can't see the splash screen.

Holy moly! I never saw an XAF applcation start that quick!

Uff this was a long post. And it isn't production ready yet. But with the help of a little [bakery](/2018/03/31/baking-your-app-using-csharp-with-cake.html) I'll be able to put this thing into the Windows-Store!