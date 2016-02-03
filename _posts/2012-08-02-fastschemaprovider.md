---
 layout: post 
 title: "FastSchemaProvider"
 comments: false
 author: "René Grundner"
---
I just released beta (hmm let me think..., okay V0.5) of [FastSchemaProvider][1]

Indoduction
-----------

We are having a huge defeat regarding upgrading consumer databases by XPO.  
XPO isn't capable of extending column widths (varchars..), neither altering foreign keys, primary keys, defaults...

**even XPObjectTypes (oh well, this should be possible trough orm, ...)**

Goal
----

This project is intended to perform any schema transitions as fast as possible, taking account the underling database engine and the remote (provided) schema.
This tool will to supersede any xpo (entity framework as will) change, regarding your database.

State
-----

Its not yet ready for full productive use, but it will soon (for sql anywhere about Aug 15 2012).

##Some parts are still missing:

 - Altering columns taking place in indexes, would cause an error on most databases 
 - Same for foreign keys  
 - solutons/projects  
 - property string length definition => transfer them to staging schema
 - provide general attribute for foreignkeys (sealed ___i don't care___ (╯°□°）╯︵ ┻━┻)

i'am at least sorry for bad english ^^

  [1]: https://github.com/hazard999/FastSchemaProvider