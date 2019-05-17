mkdir series\%1

echo --- >> series/%1/index.md
echo layout: seriespage >> series/%1/index.md
echo seriesid: %1 >> series/%1/index.md
echo isseries: true >> series/%1/index.md
echo title: %2 >> series/%1/index.md
echo --- >> series/%1/index.md