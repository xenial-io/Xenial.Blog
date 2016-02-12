---
 layout: post 
 title: "Introducing Para.FluentModelBuilder"
 comments: false
 tags: ["XAF", "XPO", "UnitTesting"]
 excerpt_separator: <!--more-->
---
I like to introduce a little Framework about mapping/decorating XPO/EntityFramework classes in XAF using the typesystem XAF provided without having to 'pollute' your model-assembly with DevExpress.ExpressApp assemblies:


[Para.FluentModelBuilder](https://github.com/biohazard999/Para.FluentModelBuilder)

In the readme.md you can explore what we've build so far :)

Happy coding, and hoping for feedback from the great XAF-Community
Greetz Manuel

<!--more-->

## Para.FluentModelBuilder

Fluent Model Builder for the DevExpress.ExpressApp Framework


## Don't like polution of your XPO/EntityFramework assembly with XAF Attributes? ##

We have a solution: 

Use flutent syntax to assign attributes to your existing XPO code.

Inspired by EntityFramework it can provide the metadata and attributes required by the XAF-Framework.


## But How? ##


Based on the [Fluent-Interface-Pattern](http://www.martinfowler.com/bliki/FluentInterface.html) it will cure the problem of dealing with String-Magic in Attributes for Criterias, PropertyNames and other ugly stuff in your ModelCode.


## Show me, Show me! ##

For our UnitTest Project we have this simple classes:

```cs
class TargetClass
{
    internal const string StringProperty_PropertyName = "StringProperty";

    internal const string StringProperty_Format = "{0:" + StringProperty_PropertyName + "}";

    internal string StringProperty { get; set; }

    internal DateTime DateTimeProperty { get; set; }

    internal DateTime? NullableDateTimeProperty { get; set; }

    internal ReferencedTargetClass OneToReferencedTarget { get; set; }
}

class ReferencedTargetClass
{
    public string Prop { get; set; }
}
```

Don't be afraid, that it is not a XPO/EF class, but it will be recognized by the excelent typesystem of XAF (`ITypesInfo`, `ITypeInfo`, `IMemberInfo`, ect.)

For XAF we can capsulate the mapping in a derived class called `XafBuilderManager`:

```cs
class TestXafModelBuilderManager : XafBuilderManager
{
    public TestXafModelBuilderManager(ITypesInfo typesInfo) : base(typesInfo)
    {
    }
    
    public override IEnumerable<IBuilder> BuildUpModel(ITypesInfo typesInfo)
    {
        yield return new TargetClassBuilder(typesInfo);

        var builder2 = ModelBuilder.Create<ReferencedTargetClass>(typesInfo);

        builder2.For(m => m.Prop)
            .HasCaption("Test");

        yield return builder2;
    }
}
```

As you can see here we have 2 options to map our classes: as a seperate class derived from `ModelBuilder<T>` called `TargetClassBuilder` in this example, or map all the stuff in this class, with the fluent interface.

```cs
class TargetClassBuilder : ModelBuilder<TargetClass>
{
    public TargetClassBuilder(ITypesInfo typesInfo) : base(typesInfo)
    {
    }

    public TargetClassBuilder(ITypeInfo typeInfo) : base(typeInfo)
    {
    }

    protected override void BuildUp()
    {
        HasCaption("Test");

        For(m => m.DateTimeProperty)
            .HasCaption("Date")
            .HasDisplayFormat("{0:dd.mm.yyyy")
            .IsImmediatePostData()
            .IsVisibleInDetailView()
            .IsNotVisibleInLookupListView()

        .UsingAppearance()
            .Targeting(m => m.StringProperty)
                .When(CriteriaOperator.Parse("DateTimeProperty == @Today()"))
                .IsNotEnabled()
                .HavingPriority(99);

        For(m => m.StringProperty)
            .AllowingDelete()
            .HasCaption("Bla");

        For(m => m.StringProperty)
            .UsingAppearance()
                .When("StringProperty == 'foo'")
                .TargetingAll()
                .ExceptingTarget(m => m.NullableDateTimeProperty);
    }
}
```

### How do i tell XAF to use this? ###

Basically everything is there from the XAF-Team. We have this little method in our Modules we can override called `CustomizeTypesInfo`. Everything we need to do is to let the magic begin and call our constructor:

```cs
public sealed partial class TestModule : ModuleBase
{
    public override void CustomizeTypesInfo(ITypesInfo typesInfo)
    {
        base.CustomizeTypesInfo(typesInfo);
        new TestXafModelBuilderManager(typesInfo);
    }
}
```

### Cool, but what about our own Attributes? ###

Thats a great question:

There are 2 possible solutions:

Use `ModelBuilder<T>.WithAttribute(Attribute attribute)` or `ModelBuilder<T>.WithAttribute<TAttribute>(Action<TAttribute> attributeOptions)`.

```cs
For(m => m.StringProperty)
    .WithAttribute(new YourProperty("whatever"));
```

Or:

Write a new Extention-Method that adds syntactic sugar to the whole thing (`ConditionalAppearance` is realized with this):

```cs
public static class ConditionalAppearancePropertyBuilder
{
    public static ConditionalAppearancePropertyBuilder<TProp, T> UsingAppearance<TProp, T>(this PropertyBuilder<TProp, T> builder, string shortId = "Visiblity")
    {
        var appearanceBuilder =  new ConditionalAppearancePropertyBuilder<TProp, T>(builder, shortId);

        (builder as IBuilderManager).AddBuilder(appearanceBuilder);

        return appearanceBuilder;
    }

}
```

Don't focus on to much detail here, this just returns a new `IBuilder` for `PropertyBuilder<TProp, T>.UsingAppearance`


The implementation it self is very simple, but needs to handle the DefaultValues of the AppearanceAttribute, so it needs to use state, to init the `_AppearanceItemTypeValue` and the `AppearanceContext` correctly

```cs
public class ConditionalAppearancePropertyBuilder<TProp, T> : IBuilder
{
    private readonly PropertyBuilder<TProp, T> _Builder;

    private string _AppearanceItemTypeValue;

    private string _Context;

    internal AppearanceAttribute _Attribute;

    public ConditionalAppearancePropertyBuilder(PropertyBuilder<TProp, T> builder, string shortId)
    {
        _Builder = builder;
        _Attribute = new AppearanceAttribute(typeof(T).FullName + "." + builder.MemberInfo.Name + "." + shortId);
        builder.WithAttribute(_Attribute);
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> UsingForeColor(Color color)
    {
        var converter = System.ComponentModel.TypeDescriptor.GetConverter(color);
        _Attribute.FontColor = converter.ConvertToString(color);
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> UsingBackColor(Color color)
    {
        var converter = System.ComponentModel.TypeDescriptor.GetConverter(color);
        _Attribute.BackColor = converter.ConvertToString(color);
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> UsingFontStyle(FontStyle style)
    {
        _Attribute.FontStyle = style;
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> HavingPriority(int priority)
    {
        _Attribute.Priority = priority;
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> IsVisible()
    {
        _Attribute.Visibility = ViewItemVisibility.Show;
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> IsVisibleAsEmptySpace()
    {
        _Attribute.Visibility = ViewItemVisibility.ShowEmptySpace;
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> IsNotVisible()
    {
        _Attribute.Visibility = ViewItemVisibility.Hide;
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> IsEnabled()
    {
        _Attribute.Enabled = true;
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> IsNotEnabled()
    {
        _Attribute.Enabled = false;
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> When(string criteria)
    {
        _Attribute.Criteria = criteria;
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> When(CriteriaOperator criteria)
    {
        _Attribute.Criteria = criteria.ToString();
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> ForItemsOfType(AppearanceItemType appearanceItemType)
    {
        return ForItemsOfType(appearanceItemType.ToString());
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> ForItemsOfType(string appearanceItemType)
    {
        _AppearanceItemTypeValue = _AppearanceItemTypeValue.AppendString(appearanceItemType);
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> ForLayoutItems()
    {
        return ForItemsOfType(AppearanceItemType.LayoutItem);
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> ForViewItems()
    {
        return ForItemsOfType(AppearanceItemType.ViewItem);
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> ForActions()
    {
        return ForItemsOfType(AppearanceItemType.Action);
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> InTheContextOf(string context)
    {
        _Context = _Context.AppendString(context);
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> InDetailViewContext()
    {
        return InTheContextOf(ViewType.DetailView.ToString());
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> InAnyContext()
    {
        return InTheContextOf(ViewType.Any.ToString());
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> InListViewContext()
    {
        return InTheContextOf(ViewType.ListView.ToString());
    }

    public PropertyBuilder<TProp, T> Build()
    {
        return _Builder;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> Targeting(string property)
    {
        _Attribute.TargetItems = _Attribute.TargetItems.AppendString(property);
        return this;
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> TargetingAll()
    {
        return Targeting("*");
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> ExceptingTarget(string property)
    {
        return Targeting(property);
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> Targeting<TProp2>(Expression<Func<T, TProp2>> property)
    {
        return Targeting(_Builder._Fields.GetPropertyName(property));
    }

    public ConditionalAppearancePropertyBuilder<TProp, T> ExceptingTarget<TProp2>(Expression<Func<T, TProp2>> property)
    {
        return ExceptingTarget(_Builder._Fields.GetPropertyName(property));
    }

    void IBuilder.Build()
    {
        if (!string.IsNullOrEmpty(_AppearanceItemTypeValue))
            _Attribute.AppearanceItemType = _AppearanceItemTypeValue;

        if (!string.IsNullOrEmpty(_Context))
            _Attribute.Context = _Context;
    }
}
```

##Where do i get it?##

Currently it is easy as brush your teeth using NuGet:

- For XAF-Only Attributes:

`Install-Package Para.FluentModelBuilder.XAF`

- For the ConditionalAppearance part use:

`Install-Package Para.FluentModelBuilder.ConditionalAppearance`

##Questions?##

Currently this is very alpha stuff, but it works brilliant for this easy example so far :)

Feel free to contact, fork or ask me for questions on twitter, facebook or Email:

- Twitter: https://twitter.com/biohaz999
- FB: https://www.facebook.com/manuel.grundner
- E-Mail: m.grundner at paragraph-software dot at


# Imported Comments #
## Tolis 19 Jul, 2013 ## 

Looks great but i do have a question, what about the Application Model it self? There you can do much more than any framework, it is more flexible and multilayered. I m interested to know why your team prefers to invent a code replacement of the amazing XAF application model. You can simply have many models and apply them as you wish. In eXpand as you probably know there are Global Application and Role models as well. Even multiple design time models are possible as you can see in http://apobekiaris.blogspot.gr/2010/08/xaf-models-xaf-models-and-again-xaf.html

## Manuel 20 Jul, 2013 ##
Tolis, It is not a code replacement :) cause it is applied to the TypesInfo before the Model is calculated, it supports the Model. We choose this approach for easier refactoring and code completition reasons. writing attributes lead us to very clutter design, and much errors in our main app is based on typos in string declarations (like spelled a PropertyName / Criterias wrong. ConditionalAppearance for example).

