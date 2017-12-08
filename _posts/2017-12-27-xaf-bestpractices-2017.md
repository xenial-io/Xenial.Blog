---
 layout: post 
 title: XAF best practices 2017
 comments: true
---

It's been a while since I blogged. The reason why I try to blog again was this [post](https://www.devexpress.com/Support/Center/Question/Details/T148978/how-to-measure-and-improve-the-application-s-performance#comment-22ceb33d-dc7c-439b-af68-fade58081a11) in the support forum. Especially about how I layout a XAF-Module in a real world scenario.

The most important thing i care about is code. I like to be explicit about code and discoverable things. So i don't like designer files and to much reflection magic.

This will be an ongoing series of posts, so stay tuned.

## Modules

No XAF-Application works without `Modules` so I'll think i start there.

XAF uses reflection to figure out a lot about your project, thats really cool to get started, but on the other hand it comes at a cost.
Performance and you need deep knowledge of the framework if something does not work as expected.

Basically there are a number questions we need ask ourself when we write a Module. What kind of module do we write? An editor Module (for example the [HTML Property Editor Module](https://documentation.devexpress.com/eXpressAppFramework/113140/Concepts/Extra-Modules/HTML-Property-Editor/HTML-Property-Editor-Module)) where there is only an editor? Or an fully fledged Module like the [State Machine Module](https://documentation.devexpress.com/eXpressAppFramework/113336/Concepts/Extra-Modules/State-Machine/State-Machine-Module) with BusinessObjects, Controllers, xafml, Editors, Services and all kind of code.

Normally i start with a module that starts something like this and add or remove code as i go along.

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.Editors;
using DevExpress.ExpressApp.SystemModule;
using DevExpress.ExpressApp.Updating;
using DevExpress.ExpressApp.Win.SystemModule;

namespace Scissors.ExpressApp.TokenEditor.Win
{
    public class TokenEditorWindowsFormsModule : ModuleBase
    {
        public TokenEditorWindowsFormsModule()
            => DiffsStore = new NullDiffsStore(GetType().Assembly);

        public override IEnumerable<ModuleUpdater> GetModuleUpdaters(IObjectSpace objectSpace, Version versionFromDB)
            => ModuleUpdater.EmptyModuleUpdaters;

        protected override IEnumerable<Type> GetDeclaredControllerTypes()
            => Type.EmptyTypes;

        protected override IEnumerable<Type> GetDeclaredExportedTypes()
            => Type.EmptyTypes;

        protected override IEnumerable<Type> GetRegularTypes()
            => Type.EmptyTypes;

        protected override ModuleTypeList GetRequiredModuleTypesCore()
            => new ModuleTypeList(
                typeof(SystemModule),
                typeof(SystemWindowsFormsModule)
            );

        protected override void RegisterEditorDescriptors(EditorDescriptorsFactory editorDescriptorsFactory)
        {
        }
    }
}
```

This *removes* all of the reflection magic that XAF is doing under cover.
As you know, i basically write code almost only for Winforms, so i will focus on Winforms for now.

This module doe's absolutely nothing. There is no `ApplicationModel`, no `Controllers`, no `ModelExtentions`.

As for dry code, i like this kind of module as a base class in a external assembly so i can reuse it later.

So let's to this.

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.Editors;
using DevExpress.ExpressApp.SystemModule;
using DevExpress.ExpressApp.Updating;
using Scissors.ExpressApp.Model.Core;

namespace Scissors.ExpressApp
{
    public abstract class ScissorsBaseModule : ModuleBase
    {
        public ScissorsBaseModule()
            => DiffsStore = new NullDiffsStore(GetType().Assembly);

        public override IEnumerable<ModuleUpdater> GetModuleUpdaters(IObjectSpace objectSpace, Version versionFromDB)
            => ModuleUpdater.EmptyModuleUpdaters;

        protected override IEnumerable<Type> GetDeclaredControllerTypes()
            => Type.EmptyTypes;

        protected override IEnumerable<Type> GetDeclaredExportedTypes()
            => Type.EmptyTypes;

        protected override IEnumerable<Type> GetRegularTypes()
            => Type.EmptyTypes;

        protected override ModuleTypeList GetRequiredModuleTypesCore()
            => new ModuleTypeList(
                typeof(SystemModule)
            );

        protected override void RegisterEditorDescriptors(EditorDescriptorsFactory editorDescriptorsFactory)
        {
        }
    }
}
```

If you wondered what's inside the `NullDiffsStore` class. It's simply a null implementation of the `ModelStoreBase` class.

```cs
using System;
using System.Linq;
using System.Reflection;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.Model.Core;

namespace Scissors.ExpressApp.Model.Core
{
    public class NullDiffsStore : ModelStoreBase
    {
        Assembly _Assembly;

        public NullDiffsStore(Assembly assembly)
            => _Assembly = assembly;
        
        public override string Name => $"{nameof(NullDiffsStore)} of the assembly '{_Assembly.FullName}'";

        public override void Load(ModelApplicationBase model)
        {
        }

        public override bool ReadOnly => true;
    }
}
```

So we need another base class for the Winforms stuff:

```cs
using System;
using System.Linq;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.Win.SystemModule;

namespace Scissors.ExpressApp.Win
{
    public abstract class ScissorsBaseModuleWin : ScissorsBaseModule
    {
        protected override ModuleTypeList GetRequiredModuleTypesCore()
            => base.GetRequiredModuleTypesCore()
                .AndModuleTypes(typeof(SystemWindowsFormsModule));
    }
}
```

As for the method `AndModuleTypes` on the `ModuleTypeList`: It's just a simple extention method to help keeping the code clean:

```cs 
using System;
using System.Linq;
using DevExpress.ExpressApp;

namespace Scissors.ExpressApp
{
    public static class ModuleBaseExtentions
    {
        public static ModuleTypeList AndModuleTypes(this ModuleTypeList moduleTypeList, params Type[] types)
        {
            moduleTypeList.AddRange(types);
            return moduleTypeList;            
        }
    }
}
```

So basically we are ready to consume our base classes to build a TokenEditorModule.

```cs
using System;
using System.Linq;
using Scissors.ExpressApp.Win;

namespace Scissors.ExpressApp.TokenEditor.Win
{
    public class TokenEditorWindowsFormsModule : ScissorsBaseModuleWin
    {
    }
}
```

That wraps it up for Modules so far, as i continue to develop more on the `TokenEditorWindowsFormsModule` you'll starting to see more code.


## The new csproj format

Thanks to the movement of .NET-Core we are getting a new csproj format thats much easier to handle (esp in source control) so lets have a look at the 3 Modules:

### Scissors.ExpressApp

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net462</TargetFramework>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="DevExpress.ExpressApp" Version="17.2.3" />
  </ItemGroup>

</Project>
```

### Scissors.ExpressApp.Win

```xml 
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net462</TargetFramework>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="DevExpress.ExpressApp.Win" Version="17.2.3" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Scissors.ExpressApp\Scissors.ExpressApp.csproj" />
  </ItemGroup>

</Project>
```

### Scissors.ExpressApp.TokenEditor.Win

```xml 
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net462</TargetFramework>
    <!--<AssemblySearchPaths>$(AssemblySearchPaths);{GAC}</AssemblySearchPaths>-->
  </PropertyGroup>
  <PropertyGroup>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="DevExpress.ExpressApp.Win" Version="17.2.3" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\..\Scissors.ExpressApp.Win\Scissors.ExpressApp.Win.csproj" />
    <ProjectReference Include="..\..\..\Scissors.ExpressApp\Scissors.ExpressApp.csproj" />
  </ItemGroup>
</Project>
```

There is almost no code! As you might have spotted, at the time of writing this post DevExpress didn't provide nugets for XAF, so i build this little [tool](https://github.com/biohazard999/DXNugetPackageBuilder) and used my last [blog post how to use VSTS to host them](http://blog.delegate.at/2016/05/10/how-to-build-an-xaf-application-with-visual-studio-team-services.html)
With the rise of netstandard2.0 i hope we'll able to see a shift to 