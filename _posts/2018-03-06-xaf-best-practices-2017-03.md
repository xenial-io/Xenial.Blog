---
 layout: post 
 title: XAF best practices 2017-03
 comments: true
 tags: ["DevExpress", "XAF", "BestPractices"]
---

In my last post we had a look how I like to implement `BusinessObjects` and a simple editor. In this post I will focus on one of the main areas for writing custom code: `Controllers` and `Actions`.

## Controllers

As you know there are normally 2 types of Controllers. ViewControllers and WindowControllers. Thats very basic and not that accurate for a real application. Most of the time you deal with different types of things in an application. BusinessLogic, view, state and so on.  
Most of the applications i saw did a really bad job when it's about seperating all this concernces. So let's have a look at `ViewControllers` first.

First of all: delete those stupid designer files. They will haunt you later on.

### ViewControllers

If you implement BusinessLogic most of the controllers will fit for one Type of BusinessObject. This is especially true for controllers with `Actions`.

Normally i like to call them BusinessObjectViewController, this is a good descriptive name for them (if they act for List and DetailViews and a single BusinessObject).

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