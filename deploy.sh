#!/bin/bash
SERVER="root@178.20.41.51"
SERVER_PATH="/home/admin/web/compas.pro/public_html/public"

set -e

echo "=== 0. Pushing to GitHub ==="
#git push
echo "=== 1. Building ==="
npm run generate
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo ""
echo "=== 2. Clearing old bundles on server ==="
ssh $SERVER "rm -rf $SERVER_PATH/_nuxt"
echo ""
echo "=== 3. Deploying bundles ==="
rsync -avz --progress \
    --exclude='.DS_Store' \
    .output/public/_nuxt/ $SERVER:$SERVER_PATH/_nuxt/
echo ""
echo "=== 3b. Deploying static assets (img, icons) ==="
# public/img и public/icons Nuxt копирует в .output/public при generate, но
# раньше они не деплоились — из-за этого, например, /img/cluster-*.svg отдавал 404.
# Без --delete, чтобы не затронуть серверные файлы, которых нет в репо.
rsync -avz --progress --exclude='.DS_Store' .output/public/img/ $SERVER:$SERVER_PATH/img/
rsync -avz --progress --exclude='.DS_Store' .output/public/icons/ $SERVER:$SERVER_PATH/icons/
echo ""
echo "=== 4. Deploying SPA entry ==="
scp .output/public/index.html $SERVER:$SERVER_PATH/index2.html
echo ""
echo "=== 5. Deploying page HTML files ==="
for dir in auth logistic roles profile settings analytics tariffs trash users external product-stats; do
    if [ -f ".output/public/$dir/index.html" ]; then
        ssh $SERVER "mkdir -p $SERVER_PATH/$dir"
        scp .output/public/$dir/index.html $SERVER:$SERVER_PATH/$dir/index.html
    fi
done
echo ""
echo "=== 6. Updating ALL index.html to match new build ==="
ssh $SERVER "find $SERVER_PATH -name 'index.html' -not -path '*/landing/*' -exec cp $SERVER_PATH/index2.html {} \;"
echo ""
echo "✅ Deploy complete!"

