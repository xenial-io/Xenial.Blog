---
 layout: post 
 title: "Performance and XAF-Bootstrapping"
 author: "René Grundner"
 tags: ["XAF", "Performance", "Bootstrapping"]
---
How to speed-up bootstrap time, it's all about reflection. Don't do it if you haven't.

## Look at your modules:


Here is an excerpt of our main module:

`ctor`:

```cs
public sealed partial class ModelDefinitionModule : ModuleBase, IUnityModule
{
    InitializeComponent();

    //snip..
}
```

`ModulesTypes`:

Important although its a .Net 1.1 List, but there you should expose everything you need.
Not exposing the modules will kick in refelection, what are trying not do do..

```cs
protected override ModuleTypeList GetRequiredModuleTypesCore()
{
    return new ModuleTypeList(
        typeof(DevExpress.ExpressApp.SystemModule.SystemModule),

    //snip..
}
```

next 

`GetDeclaredControllerTypes`:

```cs
protected override System.Collections.Generic.IEnumerable<System.Type> GetDeclaredControllerTypes()
{
    return new Type[] { };
}
```

not exposing any controllers would do fine.

Its faster to expose all controllers need.
But you should not expose IEnumerable via yield return.

## Why? ##

It maybe enumerated certain times. If you know the result, expose a collection (see LINQ for that)...

The similar yields for `GetModuleUpdaters` and `GetDeclaredExportedTypes`

Cave cat of all this optimization is that you have to declare everything, modules, controllers, business classes at compile time, you will not see any of them at run time, until you do this although.

Having all under control is a task of high responsibility.

Declaring your module this way will help you to reduce bootstrap time of your XAF-Appliction

You might be still struggling with boot strap performance, so look at your xptypesinfo-table (loading types no more available), your images (loading images non more available), and broken xafml (trying to load further things not more available...)

regards

René