---
 layout: post 
 title: Nuget Packages for DevExpress Components
 comments: true
---
For many years [Nuget](//nuget.org) is the defacto [standard](//www.hanselman.com/blog/NuGetForTheEnterpriseNuGetInAContinuousIntegrationAutomatedBuildSystem.aspx) for the dotnet ecosystem. It's [easy](//www.hanselman.com/blog/CreatingANuGetPackageIn7EasyStepsPlusUsingNuGetToIntegrateASPNETMVC3IntoExistingWebFormsApplications.aspx) and powerfull.

Many vendors provide their components via nuget, however, at the time writing this post, [DevExpress](//devexpress.com) does (for whatever reason) not.

<!-- more -->

After reading the [support forums](//www.devexpress.com/support/center) i found several entries: (including one of my own)

- [S139898 - NuGet Packages](//www.devexpress.com/support/center/Question/Details/S139898)
- [Q479632 - NuGet packages: could i create my own package and publish it legally ???](//www.devexpress.com/Support/Center/Question/Details/Q479632)
- [Q458075 - Please provide NuGet packages](//www.devexpress.com/Support/Center/Question/Details/Q458075)

They provide packages for [DevExtreme](//www.nuget.org/packages?q=DevExtreme+) but not for their .NET components.

A few years ago [CaioProiete](/github.com/CaioProiete) provided nuspec to build your own, but that requires a lot of manual work to ajust the specs when there is a new DevExpress version.

So i wrote a [tool](//github.com/biohazard999/DXNugetPackageBuilder/) that scans the assemblies, and builds packages for them.

## Usage

Install (and enter your licence information) for all the devexpress components you want to package (Universal, Coderush & CodedUI). 
Download the PDBs and extract them to `c:\tmp\symbols`

```cmd
git clone https://github.com/biohazard999/DXNugetPackageBuilder.git
cd DXNugetPackageBuilder
```
Adjust the settings in `buildPackages.bat` to reflect the major version of the DevExpress Components
Run `buildPackages.bat`

Voilà, you have your packages in `c:\tmp\nuget`:

![DX-Nuget-Packages in Windows Explorer](/img/posts/2016/2016-02-26-dx-nuget.png)

Hope this helps anybody out!

Greetings Manuel 