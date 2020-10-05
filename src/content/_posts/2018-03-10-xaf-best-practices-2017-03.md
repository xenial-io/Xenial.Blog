---
 layout: post 
 title: XAF best practices 2017-03
 series: xaf-best-practices-2017
 tags: ["DevExpress", "XAF", "BestPractices"]
---

In my last post we had a look how I like to implement `BusinessObjects` and a simple editor. In this post I will focus on one of the main areas for writing custom code: `Controllers` and `Actions`.

## Controllers

As you know there are normally 2 types of Controllers. `ViewControllers` and `WindowControllers`. Thats very basic and not that accurate for a real application. Most of the time you deal with different types of things in an application. `BusinessLogic`, view, state and so on.  
Most of the applications i saw did a really bad job when it's about separating all this concerns. So let's have a look at `ViewControllers` first.

First of all: delete those stupid designer files. They will haunt you later on.

### ViewControllers

If you implement business logic most of the controllers will fit for one Type of `BusinessObject`. This is especially true for controllers with `Actions`.

Normally i like to call them `BusinessObjectViewController`, this is a good descriptive name for them (if they act for List and `DetailViews` and a single `BusinessObject`).

So let's have a look:

```cs
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using DevExpress.ExpressApp;

namespace Scissors.ExpressApp
{
    public abstract class BusinessObjectViewController<TObjectType> : BusinessObjectViewController<ObjectView, TObjectType>
        where TObjectType : class
    {
    }

    public abstract class BusinessObjectViewController<TView, TObjectType> : ViewController<TView>
        where TObjectType : class
        where TView : ObjectView
    {
        public event EventHandler<CurrentObjectChangingEventArgs<TObjectType>> CurrentObjectChanging;
        public event EventHandler<CurrentObjectChangedEventArgs<TObjectType>> CurrentObjectChanged;

        protected BusinessObjectViewController()
            => TargetObjectType = typeof(TObjectType);

        protected override void OnActivated()
        {
            base.OnActivated();

            UnsubscribeFromViewEvents();
            SubscribeToViewEvents();
        }

        protected override void OnDeactivated()
        {
            UnsubscribeFromViewEvents();

            base.OnDeactivated();
        }

        private void SubscribeToViewEvents()
        {
            if(View != null)
            {
                View.QueryCanChangeCurrentObject += View_QueryCanChangeCurrentObject;
                View.CurrentObjectChanged += View_CurrentObjectChanged;
            }
        }

        private void UnsubscribeFromViewEvents()
        {
            if(View != null)
            {
                View.QueryCanChangeCurrentObject -= View_QueryCanChangeCurrentObject;
                View.CurrentObjectChanged -= View_CurrentObjectChanged;
            }
        }

        void View_QueryCanChangeCurrentObject(object sender, CancelEventArgs e)
        {
            var args = new CurrentObjectChangingEventArgs<TObjectType>(e.Cancel, CurrentObject);
            OnCurrentObjectChanging((TView)sender, args);
            e.Cancel = args.Cancel;
        }

        protected virtual void OnCurrentObjectChanging(TView view, CurrentObjectChangingEventArgs<TObjectType> e)
            => CurrentObjectChanging?.Invoke(this, e);

        void View_CurrentObjectChanged(object sender, EventArgs e)
            => OnCurrentObjectChanged((TView)sender, new CurrentObjectChangedEventArgs<TObjectType>(CurrentObject));

        protected virtual void OnCurrentObjectChanged(TView view, CurrentObjectChangedEventArgs<TObjectType> args)
            => CurrentObjectChanged?.Invoke(this, args);

        public TObjectType CurrentObject
            => View?.CurrentObject as TObjectType;

        public IEnumerable<TObjectType> SelectedObjects
        {
            get
            {
                foreach(var item in View?.SelectedObjects?.OfType<TObjectType>())
                {
                    yield return item;
                }
            }
        }
    }

    public class CurrentObjectChangedEventArgs<TObjectType> : EventArgs
        where TObjectType : class
    {
        public readonly TObjectType CurrentObject;

        public CurrentObjectChangedEventArgs(TObjectType obj)
            => CurrentObject = obj;
    }

    public class CurrentObjectChangingEventArgs<TObjectType> : EventArgs
        where TObjectType : class
    {
        public readonly TObjectType CurrentObject;

        public bool Cancel { get; set; }

        public CurrentObjectChangingEventArgs(TObjectType obj) : this(false, obj)
        {
        }

        public CurrentObjectChangingEventArgs(bool cancel, TObjectType obj)
        {
            Cancel = cancel;
            CurrentObject = obj;
        }
    }
}
```

As you can see it's a helper base class designed to work with an `ObjectView` (for example `ListViews` or `DetailViews`) and a specific `BusinessObject`. There are 2 additional methods you can overwrite: `OnCurrentObjectChanging` and `OnCurrentObjectChanged`. These are designed to subscribe and unsubscribe to events from the targeted `BusinessObject`.
Also all the casting of the current and selected objects are handled.
The both events `CurrentObjectChanging` and `CurrentObjectChanged` are for convenient use from other controllers. Also the additional `BusinessObjectViewController<TObjectType>` class is to avoid duplication if we don't care about the `View` at all.

There are of course 2 base classes we can provide:

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using DevExpress.ExpressApp;

