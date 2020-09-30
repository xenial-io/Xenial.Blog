mkdir src\content\series\%1

echo --- >> src/content/series/%1/index.md
echo layout: seriespage >> src/content/series/%1/index.md
echo seriesid: %1 >> src/content/series/%1/index.md
echo isseries: true >> src/content/series/%1/index.md
echo title: %2 >> src/content/series/%1/index.md
echo --- >> src/content/series/%1/index.md