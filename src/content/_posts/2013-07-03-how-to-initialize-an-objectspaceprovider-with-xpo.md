---
 layout: post 
 title: "How to initialize an ObjectSpaceProvider with XPO"
 comments: false
 tags: ["XAF", "XPO", "UnitTesting"]
---
If anybody needs to initialize an ObjectSpaceProvider with XPO for UnitTesting or a ServiceApplication here is the code:

```cs
public IObjectSpaceProvider CreateObjectSpaceProvider(Assembly assembly, string connectionString)
{
    var dictionary = new ReflectionDictionary();
    
    dictionary.CollectClassInfos(assembly);
    
    var info = new TypesInfo();
    
    var source = new XpoTypeInfoSource(info, dictionary);
    
    info.AddEntityStore(source);
    
    foreach (XPClassInfo item in dictionary.Classes)
        source.RegisterEntity(item.ClassType);
    
    return new XPObjectSpaceProvider(new ConnectionStringDataStoreProvider(connectionString), info, source);
}
```

This took me hours of digging in the XAF-source.

Hope this helps anyone.

Happy coding, Manuel!