mkdir src\content\tags\%1

echo --- >> src/content/tags/%1/index.html
echo layout: tagpage >> src/content/tags/%1/index.html
echo tag: %1 >> src/content/tags/%1/index.html
echo title: "%1" >> src/content/tags/%1/index.html
echo --- >> src/content/tags/%1/index.html