namespace Scissors.ExpressApp
{
    public class BusinessObjectDetailViewController<TObjectType> : BusinessObjectViewController<DetailView, TObjectType>
        where TObjectType : class
    {
    }
    public class BusinessObjectListViewController<TObjectType> : BusinessObjectViewController<ListView, TObjectType>
        where TObjectType : class
    {
    }
}
```

Note another important pattern in the `BusinessObjectViewController` class. We always unsubscribe from events before we subscribe to them (in the `OnActivated` method), and we unsubscribe before the base call in the `OnDeactivated`. This will avoid duplicated subscriptions, as well as helping with managing the correct lifetime of events and avoid memory leaks later on.

For `Controllers` in general, try to override the `OnActivated` and `OnDeactivated` and don't use the event approach. It's a lot saver to do. If you still use the `designer.cs` approach, stop it. One merge conflict later and your stuff stops working, and you got no clue why.
Another thing is: You open a Controller file and see in the constructor whats going on. What `BusinessObject` are you dealing with, what `ViewId` and so on. No more digging in the `designer` or the `designer.cs` file to look for errors.

### Actions

Let's talk about `Actions`.
Actions are the main interaction (and abstraction) point of user interface in XAF. These are placed usually in the toolbar. So let's talk about the declaration.

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using DevExpress.ExpressApp.Actions;
using DevExpress.ExpressApp.Templates;
using DevExpress.Persistent.Base;
using Scissors.ExpressApp;
using Scissors.FeatureCenter.Modules.LabelEditorDemos.BusinessObjects;

#pragma warning disable IDE0021

namespace Scissors.FeatureCenter.Modules.LabelEditorDemos.Controllers
{
    public class LabelDemoModelObjectViewController : BusinessObjectViewController<LabelDemoModel>
    {
        public SimpleAction LoremIpsumSimpleAction { get; }

        public LabelDemoModelObjectViewController()
        {
            LoremIpsumSimpleAction = new SimpleAction(this, $"{GetType().FullName}.{nameof(LoremIpsumSimpleAction)}", PredefinedCategory.Edit)
            {
                Caption = "Insert Lorem Ipsum",
                ImageName = "BO_Skull",
                PaintStyle = ActionItemPaintStyle.Image,
                ToolTip = "Inserts the famous lorem ipsum text into the selected demo object",
                SelectionDependencyType = SelectionDependencyType.RequireSingleObject,
            };

            LoremIpsumSimpleAction.Execute += (s, e) =>
            {
                var txt = LoremIpsum(10, 10, 10, 10, 5);
                CurrentObject.Text = txt;
            };
        }

        static string LoremIpsum(
            int minWords,
            int maxWords,
            int minSentences,
            int maxSentences,
            int numParagraphs)
        {

            var words = new[]
            {
                "lorem", "ipsum", "dolor", "sit", "amet", "consectetuer",
                "adipiscing", "elit", "sed", "diam", "nonummy", "nibh", "euismod",
                "tincidunt", "ut", "laoreet", "dolore", "magna", "aliquam", "erat"
            };

            var rand = new Random();

            var numSentences = rand.Next(maxSentences - minSentences) + minSentences + 1;

            var numWords = rand.Next(maxWords - minWords) + minWords + 1;

            var result = new StringBuilder();

            for(var p = 0; p < numParagraphs; p++)
            {
                for(var s = 0; s < numSentences; s++)
                {
                    for(var w = 0; w < numWords; w++)
                    {
                        if(w > 0)
                        {
                            result.Append(" ");
                        }

                        if(rand.Next(0, 100) % 2 == 0)
                        {
                            result.Append("<b>");
                            result.Append(words[rand.Next(words.Length)]);
                            result.Append("</b>");
                        }
                        else
                        {
                            result.Append(words[rand.Next(words.Length)]);
                        }
                    }
                    result.Append(". ");
                }
                result.Append(Environment.NewLine);
            }

            return result.ToString();
        }
    }
}
```

So let's have a look:

  1. First of all we implement a public property with a getter only for the Action which is good. You should always do this.
  2. The action has a full Id path. (namespace.controller.action) that is very handy if you really got a lot actions in your application.
  3. We defined the category right (this EDIT's the business object)
  4. We have a caption, tooltip and an image
  5. We defined the `PaintStyle` (if you got a lot of actions, you really want only a few actions to have text, especially with low resolutions).

Thats all fine so far, but there is one gotcha here: coupling of business logic to an controller. Thats bad. We have no easy way to test stuff inside an controller.
But thats another best practice i get into A LOT in future blog posts.

As for the controller naming: `LabelDemoModel`-`ObjectViewController`. Name of the `BusinessObject` plus `ObjectViewController`. So it's clear when reading the name what is going on in this controller.

Let's see it in action:

![Demo of the LoremIpsumSimpleAction](/img/posts/2018/2018-03-10_ActionDemo.png)

Nice!
As you can see in the `Execute` handler of the action we don't need to cast anymore, are typesafe and it's easy to use.

> Note: There was a bug in the last post: You have to specify the `AutoSizeMode` of the `LabelControl` to `LabelAutoSizeMode.None` for correct wordwrap inside of a `LayoutControl`

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
                AutoSizeMode = LabelAutoSizeMode.None, //THIS WAS MISSING
            };

            control.Appearance.TextOptions.WordWrap = WordWrap.Wrap;

            return control;
        }

        public new LabelControl Control => (LabelControl)base.Control;
    }
}
```

But wait, there is one step I was missing. Registering the controller!

```cs
using System;
using System.Linq;
using Scissors.FeatureCenter.Modules.LabelEditorDemos.Controllers;

namespace Scissors.FeatureCenter.Modules.LabelEditorDemos
{
    public static class LabelEditorDemosControllers
    {
        public static readonly Type[] Types = new[]
        {
            typeof(LabelDemoModelObjectViewController)
        };
    }
}
```

Like the `BusinessObjects` we define a separate class for the controller types. And then we need to register them.

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

        protected override IEnumerable<Type> GetDeclaredControllerTypes()
            => LabelEditorDemosControllers.Types;
    }
}
```