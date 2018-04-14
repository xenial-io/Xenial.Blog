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

1.  `.NET descktop development`
2.  `Universal Windows Platform development`

![Adding the packaging project](/img/posts/2018/2018-04-09-packaging-project-install-visualstudio.png)

So let's follow the [instructions](//docs.microsoft.com/en-us/windows/uwp/porting/desktop-to-uwp-packaging-dot-net):

1.  In Visual Studio, open the solution that contains your desktop application project.
2.  Add a Windows Application Packaging Project project to your solution.

> You won't have to add any code to it. It's just there to generate a package for you. We'll refer to this project as the "packaging project".

![Adding the packaging project](/img/posts/2018/2018-04-09-packaging-project.png)

3.  Set the Target Version of this project to any version that you want, but make sure to set the Minimum Version to Windows 10 Anniversary Update.
4.  In the packaging project, right-click the Applications folder, and then choose Add Reference.

![Adding the reference to the packaging project](/img/posts/2018/2018-04-09-packaging-project-add-reference.png)

So the first steps are done! Next we have to do some work in the `Package.appxmanifest` file.

5.  Set the Display-Name: `Scissors.FeatureCenter.Win`. Thats what our app is called in Windows.

![Packaging project: manifest-application-tab](/img/posts/2018/2018-04-09-packaging-project-manifest-application.png)

6.  Use the `Visual Asset Generator` to generate tiles and icons for the app. Use at least 400x400 pixels to generate, and use an png image with a transparent background

![Packaging project: manifest-visual-assets-tab](/img/posts/2018/2018-04-09-packaging-project-manifest-visual-assets.png)

7.  Make sure the `capabilities` are set to `Internet (Client)`

![Packaging project: manifest-capabilities-tab](/img/posts/2018/2018-04-09-packaging-project-manifest-capabilities.png)

8.  Set the `Packaging` information to something unique and useful.

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

Cause I want the sample to be runnable as a _normal WinForms application_ as well as a _WindowsStore app_ I'll add another project called `Scissors.FeatureCenter.Win10` and cause i don't want to duplicate to much code i add a new project called `Scissors.FeatureCenter.Win.Shared`

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

Next we need to add a constant to the Win10 and Win project respectivly:

`Scissors.FeatureCenter.Win10.csproj`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="15.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <Import Project="$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props" Condition="Exists('$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props')" />
.
.
.
  <PropertyGroup>
    <LangVersion>latest</LangVersion>
    <DefineConstants>WIN10</DefineConstants>
  </PropertyGroup>
.
.
.
</Project>
```

`Scissors.FeatureCenter.Win.csproj`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="15.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <Import Project="$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props" Condition="Exists('$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props')" />
.
.
.
  <PropertyGroup>
    <LangVersion>latest</LangVersion>
    <DefineConstants>WIN</DefineConstants>
  </PropertyGroup>
.
.
.
</Project>
```

The `LangVersion` is optional, but i try to keep both projects on the same C# compiler.

The next step is to use other [API's](//docs.microsoft.com/en-us/windows/uwp/porting/desktop-to-uwp-enhance) for the Win10 projects to specify the paths. For this we add a reference to the Windows.winmd which is located under `C:\Program Files (x86)\Windows Kits\10\UnionMetadata\Facade\Windows.WinMD`. So Add a reference, switch to browse, select all files and locate it:

![Find Windows.winmd](/img/posts/2018/2018-04-09-packaging-project-find-winmd.png)

![Add reference to Windows.winmd](/img/posts/2018/2018-04-09-packaging-project-win-md-reference.png)

Then I suddenly got stuck. Hm in my last test this was working, but now I get this error:

![Error with cycle dependencies](/img/posts/2018/2018-04-09-packaging-project-error.png)

So I found out that I needed to follow the instructions right, install the [Anniversary SDK](//developer.microsoft.com/en-us/windows/downloads/sdk-archive)  (minumum target SDK) [Windows 10 SDK (ver. 10.0.14393.795)](//go.microsoft.com/fwlink/p/?LinkId=838916) and add the following assemblies:

On all `*.winmd` files I made sure so set the `copy local` option to false.

![Added missing references](/img/posts/2018/2018-04-09-packaging-project-win-missing-references.png)

I build an ran the `Scissors.FeatureCenter.Package`, aaaand it worked! :)

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

> It's possible that you need to add the developer certificate to your machine (with the Add-AppDevPackage.ps1 powershell script).  
> If you got a real developer account this isn't necessary.


### Prebuilding the ModelAssembly and cache files

Once we have a `Shared` project in place we can build a additional command line program that sets up our WinApplication and builds the caches and ModelAssembly.dll's we could later pack into our project directory.

