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

Adding the model is a peace of cake:

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