Another thing i like to mention is the single-responsibility-principle, i don't think the model should know about appearance rules, so i have to put them in another place. But to have them only in the xafml makes it very hard to (unit)test, so now we have the possibility to test them seperate AND fast.

Another reason is that we can apply all sort of metadata to our model in a centralized place in the project, so every developer knows where to put metadata for XAF. (we have also service applications that only need to know about XPO, but uses the same model)

Sometimes we had metadata as attributes, sometimes in the xafml. And we have 9 of them, so it is very hard to tell them where to put them correctly (or to find them when something goes wrong) :)

Thanks for your link, didn't know that one, Looks interestring.

Ps.: And we are developers, we love code ;)

## Manuel 20 Jul, 2013 ##
From the technical perspective the only thing it does is:

```cs
public sealed partial class TestModule : ModuleBase
{
    public override void CustomizeTypesInfo(ITypesInfo typesInfo)
    {
        base.CustomizeTypesInfo(typesInfo);

        var typeinfo = typesInfo.FindType(typeof(YourObject));

        typeinfo.AddAttribute(new ModelDefaultAttribute("Caption", "Car"));

        var memberInfo = typeinfo.FindMember("Doors");

        memberInfo.AddAttribute(new ModelDefaultAttribute("Caption", "Doors"));

        typesInfo.RefreshTypeInfo(typeinfo);
    }
}
```

