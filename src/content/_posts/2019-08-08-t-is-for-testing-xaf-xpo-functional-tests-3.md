---
 layout: post 
 title: "T is for Testing: XAF & XPO - Functional Tests 3"
 tags: ["Testing", "XAF", "XPO", "Builder", "Patterns", "DevExpress", "EasyTest", "Ranorex", "Webtestit", "XUnit", "NUnit"]
 series: t-is-for-testing-xaf-xpo
 github: XafEasyTestInCodeNUnit
---

Testing is an important part of a developers responsibilities, especially in a fast moving agile world!
This is the first post in a [series](/series/{{page.series}}) on testing patterns I used and discovered when testing applications using XAF and XPO applications.

Although the patterns I use are focusing on testing XAF and XPO applications, most of them may apply to not only on testing and not only on XAF applications.
After learning about test data in the [last post](/2019/05/26/t-is-for-testing-xaf-xpo-test-data-2.html) we now can focus on functional tests. So let's get started!

## Functional Tests

So let's think about what functional tests are.

* Simulate user input
* Assert behavior

Okay seams legit, but how can you actually to do that?

There are several technologies available, depending on the platform. For the web, I did a lot of testing in the past with [Selenium](http://seleniumhq.org). At my last job at [Ranorex](https://www.ranorex.com/) we wrote a whole product around Selenium called [Webtestit](https://www.ranorex.com/webtestit/)! (That's awesome by the way, check it out). From DevExpress there is [TestCafe](https://www.devexpress.com/products/testcafestudio/) but I didn't had a chance to use it in a real world project yet. [Puppeteer](//github.com/GoogleChrome/puppeteer) is also an valuable tool (esp. for headless testing).

For Windows-Desktop there are another load of options. There is [Ranorex Studio](//www.ranorex.com/why-ranorex/), [Coded-UI-Tests](//docs.microsoft.com/en-us/visualstudio/test/use-ui-automation-to-test-your-code?view=vs-2019) from Microsoft, [WinAppDriver](//github.com/microsoft/WinAppDriver) also from Microsoft, [Project Sikuli](http://doc.sikuli.org) and of course there is [EasyTest](//documentation.devexpress.com/eXpressAppFramework/113206/Concepts/Debugging-Testing-and-Error-Handling/Functional-Testing) from DevExpress.

To be honest I never looked into EasyTest until now, cause I don't like recorded tests. Those are incredible hard to maintain. That is not special to EasyTest it self. Almost all tools I mentioned above provide some kind of recording, but on EasyTest it self, I disliked it for another reason: A special script language. That wouldn't be that bad, if it would be a [turing-complete](//en.wikipedia.org/wiki/Turing_completeness) language, but it isn't. The language is a [DSL](//en.wikipedia.org/wiki/Domain-specific_language) special for tests, and it's easy to read, but I never got warm with it. Most of the teams I work with don't want to learn a new language, especially on top on new concepts (yes there are a lot of people out there, want to start testing, but have no idea how).

But then I discovered an [old blog post](//community.devexpress.com/blogs/xaf/archive/2011/05/04/how-to-write-easytests-in-code.aspx) (!!) from [Tolis](//github.com/apobekiaris) (the creator of [eXpand-framework](http://expandframework.com)) how to write EasyTests in C# and started to play with it. After checking out this [SupportCenter article](//www.devexpress.com/Support/Center/Question/Details/T710782/how-to-write-easytests-in-code) I got it working, and what should I say? I'm in love. But let's talk about a powerful functional testing pattern first: The Page-Object-Pattern.

## Page-Object-Pattern

What's a page object? It's a powerful abstraction hiding the nitty gritty details of your UI out of the test and let you focus on what a user see's when he is using your UI.

It encapsulates selectors, actions and user interactions in an easy maintainable way.

> This sample is pure pseudo code, no implementation detail about any of the above mentioned technologies are used. This will lay the foundation for the real world example later in this post.

Imaging a typical XAF-Winforms application. Navigation on the left with a `Customer_ListView` `NavigationItem`, when you click on it, the `Customer_ListView` appears. It should be sorted by `Name`. On `DoubleClick` it should show the `Customer_DetailView` with the data. Change some fields, click on `SaveAndClose` and be sure that the `Grid` in the `ListView` is updated accordingly.
What would `PageObject's` look like?

```cs
public class RootPageObject
{
    public NavigationPageObject NavigateTo() => new NavigationPageObject();
}

public class NavigationPageObject
{
    public CustomerListViewPageObject Customers() => new CustomerListViewPageObject();
}

public class CustomerListViewPageObject
{
    public CustomerDetailViewPageObject NewRecord() => => new CustomerDetailViewPageObject();
    public CustomerDetailViewPageObject OpenRecord(int rowNumber) => new CustomerDetailViewPageObject();
    public string GetName(int rowNumber) => /**/;
}

public class CustomerDetailViewPageObject
{
    public CustomerListViewPageObject SaveAndClose() => new CustomerListViewPageObject();
    public CustomerDetailViewPageObject SetName(string name) => this;
}
```

If we want to write a test it could look like something like that:

```cs
[Fact]
public void NewCustomersShouldSortedByName()
{
    var app = new RootPageObject();
    CustomerListPageObject list = app.NavigateTo().Customers()
        .NewRecord()
            .SetName("Manuel")
            .SaveAndClose()
        .NewRecord()
            .SetName("Alice")
            .SaveAndClose();

    list.ShouldSatisfyAllConditions(
        () => list.GetName(0).ShouldBe("Alice"),
        () => list.GetName(1).ShouldBe("Manuel"),
    );
}

```

As you can see, the code is very clear. It mimics the behavior of the user. Navigate to the customers `ListView`, click on `New`, enter some data, `SaveAndClose`, hit `New` again, enter more data, check if the sorting is correct.

The test it self is easy to read, reason about and is [DRY](//en.wikipedia.org/wiki/Don%27t_repeat_yourself). Did you see any implementation detail? No? Me neither. And thats the goal with the Page-Object-Pattern.

The fluent object pattern here helps a lot with discoverability (intellisense). It's not necessary to apply the pattern, but it makes reading the tests a breeze (if you get code indention right ;))

> Hide the UI-Details inside the page object's to abstract away possible UI changes and increase maintainability through abstraction. Focus on what a user can do with your application, not on the actual UI or technical implementation details.

## Run EasyTests in Code with NUnit

Based on the [SupportCenter article](//www.devexpress.com/Support/Center/Question/Details/T710782/how-to-write-easytests-in-code) and the [old blog post](//community.devexpress.com/blogs/xaf/archive/2011/05/04/how-to-write-easytests-in-code.aspx) from Tolis and the [nice help](//www.devexpress.com/Support/Center/Question/Details/T801643/easytest-nuget-packages-for-devexpress-expressapp-easytest-adapter-are-missing) from the team, I got a [solution](//github.com/biohazard999/XafEasyTestInCodeNUnit) working that looks like this:

> This is just the port to the currently latest version (19.1.5) at the moment. TLDR: If you want to skip the technical part, go straight to my [recommended version](#XUnit).

There are some considerations to make when writing tests in general. One of them is autonomy. To isolate potential bugs, and make test's reliable, stable and repeatable and order independent, the application should start at a predictable state. So restarting the application on every test is expensive, but totally worth it on the long run.

Let's start with a basic test organization pattern: Generic test fixture using [NUnit](//nunit.org):

```cs
using DevExpress.EasyTest.Framework;
using NUnit.Framework;

namespace EasyTest.Tests.Utils
{
    [TestFixture]
    public class EasyTestTestsBase<T> where T : IEasyTestFixtureHelper, new()
    {
        private IEasyTestFixtureHelper helper;
        protected TestCommandAdapter commandAdapter => helper.CommandAdapter;
        protected ICommandAdapter adapter => helper.Adapter;

        [OneTimeSetUp]
        public void SetupFixture()
        {
            helper = new T();
            helper.SetupFixture();
        }

        [SetUp]
        public void SetUp() => helper.SetUp();

        [TearDown]
        public void TearDown() => helper.TearDown();

        [OneTimeTearDown]
        public void TearDownFixture() => helper.TearDownFixture();

        protected bool IsWeb => helper.IsWeb;
    }
}

using System;
using DevExpress.EasyTest.Framework;

namespace EasyTest.Tests.Utils {
    public interface IEasyTestFixtureHelper {
        void SetupFixture();
        void SetUp();
        void TearDown();
        void TearDownFixture();
        TestCommandAdapter CommandAdapter { get; }
        ICommandAdapter Adapter { get; }
        bool IsWeb { get; }
    }
}

```

I like it cause it removes the overhead of remembering the right `Attributes` and makes our tests consistent.

Next let's dive into the the `TestCommandAdapter`. This class is used to send commands to the XAF application and pulling out values to verify.

```cs
using DevExpress.EasyTest.Framework;
using DevExpress.EasyTest.Framework.Commands;

namespace EasyTest.Tests.Utils
{
    public class TestCommandAdapter
    {
        private readonly ICommandAdapter adapter;
        private readonly TestApplication testApplication;
        public TestCommandAdapter(ICommandAdapter webAdapter, TestApplication testApplication)
        {
            this.testApplication = testApplication;
            adapter = webAdapter;
        }

        internal void DoAction(string name, string paramValue)
            => new ActionCommand().DoAction(adapter, name, paramValue);

        internal string GetActionValue(string name)
        {
            var control = adapter.CreateTestControl(TestControlType.Action, name).GetInterface<IControlText>();
            return control.Text;
        }

        internal string GetFieldValue(string fieldName)
            => CheckFieldValuesCommand.GetFieldValue(adapter, fieldName);

        internal void ProcessRecord(string tableName, string[] columnNames, string[] values, string actionName)
        {
            ProcessRecordCommand command = new ProcessRecordCommand();
            command.SetApplicationOptions(testApplication);
            command.ProcessRecord(adapter, tableName, actionName, columnNames, values);
        }

        internal void SetFieldValue(string fieldName, string value)
            => FillFieldCommand.SetFieldCommand(adapter, fieldName, value);

        public IGridColumn GetColumn(ITestControl testControl, string columnName)
        {
            foreach (IGridColumn column in testControl.GetInterface<IGridBase>().Columns)
            {
                if (string.Compare(column.Caption, columnName, testApplication.IgnoreCase) == 0)
                {
                    return column;
                }
            }
            return null;
        }

        internal string GetCellValue(string tableName, int row, string columnName)
        {
            var testControl = adapter.CreateTestControl(TestControlType.Table, tableName);
            var gridControl = testControl.GetInterface<IGridBase>();
            return gridControl.GetCellValue(row, GetColumn(testControl, columnName));
        }

        internal object GetTableRowCount(string tableName)
        {
            var gridControl = adapter.CreateTestControl(TestControlType.Table, tableName).GetInterface<IGridBase>();
            return gridControl.GetRowCount();
        }
    }
}
```

Now we need to initialize the application's for win and web:

```cs
using System.Xml;
using DevExpress.EasyTest.Framework;

namespace EasyTest.Tests.Utils
{
    public abstract class TestFixtureHelperBase : IEasyTestFixtureHelper
    {
        public abstract TestCommandAdapter CommandAdapter { get; }
        public abstract ICommandAdapter Adapter { get; }
        public abstract bool IsWeb { get; }
        public abstract void SetUp();
        public abstract void SetupFixture();
        public abstract void TearDown();
        public abstract void TearDownFixture();

        protected static XmlAttribute CreateAttribute(XmlDocument doc, string attributeName, string attributeValue)
        {
            var entry = doc.CreateAttribute(attributeName);
            entry.Value = attributeValue;
            return entry;
        }

        protected static XmlAttribute CreateAttribute(XmlDocument doc, string attributeName, bool attributeValue)
            => CreateAttribute(doc, attributeName, attributeValue.ToString());
    }
}

using DevExpress.EasyTest.Framework;
using DevExpress.ExpressApp.EasyTest.WebAdapter;
using DevExpress.ExpressApp.Xpo;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Xml;

namespace EasyTest.Tests.Utils
{
    public abstract class WebEasyTestFixtureHelperBase : TestFixtureHelperBase
    {
        private const string testWebApplicationRootUrl = "http://localhost:3057";
        protected WebAdapter webAdapter;
        protected TestCommandAdapter commandAdapter;
        protected ICommandAdapter adapter;
        protected TestApplication application;
        public WebEasyTestFixtureHelperBase(string relativePathToWebApplication)
        {
            var testApplicationDir = Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), relativePathToWebApplication);

            application = new TestApplication
            {
                IgnoreCase = true,
            };

            var doc = new XmlDocument();

            var additionalAttributes = new List<XmlAttribute>
            {
                CreateAttribute(doc, "PhysicalPath", testApplicationDir),
                CreateAttribute(doc, "URL", $"{testWebApplicationRootUrl}{GetUrlOptions()}"),
                CreateAttribute(doc, "SingleWebDev", true),
                CreateAttribute(doc, "DontRestartIIS", true),
                CreateAttribute(doc, "UseIISExpress", true),
            };

            application.AdditionalAttributes = additionalAttributes.ToArray();
        }

        protected virtual string GetUrlOptions() => "/default.aspx";

        public override void SetupFixture()
        {
            webAdapter = new WebAdapter();
            webAdapter.RunApplication(application, InMemoryDataStoreProvider.ConnectionString);
        }

        public override void SetUp()
        {
            adapter = webAdapter.CreateCommandAdapter();
            commandAdapter = new TestCommandAdapter(adapter, application);
        }

        public override void TearDown()
        {
            var urlParams = GetUrlOptions();
            webAdapter.WebBrowser.Navigate(testWebApplicationRootUrl + urlParams + (urlParams.Contains("?") ? "&" : "?") + "Reset=true");
        }

        public override void TearDownFixture()
        {
            webAdapter.WebBrowser.Close();
            webAdapter.KillApplication(application, KillApplicationContext.TestAborted);
        }

        public override TestCommandAdapter CommandAdapter => commandAdapter;
        public override ICommandAdapter Adapter => adapter;
        public override bool IsWeb => true;
    }
}

using System.Collections.Generic;
using System.IO;
using System.Xml;
using DevExpress.EasyTest.Framework;
using DevExpress.ExpressApp.EasyTest.WinAdapter;
using DevExpress.ExpressApp.Xpo;

namespace EasyTest.Tests.Utils
{
    public abstract class WinEasyTestFixtureHelperBase : TestFixtureHelperBase
    {
        private TestApplication application;
        private WinAdapter applicationAdapter;
        private string applicationDirectoryName;
        private string applicationName;
        protected ICommandAdapter adapter;
        protected TestCommandAdapter commandAdapter;

        public WinEasyTestFixtureHelperBase(string applicationDirectoryName, string applicationName)
        {
            this.applicationDirectoryName = applicationDirectoryName;
            this.applicationName = applicationName;
        }

        public override void SetUp()
        {
            applicationAdapter = new WinAdapter();
            applicationAdapter.RunApplication(application, $"ConnectionString={InMemoryDataStoreProvider.ConnectionString};FOO=BAR");
            adapter = ((IApplicationAdapter)applicationAdapter).CreateCommandAdapter();
            commandAdapter = new TestCommandAdapter(adapter, application);
        }

        public override void SetupFixture()
        {
            application = new TestApplication();
            var doc = new XmlDocument();
            var additionalAttributes = new List<XmlAttribute>
            {
                CreateAttribute(doc, "FileName", Path.GetFullPath(Path.Combine($@"..\..\..\..\{applicationDirectoryName}", @"bin\EasyTest\net462\" + applicationName))),
                CreateAttribute(doc, "CommunicationPort", "4100"),
            };

            application.AdditionalAttributes = additionalAttributes.ToArray();
        }

        public override void TearDown()
            => applicationAdapter.KillApplication(application, KillApplicationContext.TestAborted);

        public override void TearDownFixture() { }

        public override ICommandAdapter Adapter => adapter;
        public override TestCommandAdapter CommandAdapter => commandAdapter;
        public override bool IsWeb => false;
    }
}

using EasyTest.Tests.Utils;

namespace EasyTest.Tests
{
    public class WinTestApplicationHelper : WinEasyTestFixtureHelperBase
    {
        public WinTestApplicationHelper() : base("TestApplication.Win", "TestApplication.Win.exe") { }
    }

    public class WebTestApplicationHelper : WebEasyTestFixtureHelperBase
    {
        public WebTestApplicationHelper() : base(@"..\..\..\..\TestApplication.Web") { }
    }
}

```

Puh that's a lot of code, but it's not that hard to understand. The tricky part is getting the path's right ;). Normally I would rather use environment variables instead of hard coding them, but for now that's fine. Let's have a look at the test cases them self:

```cs
using System;
using System.Collections.Generic;
using NUnit.Framework;
using DevExpress.EasyTest.Framework;
using EasyTest.Tests.Utils;

namespace EasyTest.Tests
{
    public abstract class CommonTests<T> : EasyTestTestsBase<T> where T : IEasyTestFixtureHelper, new()
    {
        protected void ChangeContactNameTest_()
        {
            var control = adapter.CreateTestControl(TestControlType.Table, "");
            var table = control.GetInterface<IGridBase>();
            Assert.AreEqual(2, table.GetRowCount());

            var column = commandAdapter.GetColumn(control, "Full Name");

            Assert.AreEqual("John Nilsen", table.GetCellValue(0, column));
            Assert.AreEqual("Mary Tellitson", table.GetCellValue(1, column));

            commandAdapter.ProcessRecord("Contact", new string[] { "Full Name" }, new string[] { "Mary Tellitson" }, "");

            Assert.AreEqual("Mary Tellitson", commandAdapter.GetFieldValue("Full Name"));
            Assert.AreEqual("Development Department", commandAdapter.GetFieldValue("Department"));
            Assert.AreEqual("Manager", commandAdapter.GetFieldValue("Position"));

            if (IsWeb)
            {
                commandAdapter.DoAction("Edit", null);
            }

            commandAdapter.SetFieldValue("First Name", "User_1");
            commandAdapter.SetFieldValue("Last Name", "User_2");

            commandAdapter.SetFieldValue("Position", "Developer");

            commandAdapter.DoAction("Save", null);

            Assert.AreEqual("User_1 User_2", commandAdapter.GetFieldValue("Full Name"));
            Assert.AreEqual("Developer", commandAdapter.GetFieldValue("Position"));
        }

        protected void WorkingWithTasks_()
        {
            commandAdapter.DoAction("Navigation", "Default.Demo Task");
            commandAdapter.ProcessRecord("Demo Task", new string[] { "Subject" }, new string[] { "Fix breakfast" }, "");

            var control = adapter.CreateTestControl(TestControlType.Table, "Contacts");
            var table = control.GetInterface<IGridBase>();
            Assert.AreEqual(0, table.GetRowCount());

            commandAdapter.DoAction("Contacts.Link", null);
            control = adapter.CreateTestControl(TestControlType.Table, "Contact");
            control.GetInterface<IGridRowsSelection>().SelectRow(0);
            commandAdapter.DoAction("OK", null);

            control = adapter.CreateTestControl(TestControlType.Table, "Contacts");
            table = control.GetInterface<IGridBase>();
            Assert.AreEqual(1, table.GetRowCount());
            Assert.AreEqual("John Nilsen", commandAdapter.GetCellValue("Contacts", 0, "Full Name"));
        }

        protected void ChangeContactNameAgainTest_()
        {
            Assert.AreEqual("John Nilsen", commandAdapter.GetCellValue("Contact", 0, "Full Name"));
            Assert.AreEqual("Mary Tellitson", commandAdapter.GetCellValue("Contact", 1, "Full Name"));

            commandAdapter.ProcessRecord("Contact", new string[] { "Full Name" }, new string[] { "Mary Tellitson" }, "");

            if (IsWeb)
            {
                commandAdapter.DoAction("Edit", null);
            }

            Assert.AreEqual("Mary Tellitson", commandAdapter.GetFieldValue("Full Name"));
            Assert.AreEqual("Development Department", commandAdapter.GetFieldValue("Department"));

            commandAdapter.SetFieldValue("First Name", "User_1");
            commandAdapter.SetFieldValue("Last Name", "User_2");

            commandAdapter.DoAction("Save", null);
            commandAdapter.DoAction("Navigation", "Contact");

            Assert.AreEqual("John Nilsen", commandAdapter.GetCellValue("Contact", 0, "Full Name"));
            Assert.AreEqual("User_1 User_2", commandAdapter.GetCellValue("Contact", 1, "Full Name"));

        }
    }
}
using System;
using NUnit.Framework;

namespace EasyTest.Tests
{
    [TestFixture]
    public class WinTests : CommonTests<WinTestApplicationHelper>
    {
        [Test]
        public void ChangeContactNameTest() => ChangeContactNameTest_();

        [Test]
        public void WorkingWithTasks() => WorkingWithTasks_();

        [Test]
        public void ChangeContactNameAgainTest()
            => ChangeContactNameAgainTest_();
    }
}

using NUnit.Framework;
using DevExpress.EasyTest.Framework;

namespace EasyTest.Tests
{
    [TestFixture]
    public class WebTests : CommonTests<WebTestApplicationHelper>
    {
        [Test]
        public void ChangeContactNameTest() => ChangeContactNameTest_();

        [Test]
        public void WorkingWithTasks() => WorkingWithTasks_();

        [Test]
        public void ChangeContactNameAgainTest()
            => ChangeContactNameAgainTest_();

        [Test]
        public void UnlinkActionTest()
        {
            commandAdapter.DoAction("Navigation", "Department");
            commandAdapter.ProcessRecord("Department", new string[] { "Title" }, new string[] { "Development Department" }, "");

            commandAdapter.DoAction("Positions", null);

            var gridControl = adapter.CreateTestControl(TestControlType.Table, "Positions");
            Assert.AreEqual(2, gridControl.GetInterface<IGridBase>().GetRowCount());

            Assert.AreEqual("Developer", commandAdapter.GetCellValue("Positions", 0, "Title"));

            var unlink = adapter.CreateTestControl(TestControlType.Action, "Positions.Unlink");
            Assert.IsFalse(unlink.GetInterface<IControlEnabled>().Enabled);


            gridControl.GetInterface<IGridRowsSelection>().SelectRow(0);

            Assert.IsTrue(unlink.GetInterface<IControlEnabled>().Enabled);
            commandAdapter.DoAction("Positions.Unlink", null);

            Assert.AreEqual(1, gridControl.GetInterface<IGridBase>().GetRowCount());
            Assert.AreEqual("Manager", commandAdapter.GetCellValue("Positions", 0, "Title"));

            commandAdapter.DoAction("Contacts", null);
            unlink = adapter.CreateTestControl(TestControlType.Action, "Contacts.Unlink");
            Assert.IsFalse(unlink.GetInterface<IControlEnabled>().Enabled);
        }
    }
}

```

> To run the web tests VisualStudio need's to be run as an Administrator.

Okay, that's not that bad! We are using the generic test fixture to keep test's consistent and we can reuse test cases for win and web and web, as well as writing platform specific ones! But where is the test data coming from and how are we isolating the data between the test cases? Let's have a look into one very special class used by our applications: The `InMemoryDataStoreProvider`:

```cs
using System;
using DevExpress.Xpo.DB;

namespace TestApplication.EasyTest
{
    public class InMemoryDataStoreProvider : InMemoryDataStore
    {
        new public const string XpoProviderTypeString = "InMemoryDataSet";

        static InMemoryDataStoreProvider() => Register();

        new public static void Register()
            => RegisterDataStoreProvider(XpoProviderTypeString, CreateProviderFromString);

        private static object syncRoot = new object();

        private static InMemoryDataStore _savedDataSet;
        private static InMemoryDataStore savedDataSet
        {
            get => _savedDataSet;
            set
            {
                lock (syncRoot)
                {
                    _savedDataSet = value;
                }
            }
        }

        private static InMemoryDataStore _store;
        private static InMemoryDataStore store
        {
            get => _store;
            set
            {
                lock (syncRoot)
                {
                    _store = value;
                }
            }
        }

        new public static IDataStore CreateProviderFromString(string connectionString, AutoCreateOption autoCreateOption, out IDisposable[] objectsToDisposeOnDisconnect)
        {
            if (store == null)
            {
                store = new InMemoryDataStore(AutoCreateOption.DatabaseAndSchema);
            }

            objectsToDisposeOnDisconnect = new IDisposable[] { };

            return store;
        }

        public static bool HasData => savedDataSet != null;

        public static void Save()
        {
            if (!HasData && store != null)
            {
                savedDataSet = store;
            }
        }

        public static void Reload()
        {
            if (HasData && store != null)
            {
                store.ReadFromInMemoryDataStore(savedDataSet);
            }
        }
    }
}

```

This class allows us to save a snapshot of the data at any time, as well as reloading the snapshot! That's super useful cause we now can control the state of the database between test cases.

`WinApplication.cs`:

```cs
using System;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.Win;
using DevExpress.ExpressApp.Xpo;

namespace TestApplication.Win
{
    public partial class TestApplicationWindowsFormsApplication : WinApplication
    {
        public TestApplicationWindowsFormsApplication()
        {
            InitializeComponent();
            DelayedViewItemsInitialization = true;
#if EASYTEST
            DatabaseUpdateMode = DatabaseUpdateMode.UpdateDatabaseAlways;
            CheckCompatibilityType = CheckCompatibilityType.ModuleInfo;
#endif
        }

        protected override void CreateDefaultObjectSpaceProvider(CreateCustomObjectSpaceProviderEventArgs args)
        {
            args.ObjectSpaceProvider = new XPObjectSpaceProvider(new ConnectionStringDataStoreProvider(args.ConnectionString), false);
        }

        private void TestApplicationWindowsFormsApplication_DatabaseVersionMismatch(object sender, DevExpress.ExpressApp.DatabaseVersionMismatchEventArgs e)
        {
#if EASYTEST
            e.Updater.Update();
            e.Handled = true;
            TestApplication.EasyTest.InMemoryDataStoreProvider.Save();
#endif
        }
    }
}
using System;
using System.Configuration;
using System.Windows.Forms;
using DevExpress.ExpressApp.Security;

namespace TestApplication.Win
{
    static class Program
    {
        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        static void Main(params string[] args)
        {
#if EASYTEST
            DevExpress.ExpressApp.Win.EasyTest.EasyTestRemotingRegistration.Register();
            TestApplication.EasyTest.InMemoryDataStoreProvider.Register();
#endif

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            EditModelPermission.AlwaysGranted = System.Diagnostics.Debugger.IsAttached;
            var winApplication = new TestApplicationWindowsFormsApplication();
#if EASYTEST
            winApplication.ConnectionString = $"XpoProvider={TestApplication.EasyTest.InMemoryDataStoreProvider.XpoProviderTypeString}";
#endif
            if (ConfigurationManager.ConnectionStrings["ConnectionString"] != null)
            {
                winApplication.ConnectionString = ConfigurationManager.ConnectionStrings["ConnectionString"].ConnectionString;
            }
            try
            {
                winApplication.Setup();
                winApplication.Start();
            }
            catch (Exception e)
            {
                winApplication.HandleException(e);
            }
        }
    }
}
```

You can see we are saving the database state right after the database updater. So it's based on our `ModuleUpdater`:

`ModuleUpdater.cs`:

```cs
using System;
using DevExpress.Data.Filtering;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.Updating;

namespace TestApplication.Module
{
    public class Updater : ModuleUpdater
    {
        public Updater(IObjectSpace objectSpace, Version currentDBVersion) : base(objectSpace, currentDBVersion) { }
        public override void UpdateDatabaseAfterUpdateSchema()
        {
            base.UpdateDatabaseAfterUpdateSchema();
#if EASYTEST
            var developerPosition = ObjectSpace.FindObject<Position>(CriteriaOperator.Parse("Title == 'Developer'"));
            if (developerPosition == null)
            {
                developerPosition = ObjectSpace.CreateObject<Position>();
                developerPosition.Title = "Developer";
                developerPosition.Save();
            }
            var managerPosition = ObjectSpace.FindObject<Position>(CriteriaOperator.Parse("Title == 'Manager'"));
            if (managerPosition == null)
            {
                managerPosition = ObjectSpace.CreateObject<Position>();
                managerPosition.Title = "Manager";
                managerPosition.Save();
            }
            var devDepartment = ObjectSpace.FindObject<Department>(CriteriaOperator.Parse("Title == 'Development Department'"));
            if (devDepartment == null)
            {
                devDepartment = ObjectSpace.CreateObject<Department>();
                devDepartment.Title = "Development Department";
                devDepartment.Office = "205";
                devDepartment.Positions.Add(developerPosition);
                devDepartment.Positions.Add(managerPosition);
                devDepartment.Save();
            }
            var contactMary = ObjectSpace.FindObject<Contact>(CriteriaOperator.Parse("FirstName == 'Mary' && LastName == 'Tellitson'"));
            if (contactMary == null)
            {
                contactMary = ObjectSpace.CreateObject<Contact>();
                contactMary.FirstName = "Mary";
                contactMary.LastName = "Tellitson";
                contactMary.Email = "mary_tellitson@md.com";
                contactMary.Birthday = new DateTime(1980, 11, 27);
                contactMary.Department = devDepartment;
                contactMary.Position = managerPosition;
                contactMary.Save();
            }
            var contactJohn = ObjectSpace.FindObject<Contact>(CriteriaOperator.Parse("FirstName == 'John' && LastName == 'Nilsen'"));
            if (contactJohn == null)
            {
                contactJohn = ObjectSpace.CreateObject<Contact>();
                contactJohn.FirstName = "John";
                contactJohn.LastName = "Nilsen";
                contactJohn.Email = "john_nilsen@md.com";
                contactJohn.Birthday = new DateTime(1981, 10, 3);
                contactJohn.Department = devDepartment;
                contactJohn.Position = developerPosition;
                contactJohn.Save();
            }
            if (ObjectSpace.FindObject<DemoTask>(CriteriaOperator.Parse("Subject == 'Review reports'")) == null)
            {
                var task = ObjectSpace.CreateObject<DemoTask>();
                task.Subject = "Review reports";
                task.AssignedTo = contactJohn;
                task.StartDate = DateTime.Parse("May 03, 2008");
                task.DueDate = DateTime.Parse("September 06, 2008");
                task.Status = DevExpress.Persistent.Base.General.TaskStatus.InProgress;
                task.Priority = Priority.High;
                task.EstimatedWork = 60;
                task.Description = "Analyse the reports and assign new tasks to employees.";
                task.Save();
            }
            if (ObjectSpace.FindObject<DemoTask>(CriteriaOperator.Parse("Subject == 'Fix breakfast'")) == null)
            {
                var task = ObjectSpace.CreateObject<DemoTask>();
                task.Subject = "Fix breakfast";
                task.AssignedTo = contactMary;
                task.StartDate = DateTime.Parse("May 03, 2008");
                task.DueDate = DateTime.Parse("May 04, 2008");
                task.Status = DevExpress.Persistent.Base.General.TaskStatus.Completed;
                task.Priority = Priority.Low;
                task.EstimatedWork = 1;
                task.ActualWork = 3;
                task.Description = "The Development Department - by 9 a.m.\r\nThe R&QA Department - by 10 a.m.";
                task.Save();
            }
            if (ObjectSpace.FindObject<DemoTask>(CriteriaOperator.Parse("Subject == 'Task1'")) == null)
            {
                var task = ObjectSpace.CreateObject<DemoTask>();
                task.Subject = "Task1";
                task.AssignedTo = contactJohn;
                task.StartDate = DateTime.Parse("June 03, 2008");
                task.DueDate = DateTime.Parse("June 06, 2008");
                task.Status = DevExpress.Persistent.Base.General.TaskStatus.Completed;
                task.Priority = Priority.High;
                task.EstimatedWork = 10;
                task.ActualWork = 15;
                task.Description = "A task designed specially to demonstrate the PivotChart module. Switch to the Reports navigation group to view the generated analysis.";
                task.Save();
            }
            if (ObjectSpace.FindObject<DemoTask>(CriteriaOperator.Parse("Subject == 'Task2'")) == null)
            {
                var task = ObjectSpace.CreateObject<DemoTask>();
                task.Subject = "Task2";
                task.AssignedTo = contactJohn;
                task.StartDate = DateTime.Parse("July 03, 2008");
                task.DueDate = DateTime.Parse("July 06, 2008");
                task.Status = DevExpress.Persistent.Base.General.TaskStatus.Completed;
                task.Priority = Priority.Low;
                task.EstimatedWork = 8;
                task.ActualWork = 16;
                task.Description = "A task designed specially to demonstrate the PivotChart module. Switch to the Reports navigation group to view the generated analysis.";
                task.Save();
            }
            ObjectSpace.CommitChanges();
#endif
        }
    }
}
```

The web version is a little bit more complicated because of the nature of IIS and ASPX applications:

`Global.asax.cs`:

```cs
using System;
using System.Configuration;
using System.Web;
using System.Web.Routing;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.Security;
using DevExpress.ExpressApp.Web;
using DevExpress.Persistent.Base;
using DevExpress.Web;

namespace TestApplication.Web
{
    public class Global : System.Web.HttpApplication
    {
#if EASYTEST
        protected void Application_AcquireRequestState(Object sender, EventArgs e)
        {
            if (HttpContext.Current.Request.Params["Reset"] == "true")
            {
                TestApplication.EasyTest.InMemoryDataStoreProvider.Reload();
                WebApplication.Instance.LogOff();
                WebApplication.Redirect(Request.RawUrl.Replace("&Reset=true", "").Replace("?Reset=true", ""), true);
            }
        }
#endif
        protected void Application_Start(Object sender, EventArgs e)
        {
            RouteTable.Routes.RegisterXafRoutes();
            ASPxWebControl.CallbackError += new EventHandler(Application_Error);
#if EASYTEST
            DevExpress.ExpressApp.Web.TestScripts.TestScriptsManager.EasyTestEnabled = true;
            ConfirmationsHelper.IsConfirmationsEnabled = false;
            TestApplication.EasyTest.InMemoryDataStoreProvider.Register();
#endif
        }
        protected void Session_Start(Object sender, EventArgs e)
        {
            Tracing.Initialize();
#if EASYTEST
            TestApplication.EasyTest.InMemoryDataStoreProvider.Reload();
#endif
            var application = new TestApplicationAspNetApplication();
            WebApplication.SetInstance(Session, application);
            SecurityStrategy security = (SecurityStrategy)WebApplication.Instance.Security;
            security.RegisterXPOAdapterProviders();
            DevExpress.ExpressApp.Web.Templates.DefaultVerticalTemplateContentNew.ClearSizeLimit();
            WebApplication.Instance.SwitchToNewStyle();
            if (ConfigurationManager.ConnectionStrings["ConnectionString"] != null)
            {
                WebApplication.Instance.ConnectionString = ConfigurationManager.ConnectionStrings["ConnectionString"].ConnectionString;
            }
#if EASYTEST
            TestApplication.EasyTest.InMemoryDataStoreProvider.Reload();
            if (ConfigurationManager.ConnectionStrings["EasyTestConnectionString"] != null)
            {
                WebApplication.Instance.ConnectionString = ConfigurationManager.ConnectionStrings["EasyTestConnectionString"].ConnectionString;
            }
#endif

#if EASYTEST
            WebApplication.Instance.ConnectionString = $"XpoProvider={TestApplication.EasyTest.InMemoryDataStoreProvider.XpoProviderTypeString}";
#endif
#if DEBUG
            if (System.Diagnostics.Debugger.IsAttached && WebApplication.Instance.CheckCompatibilityType == CheckCompatibilityType.DatabaseSchema)
            {
                WebApplication.Instance.DatabaseUpdateMode = DatabaseUpdateMode.UpdateDatabaseAlways;
            }
#endif
            WebApplication.Instance.Setup();
            WebApplication.Instance.Start();
        }
    }
}

```

`WebApplication.cs`:

```cs
using System;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.Web;
using DevExpress.ExpressApp.Xpo;

namespace TestApplication.Web
{
    // For more typical usage scenarios, be sure to check out https://docs.devexpress.com/eXpressAppFramework/DevExpress.ExpressApp.Web.WebApplication
    public partial class TestApplicationAspNetApplication : WebApplication
    {
        protected override void CreateDefaultObjectSpaceProvider(CreateCustomObjectSpaceProviderEventArgs args)
        {
            args.ObjectSpaceProvider = new XPObjectSpaceProvider(GetDataStoreProvider(args.ConnectionString, args.Connection), true);
            args.ObjectSpaceProviders.Add(new NonPersistentObjectSpaceProvider(TypesInfo, null));
        }

        private IXpoDataStoreProvider GetDataStoreProvider(string connectionString, System.Data.IDbConnection connection)
        {
            System.Web.HttpApplicationState application = (System.Web.HttpContext.Current != null) ? System.Web.HttpContext.Current.Application : null;
            IXpoDataStoreProvider dataStoreProvider = null;
            if (application != null && application["DataStoreProvider"] != null)
            {
                dataStoreProvider = application["DataStoreProvider"] as IXpoDataStoreProvider;
            }
            else
            {
                dataStoreProvider = XPObjectSpaceProvider.GetDataStoreProvider(connectionString, connection, true);
                if (application != null)
                {
                    application["DataStoreProvider"] = dataStoreProvider;
                }
            }
            return dataStoreProvider;
        }

        private void Solution1AspNetApplication_DatabaseVersionMismatch(object sender, DevExpress.ExpressApp.DatabaseVersionMismatchEventArgs e)
        {
#if EASYTEST
            e.Updater.Update();
            e.Handled = true;
            TestApplication.EasyTest.InMemoryDataStoreProvider.Save();
#endif
        }
    }
}

```

Here you can see we can reset the application state with the `Application_AcquireRequestState` method. That means if we navigate to `http://localhost:3057?Reset=true` we can reload the database and we also reload the state after the session has started.

> You can find the full source code on [github](//github.com/biohazard999/XafEasyTestInCodeNUnit)

Okay now we have the basic's! But I don't like how the tests them self are structured, it's really hard to get what the application is supposed to do. Let's refactor the code to use [xUnit](//xunit.net) and the page object pattern to make it more readable!

<!-- markdownlint-disable MD033 -->
<a name="XUnit"></a>
<!-- markdownlint-enable MD033 -->

## Run EasyTests in Code with XUnit

The port is rather straight forward so let's zap through the code real quick:

```cs
using System;
using System.Xml;
using DevExpress.EasyTest.Framework;

namespace EasyTest.Tests.Utils
{
    public abstract class EasyTestFixtureBase : IDisposable
    {
        public abstract TestCommandAdapter CommandAdapter { get; }
        public abstract ICommandAdapter Adapter { get; }
        public abstract bool IsWeb { get; }
        public abstract void Dispose();

        protected static XmlAttribute CreateAttribute(XmlDocument doc, string attributeName, string attributeValue)
        {
            var entry = doc.CreateAttribute(attributeName);
            entry.Value = attributeValue;
            return entry;
        }

        protected static XmlAttribute CreateAttribute(XmlDocument doc, string attributeName, bool attributeValue)
            => CreateAttribute(doc, attributeName, attributeValue.ToString());
    }
}
using DevExpress.EasyTest.Framework;
using DevExpress.EasyTest.Framework.Commands;

namespace EasyTest.Tests.Utils
{
    public class TestCommandAdapter
    {
        private readonly ICommandAdapter adapter;
        private readonly TestApplication testApplication;
        public TestCommandAdapter(ICommandAdapter webAdapter, TestApplication testApplication)
        {
            this.testApplication = testApplication;
            adapter = webAdapter;
        }

        internal void DoAction(string name, string paramValue)
            => new ActionCommand().DoAction(adapter, name, paramValue);

        internal string GetActionValue(string name)
        {
            var control = adapter.CreateTestControl(TestControlType.Action, name).GetInterface<IControlText>();
            return control.Text;
        }

        internal string GetFieldValue(string fieldName)
            => CheckFieldValuesCommand.GetFieldValue(adapter, fieldName);

        internal void ProcessRecord(string tableName, string[] columnNames, string[] values, string actionName)
        {
            ProcessRecordCommand command = new ProcessRecordCommand();
            command.SetApplicationOptions(testApplication);
            command.ProcessRecord(adapter, tableName, actionName, columnNames, values);
        }

        internal void SetFieldValue(string fieldName, string value)
            => FillFieldCommand.SetFieldCommand(adapter, fieldName, value);

        public IGridColumn GetColumn(ITestControl testControl, string columnName)
        {
            foreach (IGridColumn column in testControl.GetInterface<IGridBase>().Columns)
            {
                if (string.Compare(column.Caption, columnName, testApplication.IgnoreCase) == 0)
                {
                    return column;
                }
            }
            return null;
        }

        internal string GetCellValue(string tableName, int row, string columnName)
        {
            var testControl = adapter.CreateTestControl(TestControlType.Table, tableName);
            var gridControl = testControl.GetInterface<IGridBase>();
            return gridControl.GetCellValue(row, GetColumn(testControl, columnName));
        }

        internal object GetTableRowCount(string tableName)
        {
            var gridControl = adapter.CreateTestControl(TestControlType.Table, tableName).GetInterface<IGridBase>();
            return gridControl.GetRowCount();
        }
    }
}

using DevExpress.EasyTest.Framework;
using DevExpress.ExpressApp.EasyTest.WebAdapter;
using DevExpress.ExpressApp.Xpo;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Xml;

namespace EasyTest.Tests.Utils
{
    public abstract class WebEasyTestFixtureHelperBase : EasyTestFixtureBase
    {
        private const string testWebApplicationRootUrl = "http://localhost:3057";
        protected WebAdapter webAdapter;
        protected TestCommandAdapter commandAdapter;
        protected ICommandAdapter adapter;
        protected TestApplication application;
        public WebEasyTestFixtureHelperBase(string relativePathToWebApplication)
        {
            var testApplicationDir = Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), relativePathToWebApplication);

            application = new TestApplication
            {
                IgnoreCase = true,
            };

            var doc = new XmlDocument();

            var additionalAttributes = new List<XmlAttribute>
            {
                CreateAttribute(doc, "PhysicalPath", testApplicationDir),
                CreateAttribute(doc, "URL", $"{testWebApplicationRootUrl}{GetUrlOptions()}"),
                CreateAttribute(doc, "SingleWebDev", true),
                CreateAttribute(doc, "DontRestartIIS", true),
                CreateAttribute(doc, "UseIISExpress", true),
            };

            application.AdditionalAttributes = additionalAttributes.ToArray();

            webAdapter = new WebAdapter();
            webAdapter.RunApplication(application, InMemoryDataStoreProvider.ConnectionString);
            adapter = webAdapter.CreateCommandAdapter();
            commandAdapter = new TestCommandAdapter(adapter, application);
        }

        protected virtual string GetUrlOptions() => "/default.aspx";

        public override void Dispose()
        {
            var urlParams = GetUrlOptions();
            webAdapter.WebBrowser.Navigate(testWebApplicationRootUrl + urlParams + (urlParams.Contains("?") ? "&" : "?") + "Reset=true");
            webAdapter.WebBrowser.Close();
            try
            {
                webAdapter.KillApplication(application, KillApplicationContext.TestNormalEnded);
            }
            catch { }
        }

        public override TestCommandAdapter CommandAdapter => commandAdapter;
        public override ICommandAdapter Adapter => adapter;
        public override bool IsWeb => true;
    }
}

using System.Collections.Generic;
using System.IO;
using System.Xml;
using DevExpress.EasyTest.Framework;
using DevExpress.ExpressApp.EasyTest.WinAdapter;
using DevExpress.ExpressApp.Xpo;

namespace EasyTest.Tests.Utils
{
    public abstract class WinEasyTestFixtureHelperBase : EasyTestFixtureBase
    {
        private TestApplication application;
        private WinAdapter applicationAdapter;
        private string applicationDirectoryName;
        private string applicationName;
        protected ICommandAdapter adapter;
        protected TestCommandAdapter commandAdapter;

        public WinEasyTestFixtureHelperBase(string applicationDirectoryName, string applicationName)
        {
            this.applicationDirectoryName = applicationDirectoryName;
            this.applicationName = applicationName;

            application = new TestApplication();
            var doc = new XmlDocument();
            var additionalAttributes = new List<XmlAttribute>
            {
                CreateAttribute(doc, "FileName", Path.GetFullPath(Path.Combine($@"..\..\..\..\{applicationDirectoryName}", @"bin\EasyTest\net462\" + applicationName))),
                CreateAttribute(doc, "CommunicationPort", "4100"),
            };

            application.AdditionalAttributes = additionalAttributes.ToArray();

            applicationAdapter = new WinAdapter();
            applicationAdapter.RunApplication(application, $"ConnectionString={InMemoryDataStoreProvider.ConnectionString};FOO=BAR");
            adapter = ((IApplicationAdapter)applicationAdapter).CreateCommandAdapter();
            commandAdapter = new TestCommandAdapter(adapter, application);
        }

        public override void Dispose()
            => applicationAdapter.KillApplication(application, KillApplicationContext.TestAborted);

        public override ICommandAdapter Adapter => adapter;
        public override TestCommandAdapter CommandAdapter => commandAdapter;
        public override bool IsWeb => false;
    }
}

```

So not much changed. Only some attributes, we got rid of some additional helper classes. The test code is almost the same:

```cs
using EasyTest.Tests.Utils;

namespace EasyTest.Tests
{
    public class WinTestApplicationHelper : WinEasyTestFixtureHelperBase
    {
        public WinTestApplicationHelper() : base("TestApplication.Win", "TestApplication.Win.exe") { }
    }

    public class WebTestApplicationHelper : WebEasyTestFixtureHelperBase
    {
        public WebTestApplicationHelper() : base(@"..\..\..\..\TestApplication.Web") { }
    }
}

using System;
using System.Collections.Generic;
using NUnit.Framework;
using DevExpress.EasyTest.Framework;
using EasyTest.Tests.Utils;
using Xunit;

namespace EasyTest.Tests
{
    public abstract class CommonTests<T> : IDisposable where T : EasyTestFixtureBase, new()
    {
        protected T Fixture { get; }

        public CommonTests()
            => Fixture = new T();

        public void Dispose()
            => Fixture.Dispose();

        protected void ChangeContactNameTest_()
        {
            var control = Fixture.Adapter.CreateTestControl(TestControlType.Table, "");
            var table = control.GetInterface<IGridBase>();
            Assert.Equal(2, table.GetRowCount());

            var column = Fixture.CommandAdapter.GetColumn(control, "Full Name");

            Assert.Equal("John Nilsen", table.GetCellValue(0, column));
            Assert.Equal("Mary Tellitson", table.GetCellValue(1, column));

            Fixture.CommandAdapter.ProcessRecord("Contact", new string[] { "Full Name" }, new string[] { "Mary Tellitson" }, "");

            Assert.Equal("Mary Tellitson", Fixture.CommandAdapter.GetFieldValue("Full Name"));
            Assert.Equal("Development Department", Fixture.CommandAdapter.GetFieldValue("Department"));
            Assert.Equal("Manager", Fixture.CommandAdapter.GetFieldValue("Position"));

            if (Fixture.IsWeb)
            {
                Fixture.CommandAdapter.DoAction("Edit", null);
            }

            Fixture.CommandAdapter.SetFieldValue("First Name", "User_1");
            Fixture.CommandAdapter.SetFieldValue("Last Name", "User_2");

            Fixture.CommandAdapter.SetFieldValue("Position", "Developer");

            Fixture.CommandAdapter.DoAction("Save", null);

            Assert.Equal("User_1 User_2", Fixture.CommandAdapter.GetFieldValue("Full Name"));
            Assert.Equal("Developer", Fixture.CommandAdapter.GetFieldValue("Position"));
        }

        protected void WorkingWithTasks_()
        {
            Fixture.CommandAdapter.DoAction("Navigation", "Default.Demo Task");
            Fixture.CommandAdapter.ProcessRecord("Demo Task", new string[] { "Subject" }, new string[] { "Fix breakfast" }, "");

            var control = Fixture.Adapter.CreateTestControl(TestControlType.Table, "Contacts");
            var table = control.GetInterface<IGridBase>();
            Assert.Equal(0, table.GetRowCount());

            Fixture.CommandAdapter.DoAction("Contacts.Link", null);
            control = Fixture.Adapter.CreateTestControl(TestControlType.Table, "Contact");
            control.GetInterface<IGridRowsSelection>().SelectRow(0);
            Fixture.CommandAdapter.DoAction("OK", null);

            control = Fixture.Adapter.CreateTestControl(TestControlType.Table, "Contacts");
            table = control.GetInterface<IGridBase>();
            Assert.Equal(1, table.GetRowCount());
            Assert.Equal("John Nilsen", Fixture.CommandAdapter.GetCellValue("Contacts", 0, "Full Name"));
        }

        protected void ChangeContactNameAgainTest_()
        {
            Assert.Equal("John Nilsen", Fixture.CommandAdapter.GetCellValue("Contact", 0, "Full Name"));
            Assert.Equal("Mary Tellitson", Fixture.CommandAdapter.GetCellValue("Contact", 1, "Full Name"));

            Fixture.CommandAdapter.ProcessRecord("Contact", new string[] { "Full Name" }, new string[] { "Mary Tellitson" }, "");

            if (Fixture.IsWeb)
            {
                Fixture.CommandAdapter.DoAction("Edit", null);
            }

            Assert.Equal("Mary Tellitson", Fixture.CommandAdapter.GetFieldValue("Full Name"));
            Assert.Equal("Development Department", Fixture.CommandAdapter.GetFieldValue("Department"));

            Fixture.CommandAdapter.SetFieldValue("First Name", "User_1");
            Fixture.CommandAdapter.SetFieldValue("Last Name", "User_2");

            Fixture.CommandAdapter.DoAction("Save", null);
            Fixture.CommandAdapter.DoAction("Navigation", "Contact");

            Assert.Equal("John Nilsen", Fixture.CommandAdapter.GetCellValue("Contact", 0, "Full Name"));
            Assert.Equal("User_1 User_2", Fixture.CommandAdapter.GetCellValue("Contact", 1, "Full Name"));

        }
    }
}

using System;
using Xunit;

namespace EasyTest.Tests
{
    public class WinTests : CommonTests<WinTestApplicationHelper>
    {
        [Fact]
        public void ChangeContactNameTest() => ChangeContactNameTest_();

        [Fact]
        public void WorkingWithTasks() => WorkingWithTasks_();

        [Fact]
        public void ChangeContactNameAgainTest()
            => ChangeContactNameAgainTest_();
    }
}

using NUnit.Framework;
using DevExpress.EasyTest.Framework;
using Xunit;

namespace EasyTest.Tests
{
    public class WebTests : CommonTests<WebTestApplicationHelper>
    {
        [Fact]
        public void ChangeContactNameTest() => ChangeContactNameTest_();

        [Fact]
        public void WorkingWithTasks() => WorkingWithTasks_();

        [Fact]
        public void ChangeContactNameAgainTest()
            => ChangeContactNameAgainTest_();

        [Fact]
        public void UnlinkActionTest()
        {
            Fixture.CommandAdapter.DoAction("Navigation", "Department");
            Fixture.CommandAdapter.ProcessRecord("Department", new string[] { "Title" }, new string[] { "Development Department" }, "");

            Fixture.CommandAdapter.DoAction("Positions", null);

            var gridControl = Fixture.Adapter.CreateTestControl(TestControlType.Table, "Positions");
            Assert.Equal(2, gridControl.GetInterface<IGridBase>().GetRowCount());

            Assert.Equal("Developer", Fixture.CommandAdapter.GetCellValue("Positions", 0, "Title"));

            var unlink = Fixture.Adapter.CreateTestControl(TestControlType.Action, "Positions.Unlink");
            Assert.False(unlink.GetInterface<IControlEnabled>().Enabled);


            gridControl.GetInterface<IGridRowsSelection>().SelectRow(0);

            Assert.True(unlink.GetInterface<IControlEnabled>().Enabled);
            Fixture.CommandAdapter.DoAction("Positions.Unlink", null);

            Assert.Equal(1, gridControl.GetInterface<IGridBase>().GetRowCount());
            Assert.Equal("Manager", Fixture.CommandAdapter.GetCellValue("Positions", 0, "Title"));

            Fixture.CommandAdapter.DoAction("Contacts", null);
            unlink = Fixture.Adapter.CreateTestControl(TestControlType.Action, "Contacts.Unlink");
            Assert.False(unlink.GetInterface<IControlEnabled>().Enabled);
        }
    }
}

```

Again nothing new. Only changed the assertions and used the `Fixture`. Now let's look into the page-object-pattern:

> You can find the full source code on [github](//github.com/biohazard999/XafEasyTestInCodeXUnit)

## Apply the Page-Object-Pattern

Let's have a look into one test case first to see if that pattern is worth anything:

```cs
using System.Collections.Generic;
using EasyTest.Tests.PageObjects;
using Shouldly;
using Xunit;

namespace EasyTest.Tests
{
    public class WebTests : CommonTests<WebTestApplicationHelper>
    {
        [Fact]
        public void UnlinkActionTest()
        {
            var departmentDetail = new ApplicationPageObject(Fixture)
                .NavigateToDepartment()
                .OpenRecordByTitle("Development Department");

            departmentDetail
                .Positions()
                .Assert(p =>
                {
                    p.RowCount.ShouldBe(2);
                    p.GetValues(0, "Title").ShouldBe(new Dictionary<string, string>
                    {
                        ["Title"] = "Developer"
                    });
                    p.UnlinkAction.Enabled.ShouldBeFalse();
                })
                .SelectRow(0)
                .Assert(p => p.UnlinkAction.Enabled.ShouldBeTrue())
                .ExecuteAction(p => p.UnlinkAction)
                .Assert(p =>
                {
                    p.RowCount.ShouldBe(1);
                    p.GetValues(0, "Title")
                    .ShouldBe(new Dictionary<string, string>
                    {
                        ["Title"] = "Manager"
                    });
                });

            departmentDetail
                .Contacts()
                .Assert(c => c.UnlinkAction.Enabled.ShouldBeFalse())
                .SelectRow(0)
                .Assert(c => c.UnlinkAction.Enabled.ShouldBeTrue());
        }
    }
}

```

I don't know much, but that looks like a nice structured test. It is totally clear what the test is supposed to do.
It is structured in a readable fashion, not too much technical details and is focused on the user. If I'm a user of my application thats exactly the way I would interact with the application.

For the sake of completeness here is the complete test code:

```cs
using System;
using System.Collections.Generic;
using EasyTest.Tests.PageObjects;
using EasyTest.Tests.Utils;
using Shouldly;

namespace EasyTest.Tests
{
    public abstract class CommonTests<T> : IDisposable where T : EasyTestFixtureBase, new()
    {
        protected T Fixture { get; }

        public CommonTests()
            => Fixture = new T();

        public void Dispose()
            => Fixture.Dispose();

        protected void ChangeContactNameTest_()
        {
            var contactList = new ApplicationPageObject(Fixture)
                .NavigateToContact()
                .Assert(d =>
                {
                    d.RowCount.ShouldBe(2);
                    d.GetValues(0, "Full Name")
                        .ShouldBe(new Dictionary<string, string>()
                        {
                            ["Full Name"] = "John Nilsen"
                        });

                    d.GetValues(1, "Full Name")
                        .ShouldBe(new Dictionary<string, string>()
                        {
                            ["Full Name"] = "Mary Tellitson"
                        });
                });

            var contactDetail = contactList
                .OpenRecordByFullName("Mary Tellitson")
                .Assert(c =>
                {
                    c.FullName.ShouldBe("Mary Tellitson");
                    c.Department.ShouldBe("Development Department");
                    c.Position.ShouldBe("Manager");
                })
                .ExecuteActionIf(f => f.IsWeb, c => c.EditAction)
                .Do(c =>
                {
                    c.FirstName = "User_1";
                    c.LastName = "User_2";
                    c.Position = "Developer";
                })
                .ExecuteAction(c => c.SaveAction)
                .Assert(c =>
                {
                    c.FullName.ShouldBe("User_1 User_2");
                    c.Position.ShouldBe("Developer");
                })
                .ExecuteAction(c => c.SaveAndCloseAction);

            contactList.GetValues(1, "Full Name", "Position").ShouldBe(new Dictionary<string, string>
            {
                ["Full Name"] = "User_1 User_2",
                ["Position"] = "Developer"
            });
        }

        protected void WorkingWithTasks_()
        {
            var taskDetail = new ApplicationPageObject(Fixture)
               .NavigateTo("Demo Task")
               .OpenRecord("Subject", "Fix breakfast");

            taskDetail
                .List("Contacts")
                .Assert(c => c.RowCount.ShouldBe(0))
                .ExecuteAction(c => c.LinkAction, f => new ListPageObject(f, "Contact"), contactsPopup =>
                {
                    contactsPopup
                        .SelectRow(0)
                        .ExecuteAction(x => x.Action("OK"));
                })
                .Assert(c =>
                {
                    c.RowCount.ShouldBe(1);
                    c.GetValues(0, "Full Name").ShouldBe(new Dictionary<string, string>
                    {
                        ["Full Name"] = "John Nilsen"
                    });
                });
        }

        protected void ChangeContactNameAgainTest_()
        {
            var application = new ApplicationPageObject(Fixture);

            var contactList = application
                .NavigateToContact()
                .Assert(c =>
                {
                    c.GetValues(0, "Full Name").ShouldBe(new Dictionary<string, string>
                    {
                        ["Full Name"] = "John Nilsen"
                    });
                    c.GetValues(1, "Full Name").ShouldBe(new Dictionary<string, string>
                    {
                        ["Full Name"] = "Mary Tellitson"
                    });
                });

            var contactDetail = contactList
                .OpenRecordByFullName("Mary Tellitson")
                .ExecuteActionIf(f => f.IsWeb, c => c.EditAction)
                .Assert(c =>
                {
                    c.FullName.ShouldBe("Mary Tellitson");
                    c.Department.ShouldBe("Development Department");
                })
                .Do(c =>
                {
                    c.FirstName = "User_1";
                    c.LastName = "User_2";
                })
                .ExecuteAction(c => c.SaveAction);

            application
                .NavigateToContact()
                .Assert(c =>
                {
                    c.GetValues(0, "Full Name").ShouldBe(new Dictionary<string, string>
                    {
                        ["Full Name"] = "John Nilsen"
                    });
                    c.GetValues(1, "Full Name").ShouldBe(new Dictionary<string, string>
                    {
                        ["Full Name"] = "User_1 User_2"
                    });
                });
        }
    }
}

using System.Collections.Generic;
using EasyTest.Tests.PageObjects;
using Shouldly;
using Xunit;

namespace EasyTest.Tests
{
    public class WebTests : CommonTests<WebTestApplicationHelper>
    {
        [Fact]
        public void ChangeContactNameTest() => ChangeContactNameTest_();

        [Fact]
        public void WorkingWithTasks() => WorkingWithTasks_();

        [Fact]
        public void ChangeContactNameAgainTest()
            => ChangeContactNameAgainTest_();

        [Fact]
        public void UnlinkActionTest()
        {
            var departmentDetail = new ApplicationPageObject(Fixture)
                .NavigateToDepartment()
                .OpenRecordByTitle("Development Department");

            departmentDetail
                .Positions()
                .Assert(p =>
                {
                    p.RowCount.ShouldBe(2);
                    p.GetValues(0, "Title").ShouldBe(new Dictionary<string, string>
                    {
                        ["Title"] = "Developer"
                    });
                    p.UnlinkAction.Enabled.ShouldBeFalse();
                })
                .SelectRow(0)
                .Assert(p => p.UnlinkAction.Enabled.ShouldBeTrue())
                .ExecuteAction(p => p.UnlinkAction)
                .Assert(p =>
                {
                    p.RowCount.ShouldBe(1);
                    p.GetValues(0, "Title").ShouldBe(new Dictionary<string, string>
                    {
                        ["Title"] = "Manager"
                    });
                });

            departmentDetail
                .Contacts()
                .Assert(c => c.UnlinkAction.Enabled.ShouldBeFalse())
                .SelectRow(0)
                .Assert(c => c.UnlinkAction.Enabled.ShouldBeTrue());
        }
    }
}

using System;
using Xunit;

namespace EasyTest.Tests
{
    public class WinTests : CommonTests<WinTestApplicationHelper>
    {
        [Fact]
        public void ChangeContactNameTest() => ChangeContactNameTest_();

        [Fact]
        public void WorkingWithTasks() => WorkingWithTasks_();

        [Fact]
        public void ChangeContactNameAgainTest()
            => ChangeContactNameAgainTest_();
    }
}

```

So now what? Let's look at the PageObjects. Don't be scared, we use recursive generics again as in the [last post](/2019/05/26/t-is-for-testing-xaf-xpo-test-data-2.html).

```cs
using DevExpress.EasyTest.Framework;
using EasyTest.Tests.Utils;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EasyTest.Tests.PageObjects
{
    public abstract class PageObject<T> where T : PageObject<T>
    {

        protected readonly EasyTestFixtureBase Fixture;
        public PageObject(EasyTestFixtureBase fixture)
            => Fixture = fixture;

        protected T This => (T)this;

        public T Assert(Action<T> assert)
        {
            assert(This);
            return This;
        }

        public virtual ActionPageObject Action(string actionName) => new ActionPageObject(Fixture, actionName);

        public T ExecuteAction(Func<T, ActionPageObject> action)
        {
            action(This).Execute();
            return This;
        }

        public T ExecuteAction<TPageObject>(Func<T, ActionPageObject> action, Func<EasyTestFixtureBase, TPageObject> pageObjectFactory, Action<TPageObject> executor)
        {
            action(This).Execute();
            executor(pageObjectFactory(Fixture));
            return This;
        }

        public T ExecuteActionIf(Predicate<EasyTestFixtureBase> predicate, Func<T, ActionPageObject> action)
        {
            if (predicate(Fixture))
            {
                return ExecuteAction(action);
            }
            return This;
        }

        public T Do(Action<T> action)
        {
            action(This);
            return This;
        }
    }

    public class NestedListPageObject : NestedListPageObject<NestedListPageObject>
    {
        public NestedListPageObject(EasyTestFixtureBase fixture, string listName) : base(fixture, listName) { }

    }

    public abstract class NestedListPageObject<T> : ListPageObject<T>
        where T : NestedListPageObject<T>
    {

        public NestedListPageObject(EasyTestFixtureBase fixture, string listName) : base(fixture, listName) { }
    }

    public class ApplicationPageObject : ApplicationPageObject<ApplicationPageObject>
    {
        public ApplicationPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class ApplicationPageObject<T> : PageObject<T>
        where T : ApplicationPageObject<T>
    {
        public ApplicationPageObject(EasyTestFixtureBase fixture) : base(fixture) { }

        public DepartmentListPageObject NavigateToDepartment()
        {
            Fixture.CommandAdapter.DoAction("Navigation", "Department");
            return new DepartmentListPageObject(Fixture);
        }

        public ContactListPageObject NavigateToContact()
        {
            Fixture.CommandAdapter.DoAction("Navigation", "Contact");
            return new ContactListPageObject(Fixture);
        }

        public ListPageObject NavigateTo(string navigationName)
        {
            Fixture.CommandAdapter.DoAction("Navigation", navigationName);
            return new ListPageObject(Fixture, "Demo Task");
        }
    }

    public class ListPageObject : ListPageObject<ListPageObject>
    {
        public ListPageObject(EasyTestFixtureBase fixture, string tableName) : base(fixture, tableName) { }
    }

    public class ListPageObject<T> : PageObject<T>
        where T : ListPageObject<T>
    {
        protected string TableName { get; }
        protected ITestControl TestControl { get; }

        public ListPageObject(EasyTestFixtureBase fixture, string tableName) : base(fixture)
        {
            TableName = tableName;
            TestControl = Fixture.Adapter.CreateTestControl(TestControlType.Table, tableName);
        }

        public TDetailPageObject OpenRecord<TDetailPageObject>(string columnName, string value, Func<EasyTestFixtureBase, TDetailPageObject> pageObjectFactory)
        {
            Fixture.CommandAdapter.ProcessRecord(TableName, new string[] { columnName }, new string[] { value }, "");

            return pageObjectFactory(Fixture);
        }

        public DetailPageObject OpenRecord(string columnName, string value)
            => OpenRecord(columnName, value, f => new DetailPageObject(f));

        public int RowCount => TestControl.GetInterface<IGridBase>().GetRowCount();

        public Dictionary<string, string> GetValues(int rowIndex, params string[] columnNames)
            => columnNames.Select(columnName => new
            {
                ColumnName = columnName,
                Value = Fixture.CommandAdapter.GetCellValue(TableName, rowIndex, columnName)

            }).ToDictionary(x => x.ColumnName, x => x.Value);

        public ActionPageObject NestedAction(string actionName) => base.Action($"{TableName}.{actionName}");

        public ActionPageObject UnlinkAction => NestedAction("Unlink");
        public ActionPageObject LinkAction => NestedAction("Link");

        public T SelectRow(int rowIndex)
        {
            TestControl.GetInterface<IGridRowsSelection>().SelectRow(rowIndex);
            return This;
        }
    }

    public class DepartmentListPageObject : DepartmentListPageObject<DepartmentListPageObject>
    {
        public DepartmentListPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class DepartmentListPageObject<T> : ListPageObject<T>
        where T : DepartmentListPageObject<T>
    {
        public DepartmentListPageObject(EasyTestFixtureBase fixture) : base(fixture, "Department") { }

        public DepartmentDetailPageObject OpenRecordByTitle(string title)
            => OpenRecord("Title", title, f => new DepartmentDetailPageObject(f));
    }

    public class ContactListPageObject : ContactListPageObject<ContactListPageObject>
    {
        public ContactListPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class ContactListPageObject<T> : ListPageObject<T>
        where T : ContactListPageObject<T>
    {
        public ContactListPageObject(EasyTestFixtureBase fixture) : base(fixture, "Contact") { }

        public ContactDetailPageObject OpenRecordByFullName(string title)
            => OpenRecord("Full Name", title, f => new ContactDetailPageObject(f));
    }

    public class DetailPageObject : DetailPageObject<DetailPageObject>
    {
        public DetailPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class DetailPageObject<T> : PageObject<T>
        where T : DetailPageObject<T>
    {
        public DetailPageObject(EasyTestFixtureBase fixture) : base(fixture) { }

        public ListPageObject List(string tableName) => new ListPageObject(Fixture, tableName);

        public string GetValue(string fieldName) => Fixture.CommandAdapter.GetFieldValue(fieldName);
        public void SetValue(string fieldName, string value) => Fixture.CommandAdapter.SetFieldValue(fieldName, value);

        public ActionPageObject EditAction => Action("Edit");
        public ActionPageObject SaveAction => Action("Save");
        public ActionPageObject SaveAndCloseAction => Action("Save and Close");
        public ActionPageObject CloseAction => Action("Close");
    }


    public class ContactDetailPageObject : ContactDetailPageObject<ContactDetailPageObject>
    {
        public ContactDetailPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class ContactDetailPageObject<T> : DetailPageObject<T>
        where T : ContactDetailPageObject<T>
    {
        public ContactDetailPageObject(EasyTestFixtureBase fixture) : base(fixture) { }

        public string FirstName
        {
            get => GetValue("First Name");
            set => SetValue("First Name", value);
        }

        public string LastName
        {
            get => GetValue("Last Name");
            set => SetValue("Last Name", value);
        }

        public string FullName
        {
            get => GetValue("Full Name");
            set => SetValue("Full Name", value);
        }

        public string Department
        {
            get => GetValue("Department");
            set => SetValue("Department", value);
        }

        public string Position
        {
            get => GetValue("Position");
            set => SetValue("Position", value);
        }
    }

    public class DepartmentDetailPageObject : DepartmentDetailPageObject<DepartmentDetailPageObject>
    {
        public DepartmentDetailPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class DepartmentDetailPageObject<T> : DetailPageObject<T>
        where T : DepartmentDetailPageObject<T>
    {
        public DepartmentDetailPageObject(EasyTestFixtureBase fixture) : base(fixture) { }

        public PositionListPageObject Positions()
        {
            Fixture.CommandAdapter.DoAction("Positions", null);
            return new PositionListPageObject(Fixture);
        }

        public NestedListPageObject Contacts()
        {
            Fixture.CommandAdapter.DoAction("Contacts", null);
            return new NestedListPageObject(Fixture, "Contacts");
        }
    }

    public class PositionListPageObject : PositionListPageObject<PositionListPageObject>
    {
        public PositionListPageObject(EasyTestFixtureBase fixture) : base(fixture) { }
    }

    public class PositionListPageObject<T> : NestedListPageObject<T>
        where T : PositionListPageObject<T>
    {
        public PositionListPageObject(EasyTestFixtureBase fixture) : base(fixture, "Positions") { }
    }

    public class ActionPageObject : ActionPageObject<ActionPageObject>
    {
        public ActionPageObject(EasyTestFixtureBase fixture, string actionName) : base(fixture, actionName) { }
    }

    public class ActionPageObject<T> : PageObject<T>
        where T : ActionPageObject<T>
    {
        protected string ActionName { get; }
        protected ITestControl TestControl { get; }

        public ActionPageObject(EasyTestFixtureBase fixture, string actionName) : base(fixture)
        {
            ActionName = actionName;
            TestControl = Fixture.Adapter.CreateTestControl(TestControlType.Action, actionName);
        }

        public bool Enabled => TestControl.GetInterface<IControlEnabled>().Enabled;

        public T Execute()
        {
            Fixture.CommandAdapter.DoAction(ActionName, null);
            return This;
        }
    }
}

```

> In my tests i use the following libraries:  
> [XUnit](//xunit.net/)  
> [Shouldly](//github.com/shouldly/shouldly)

Okay thats a lot of code, but under the hood it's the same stuff as before. Most of it is boilerplate code. But can you spot the difference? There are two ways to write `PageObjects`. declarative and imperative. If you look back at `WorkingWithTasks_` method, we didn't write new PageObject classes, instead we used the imperative style. That is a valuable option, if your application is rather large and have a lot of nested views, or some parts of the application that don't change a lot, but I would not recommend that cause you are leaking a lot of implementation details to the test. I rather prefer the declarative approach for 4 reasons:

1. Maintainability: Need to fix a caption? Ohhhh.... I need to change 300 tests...
1. Focus: What's the action again on that ListView? Can't remember the name, need to lookup in source or start the application
1. Localization: If you extend the page object pattern for localized captions, you can test your app in different languages!
1. Parameters: You can use parametrized tests more easily

What do you think? Is that something you want to use in your application? Let me know in the comments!

## Recap

We learned about writing EasyTests in Code, the Page-Object-Pattern and how we can do functional testing in an maintainable fashion! Test code is equally important production code! Treat it with care! Refactor it like you would do production code!

I promised last time that we cover structuring and testing business logic, I promise the next post will cover that (but it's hard to cover that without a good sample project). And it was so thrilling to do UI-Automation with XAF first.

> If you find interesting what I'm doing, consider becoming a [patreon](//www.patreon.com/biohaz999) or [contact me](//www.delegate.at/) for training, development or consultancy.

I hope this pattern helps testing your applications. The next post in this [series](/series/{{page.series}}) will cover testing business logic. The source code the [applied pattern](//github.com/biohazard999/XafEasyTestInCodeXUnit/tree/topic/apply-the-page-object-pattern/EasyTest.Tests/PageObjects) is as always on [github](//github.com/biohazard999/XafEasyTestInCodeXUnit/tree/topic/apply-the-page-object-pattern).

Happy testing!
