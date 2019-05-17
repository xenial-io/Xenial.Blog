mkdir series\%1

echo --- >> series/%1/index.html
echo layout: seriespage >> series/%1/index.html
echo series: %1 >> series/%1/index.html
echo title: "%2" >> series/%1/index.html
echo --- >> series/%1/index.html