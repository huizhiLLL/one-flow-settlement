# 部署指南

## 🚀 完整部署流程

### 第一步：后端部署 (Laf云函数)

1. **注册Laf账号**
   - 访问 [Laf官网](https://laf.dev) 注册账号
   - 创建新的应用

2. **创建云函数**
   在Laf控制台创建以下三个云函数：

   **函数名：`tournaments`**
   ```javascript
   // 复制 backend/api/tournaments.js 的内容
   ```

   **函数名：`dashboard`**
   ```javascript
   // 复制 backend/api/dashboard.js 的内容
   ```

   **函数名：`export`**
   ```javascript
   // 复制 backend/api/export.js 的内容
   ```

3. **配置数据库**
   - Laf会自动提供MongoDB数据库
   - 数据库集合和索引会在首次使用时自动创建
   - 无需手动配置

4. **获取API地址**
   - 在Laf控制台查看应用的访问地址
   - 格式类似：`https://your-app-name.laf.dev`

### 第二步：前端配置

1. **更新API配置**
   编辑 `js/api.js` 文件，更新第6行：
   ```javascript
   BASE_URL: 'https://your-app-name.laf.dev',
   ```
   将 `your-app-name` 替换为你的实际Laf应用名称

2. **测试本地运行**
   ```bash
   # 使用简单HTTP服务器测试
   python -m http.server 8000
   # 或
   npx live-server
   ```

### 第三步：前端部署 (GitHub Pages)

1. **创建GitHub仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/username/repo-name.git
   git push -u origin main
   ```

2. **配置GitHub Pages**
   - 进入仓库设置 → Pages
   - Source 选择 "Deploy from a branch"
   - Branch 选择 "main"
   - 保存设置

3. **访问网站**
   - GitHub会提供访问地址：`https://username.github.io/repo-name`

## 🔧 详细配置说明

### API接口说明

根据后端URL格式 `https://fcabackend.hzcubing.club/接口名称`，系统使用以下API接口：

**比赛数据管理：**
1. **`/tournaments`** - 比赛数据CRUD
   - GET: 获取比赛列表或单个比赛详情 (参数: id)
   - POST: 创建新比赛
   - PUT: 更新比赛信息 (参数: id)
   - DELETE: 删除比赛 (参数: id)
   - PATCH: 切换结算状态 (参数: id, isSettled)

**仪表板统计：**
2. **`/dashboard`** - 仪表板数据
   - GET: 获取统计数据
   - 支持参数：year, month, limit

**数据导出：**
3. **`/export`** - 数据导出
   - POST: 导出比赛数据

### 环境变量配置

在Laf云函数中可以设置以下环境变量（可选）：

```
DB_NAME=one_cube_tournaments  # 数据库名称
```

### 数据库结构

系统会自动创建以下集合和索引：

**集合：tournaments**
- 索引：eventDate（降序）
- 索引：tournamentName, tournamentType（文本搜索）
- 索引：createdAt（降序）
- 索引：isSettled, tournamentType, isCertified

## 🐛 常见问题

### 1. API调用失败
**问题**：前端显示"请求失败"
**解决**：
- 检查 `js/api.js` 中的 `BASE_URL` 是否正确
- 确认Laf云函数已正确部署
- 检查浏览器控制台的错误信息

### 2. 数据无法保存
**问题**：录入数据后无响应
**解决**：
- 检查Laf云函数中的数据库操作是否正常
- 查看Laf控制台的函数日志
- 确认数据验证是否通过

### 3. GitHub Pages访问404
**问题**：GitHub Pages地址无法访问
**解决**：
- 确认仓库设置中Pages已正确配置
- 检查仓库是否为public
- 确认index.html在根目录

### 4. CORS跨域问题
**问题**：前端调用API出现跨域错误
**解决**：
- Laf云函数默认支持CORS
- 如有问题，在云函数中添加CORS头：
```javascript
export default async function (ctx) {
    // 设置CORS头
    ctx.headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    // 处理预检请求
    if (ctx.method === 'OPTIONS') {
        return { success: true }
    }
    
    // 正常业务逻辑...
}
```

## 📊 监控和维护

### 性能监控
- 在Laf控制台查看函数调用次数和响应时间
- 监控数据库存储使用情况

### 数据备份
- Laf提供数据库备份功能
- 建议定期导出重要数据

### 更新维护
- 前端：直接推送到GitHub仓库，自动部署
- 后端：在Laf控制台更新云函数代码

## 🔐 安全建议

1. **数据验证**：前后端都进行数据验证
2. **访问控制**：可以在云函数中添加简单的API密钥验证
3. **日志记录**：记录重要操作的日志
4. **定期备份**：定期备份数据库数据

## 💰 成本预估

### Laf云函数
- 免费额度：100万次调用/月
- 存储：1GB免费
- 超出后按量计费

### GitHub Pages
- 完全免费
- 带宽限制：100GB/月

一般个人或小型组织使用完全在免费额度内。

## 📞 技术支持

遇到问题可以：
1. 查看本文档的常见问题部分
2. 检查浏览器控制台错误信息
3. 查看Laf控制台的函数日志
4. 在GitHub仓库提交Issue
