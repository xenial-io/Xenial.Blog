---
 layout: post
 title: XAF best practices 2017-02
 comments: true
---

In the last post I described how i like to layout `Modules` and the `csproj` file. Today i like to go on with editors.
For this post i will implement a custom `LabelEdit` that will represent a caption that can be changed in code. So i will highlight how to implement an editor and the business objects.

## BusinessObjects

Before i start with implementing the `Editor` i will start with the basics of `PersistentObjects`.
I mostly used `XPO` so far, so i will focus on them first. In a later blog post I try to cover some of the EntityFramework basics.

So first of all I like to provide common base classes for XPO in a own Module. In my case i will implement them in an assembly called `Scissors.Xpo` similar to `DevExpress.Xpo`. But if you don't want to write your very own base library you can implement this in a Common Library called `YourCompany.Persistent.Base`. This should only hold base classes used by every `BusinessModule` of your Application.

So have a look at the `Scissors.Xpo.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net462</TargetFramework>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="DevExpress.Xpo" Version="17.2.*" />
  </ItemGroup>

</Project>
```

As you can see the only dependency is `DevExpress.Xpo` so thats perfect. We don't deal with XAF-Stuff so far.

As the documentation suggests, you should use your own base class based on `XPBaseObject`.

```cs
using System;
using System.Linq;
using System.Runtime.CompilerServices;
using DevExpress.Xpo;

namespace Scissors.Xpo.Persistent
{
    [NonPersistent]
    public abstract class ScissorsBaseObject : XPBaseObject
    {
        protected ScissorsBaseObject(Session session) : base(session) { }

        protected new object GetPropertyValue([CallerMemberName]string propertyName = null)
            => base.GetPropertyValue(propertyName);

        protected new T GetPropertyValue<T>([CallerMemberName]string propertyName = null)
            => base.GetPropertyValue<T>(propertyName);

        protected bool SetPropertyValue<T>(ref T propertyValueHolder, T newValue, [CallerMemberName]string propertyName = null)
            => base.SetPropertyValue<T>(propertyName, ref propertyValueHolder, newValue);

        protected new XPCollection GetCollection([CallerMemberName] string propertyName = null)
            => base.GetCollection(propertyName);

        protected new XPCollection<T> GetCollection<T>([CallerMemberName] string propertyName = null)
            where T : class => base.GetCollection<T>(propertyName);

        protected new T GetDelayedPropertyValue<T>([CallerMemberName] string propertyName = null)
            => base.GetDelayedPropertyValue<T>(propertyName);

        protected bool SetDelayedPropertyValue<T>(T value, [CallerMemberName] string propertyName = null)
            => base.SetDelayedPropertyValue(propertyName, value);

        protected new object EvaluateAlias([CallerMemberName] string propertyName = null)
            => base.EvaluateAlias(propertyName);
    }
}
```

As you can see, we override a lot of methods basically to use the `CallerMemberNameAttribute` to let the compiler do the work for inserting the `MemberNames` to get correct change tracking.

The next two base classes are for using an `int` and a `Guid` as primary keys:

```cs
using System;
using System.Linq;
using DevExpress.Xpo;

namespace Scissors.Xpo.Persistent
{
    [NonPersistent]
    public abstract class ScissorsBaseObjectOid : ScissorsBaseObject
    {
        protected ScissorsBaseObjectOid(Session session) : base(session) { }

        [Key(AutoGenerate = true)]
        [Persistent(nameof(Oid))]
        private int _Oid = -1;
        [PersistentAlias(nameof(_Oid))]
        public int Oid => _Oid;
    }
}
```

