mkdir tags\%1

echo --- >> tags/%1/index.html
echo layout: tagpage >> tags/%1/index.html
echo tag: %1 >> tags/%1/index.html
echo title: "%1" >> tags/%1/index.html
echo --- >> tags/%1/index.html