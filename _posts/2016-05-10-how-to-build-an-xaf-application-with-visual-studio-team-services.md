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

 
 