As you can see, we can reduce the code by the simplified syntax and `nameof` drastically (eg. look mum no strings!).
This code is [highly recommended](https://documentation.devexpress.com/CoreLibraries/DevExpress.Xpo.KeyAttribute.class) cause the key should never be changed by an end user.

The same is true for the `Guid` implementation.

```cs
using System;
using System.Linq;
using DevExpress.Xpo;

namespace Scissors.Xpo.Persistent
{
    [NonPersistent]
    public abstract class ScissorsBaseObjectGuid : ScissorsBaseObject
    {
        protected ScissorsBaseObjectGuid(Session session) : base(session) { }

        [Key(AutoGenerate = true)]
        [Persistent(nameof(Oid))]
        private Guid _Oid = default;
        [PersistentAlias(nameof(_Oid))]
        public Guid Oid => _Oid;
    }
}
```

Next i implement an `BusinessObject` based on the `ScissorsBaseObjectOid` class. This should be fairly simple, but there is a catch. I like to keep my `BusinessObjects` in a different assembly. Normally a `BusinessModule` consists of 3 assemblies:

- `YourCompany.ExpressApp.Module`
- `YourCompany.ExpressApp.Module.Win`
- `YourCompany.ExpressApp.Module.Web`

Based on domain driven design (DDD) i really hat this approach, cause it leads to a massive `god modules`. They become harder and harder to maintain.
So i like a more modular approach.

First of all: the `ExpressApp` in the `namespace` can lead to very weird conflicts when developing the application. So i like to use a more general name for it. So we go for `Modules`. Another thing i like to add is 2 secondary assemblies. One for the `BusinessObjects` and one for the `Contracts`.
In my case i will implement this in my `Scissors.FeatureCenter` project. So my assemblies will look like this:

- `Scissors.FeatureCenter.Modules.LabelEditorDemos.Contracts`
- `Scissors.FeatureCenter.Modules.LabelEditorDemos.BusinessObjects`
- `Scissors.FeatureCenter.Modules.LabelEditorDemos`
- `Scissors.FeatureCenter.Modules.LabelEditorDemos.Win`

I omitted the `Web` assembly, cause at this moment i have no plans to add a Web implementation so far.
The purpose of the contracts assembly is to deal with inter module communication. This assembly should provide all public contracts that an business module can offer.

but lets start with the `Scissors.FeatureCenter.Modules.LabelEditorDemos.BusinessObjects` project.

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net462</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\..\..\..\..\src\Scissors.Xpo\Scissors.Xpo.csproj" />
  </ItemGroup>
</Project>
```

Adding the model is a piece of cake:

```cs
using System;
using System.Linq;
using DevExpress.Xpo;
using Scissors.Xpo.Persistent;

namespace Scissors.FeatureCenter.Modules.LabelEditorDemos.BusinessObjects
{
    [Persistent]
    public class LabelDemoModel : ScissorsBaseObjectOid
    {
        public LabelDemoModel(Session session) : base(session) { }

        string _Text;
        [Persistent]
        public string Text
        {
            get => _Text;
            set => SetPropertyValue(ref _Text, value);
        }
    }
}
```

As you can se we have no strings floating around. One thing that you can argue about is the name of the name of the persistent table and column. You can fix them to avoid later problems with refactoring. I will highly recommend this if you are porting a legacy database. You also can introduce a guard when starting the application if you forget to add the `PersistentAttribute` with an explicit name.

Next step is to provide a convenient list of types this module exports. Lets call the list `LabelEditorDemosBusinessObjects`:

```cs
using System;
using System.Linq;

namespace Scissors.FeatureCenter.Modules.LabelEditorDemos.BusinessObjects
{
    public static class LabelEditorDemosBusinessObjects
    {
        public static readonly Type[] Types = new[]
        {
            typeof(LabelDemoModel)
        };
    }
}
```

Next lets add the platform independent module.

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net462</TargetFramework>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\..\..\..\..\src\Scissors.ExpressApp\Scissors.ExpressApp.csproj" />
    <ProjectReference Include="..\BusinessObjects\Scissors.FeatureCenter.Modules.LabelEditorDemos.BusinessObjects.csproj" />
  </ItemGroup>

</Project>
```

and the module:

```cs
using System;
using System.Collections.Generic;
using Scissors.ExpressApp;
using Scissors.FeatureCenter.Modules.LabelEditorDemos.BusinessObjects;

namespace Scissors.FeatureCenter.Modules.LabelEditorDemos
{
    public sealed class LabelEditorDemosFeatureCenterModule : ScissorsBaseModule
    {
        protected override IEnumerable<Type> GetDeclaredExportedTypes()
            => LabelEditorDemosBusinessObjects.Types;
    }
}
```

The next step is to add the Winforms module:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net462</TargetFramework>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="DevExpress.ExpressApp.Win" Version="17.2.*" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\..\..\..\..\src\Scissors.ExpressApp.Win\Scissors.ExpressApp.Win.csproj" />
    <ProjectReference Include="..\Common\Scissors.FeatureCenter.Modules.LabelEditorDemos.csproj" />
  </ItemGroup>

</Project>
```

And the `WindowsFormsModule`:

```cs
using System;
using DevExpress.ExpressApp;
using Scissors.ExpressApp;
using Scissors.ExpressApp.Win;

namespace Scissors.FeatureCenter.Modules.LabelEditorDemos
{
    public sealed class LabelEditorDemosFeatureCenterWindowsFormsModule : ScissorsBaseModuleWin
    {
        protected override ModuleTypeList GetRequiredModuleTypesCore()
            => base.GetRequiredModuleTypesCore()
                .AndModuleTypes(typeof(LabelEditorDemosFeatureCenterModule));
    }
}
```

## Editors

So enough basics. Let's get the editor running. We start again with a new module, cause i really like the idea of small, reusable modules. Especially for editors. Often they start small, but over time so much configuration and other functionality accumulates, so i put them always in separate modules/assemblies.

`Scissors.ExpressApp.LabelEditor.Win.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <Import Project="..\..\..\..\.global\Global.csproj" />
  <PropertyGroup>
    <TargetFramework>net462</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="DevExpress.ExpressApp.Win" Version="17.2.*" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\..\Scissors.ExpressApp.Win\Scissors.ExpressApp.Win.csproj" />
    <ProjectReference Include="..\..\..\Scissors.ExpressApp\Scissors.ExpressApp.csproj" />
    <ProjectReference Include="..\Contracts\Scissors.ExpressApp.LabelEditor.Contracts.csproj" />
  </ItemGroup>
  <ItemGroup>
    <Reference Include="System.Windows.Forms" />
  </ItemGroup>
</Project>
```

`Scissors.ExpressApp.LabelEditor.Win.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <Import Project="..\..\..\..\.global\Global.csproj" />
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
  </PropertyGroup>
</Project>
```

So let's implement the `PropertyEditor`. The goal is to use the `LabelControl` out of the `DevExpress.XtraEditors` assembly. We want to have HTML formatting and word wrapping enabled, so we can display some information to the user.

First of all we need to derive our `PropertyEditor` from `DevExpress.ExpressApp.Win.Editors.WinPropertyEditor` cause the `LabelControl` is not derived from `BaseEdit`.

```cs
using System;
using System.Linq;
using DevExpress.ExpressApp.Model;
using DevExpress.ExpressApp.Win.Editors;
using DevExpress.Utils;
using DevExpress.XtraEditors;

namespace Scissors.ExpressApp.LabelEditor.Win.Editors
{
    public class LabelStringPropertyEditor : WinPropertyEditor
    {
        public LabelStringPropertyEditor(Type objectType, IModelMemberViewItem model)
            : base(objectType, model)
                => ControlBindingProperty = nameof(Control.Text);

        protected override object CreateControlCore()
        {
            var control = new LabelControl
            {
                AllowHtmlString = true,
            };

            control.Appearance.TextOptions.WordWrap = WordWrap.Wrap;

            return control;
        }

        public new LabelControl Control => (LabelControl)base.Control;
    }
}
```

There are 4 points of interest here:

1. We use the `nameof()` keyword to bind the `PropertyValue` to the `Text` property of the `LabelControl`
2. We override the new `Control` property using the `new` keyword to provide a better developer experience when the editor is used programmatically (for example from a `ViewController`)
3. We made sure the `constructor` is `public`. (I've been more than once fooled by this one)
4. We don't use an `Attribute` to register the `PropertyEditor`.

Next we should have a look at the module:

```cs
using System;
using System.Linq;
using DevExpress.ExpressApp.Editors;
using Scissors.ExpressApp.Win;
using Scissors.ExpressApp.LabelEditor.Win.Editors;

namespace Scissors.ExpressApp.LabelEditor.Win
{
    public class LabelEditorWindowsFormsModule : ScissorsBaseModuleWin
    {
        protected override void RegisterEditorDescriptors(EditorDescriptorsFactory editorDescriptorsFactory)
            => editorDescriptorsFactory.RegisterLabelStringPropertyEditor();
    }
}
```

As you can see, there is not much going on, deriving from `ScissorsBaseModuleWin` and register the `PropertyEditor`. I like to delegate the registration to an extension method, so the Module does not get to bloated, and it's clear to see what is going on. So have a look at the `LabelStringEditorDescriptorsFactoryExtentions`. I know it's quite a verbose name, but on the other hand it's clear to everybody on the team what this class is supposed to do.

```cs
using System;
using System.Linq;
using DevExpress.ExpressApp.Editors;
using Scissors.ExpressApp.LabelEditor.Contracts;

namespace Scissors.ExpressApp.LabelEditor.Win.Editors
{
    public static class LabelStringEditorDescriptorsFactoryExtentions
    {
        static LabelStringEditorDescriptorsFactoryExtentions()
            => EditorAliasesLabelEditor.Types.LabelStringEditor = typeof(LabelStringPropertyEditor);

        public static EditorDescriptorsFactory RegisterLabelStringPropertyEditor(this EditorDescriptorsFactory editorDescriptorsFactory)
        {
            //register the alias
            editorDescriptorsFactory.RegisterPropertyEditorAlias(
                EditorAliasesLabelEditor.LabelStringEditor,
                typeof(string),
                true);

            //register the editor
            editorDescriptorsFactory
                .RegisterPropertyEditor(EditorAliasesLabelEditor.LabelStringEditor,
                typeof(string),
                EditorAliasesLabelEditor.Types.LabelStringEditor,
                false);

            return editorDescriptorsFactory;
        }
    }
}
```

There is a lot going on here, but it's not that complicated. We need to have a look at the `EditorAliasesLabelEditor` class first:

```cs
using System;

namespace Scissors.ExpressApp.LabelEditor.Contracts
{
    public static class EditorAliasesLabelEditor
    {
        public static readonly string LabelStringEditor = Consts.LabelStringEditor;

        public static class Consts
        {
            public const string LabelStringEditor = nameof(LabelStringEditor);
        }

        public static class Types
        {
            public static Type LabelStringEditor { get; set; }
        }
    }
}
```

1. The `EditorAliasesLabelEditor` class is defined in the `Scissors.ExpressApp.LabelEditor.Contracts` assembly, so we avoid strong coupling.
2. So first of all the `EditorAlias` is defined in the `EditorAliasesLabelEditor.Consts.LabelStringEditor` constant. It's value is `LabelStringEditor`. The reason we define a separate constant is if we need to access the string from an attribute.
3. The `EditorAliasesLabelEditor.LabelStringEditor` `readonly` string is for ease access.
4. The `EditorAliasesLabelEditor.Types.LabelStringEditor` property is to avoid coupling, and could be probably be made internal with the `InternalsVisibleToAttribute` but I think this is more harmful than good.

So in the static constructor of the `LabelStringEditorDescriptorsFactoryExtentions` we register the type of the editor. The other 2 parts are easy. Register the `EditorAlias` to the type string and make it the default alias. Then register the editor with the alias to the string type and make sure it's not registered as the default editor for the type string.

## Try it out

So first of all we need to update the `LabelEditorDemosFeatureCenterWindowsFormsModule` module to reference the `LabelEditorWindowsFormsModule`. But wait? Will this raise coupling? Yes it does. I'll address this problem is a later blog post.

```cs
using System;
using DevExpress.ExpressApp;
using Scissors.ExpressApp;
using Scissors.ExpressApp.LabelEditor.Win;
using Scissors.ExpressApp.Win;

namespace Scissors.FeatureCenter.Modules.LabelEditorDemos
{
    public sealed class LabelEditorDemosFeatureCenterWindowsFormsModule : ScissorsBaseModuleWin
    {
        protected override ModuleTypeList GetRequiredModuleTypesCore()
            => base.GetRequiredModuleTypesCore()
                .AndModuleTypes(
                    typeof(LabelEditorDemosFeatureCenterModule),
                    typeof(LabelEditorWindowsFormsModule));
    }
}
```

Reference this in our 'application module'. I'll call it `FeatureCenter`.

```cs
using System;
using System.Linq;
using DevExpress.ExpressApp;
using Scissors.ExpressApp;
using Scissors.ExpressApp.Win;
using Scissors.FeatureCenter.Modules.LabelEditorDemos;

namespace Scissors.FeatureCenter.Module.Win
{
    public sealed class FeatureCenterWindowsFormsModule : ScissorsBaseModuleWin
    {
        protected override ModuleTypeList GetRequiredModuleTypesCore()
            => base.GetRequiredModuleTypesCore()
                .AndModuleTypes(
                    typeof(FeatureCenterModule),
                    typeof(LabelEditorDemosFeatureCenterWindowsFormsModule)
                );
    }
}
```

And last but not least use the power of `xafml` to use the editor (we will address `xafml` at a later point):

`Model.xafml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<Application Logo="ExpressAppLogo">
  <BOModel>
    <Class Name="Scissors.FeatureCenter.Modules.LabelEditorDemos.BusinessObjects.LabelDemoModel">
      <OwnMembers>
        <Member Name="Text" PropertyEditorType="Scissors.ExpressApp.LabelEditor.Win.Editors.LabelStringPropertyEditor" />
      </OwnMembers>
    </Class>
  </BOModel>
  <NavigationItems>
    <Items>
      <Item Id="LabelDemoModel_ListView" ViewId="LabelDemoModel_ListView" IsNewNode="True" />
    </Items>
  </NavigationItems>
  <Options Skin="Office 2016 Colorful" UIType="TabbedMDI" FormStyle="Ribbon">
    <RibbonOptions RibbonControlStyle="Office2013" />
  </Options>
  <SchemaModules>
    <SchemaModule Name="SystemModule" Version="17.2.4.0" IsNewNode="True" />
    <SchemaModule Name="SystemWindowsFormsModule" Version="17.2.4.0" IsNewNode="True" />
  </SchemaModules>
</Application>
```

I modified the `LabelDemoModel` class so we can test it out:

```cs
using System;
using System.Linq;
using DevExpress.Xpo;
using Scissors.Xpo.Persistent;

namespace Scissors.FeatureCenter.Modules.LabelEditorDemos.BusinessObjects
{
    [Persistent]
    public class LabelDemoModel : ScissorsBaseObjectOid
    {
        public LabelDemoModel(Session session) : base(session) { }

        string _Text;
        [Persistent]
        public string Text
        {
            get => _Text;
            set => SetPropertyValue(ref _Text, value);
        }

        string _Html;
        public string Html
        {
            get => _Html;
            set
            {
                if(SetPropertyValue(ref _Html , value))
                {
                    Text = _Html;
                }
            }
        }
    }
}
```

So lets have a look!

![Demo of the LabelEditor](/img/posts/2018/2018-02-21_LabelEditorDemo.png)